import {identifierIndex} from './identifiers.mjs';
import {rankingText} from './passage-context.mjs';
import {experimentalAnswer,experimentQueries} from './contextual.mjs';

const root=new URL('./models/minilm/',import.meta.url);
let pending;
const cache=new Map();
async function resource(name){
  const response=await fetch(new URL(name,root));
  if(!response.ok)throw Error('Cannot load local contextual model asset '+name);
  return response;
}
async function load(){
  const ort=await import('./models/minilm/ort.wasm.min.mjs');
  ort.env.wasm.numThreads=1;
  ort.env.wasm.wasmPaths=root.href;
  const {parts}=await (await resource('manifest.json')).json();
  const vocab=(await (await resource('vocab.txt')).text()).trimEnd().split('\n');
  const chunks=await Promise.all(parts.map(async p=>new Uint8Array(await (await resource(p)).arrayBuffer())));
  let offset=0;
  const model=new Uint8Array(chunks.reduce((n,p)=>n+p.length,0));
  for(const part of chunks){model.set(part,offset);offset+=part.length;}
  const session=await ort.InferenceSession.create(model,{executionProviders:['wasm']});
  return {ort,session,vocab:new Map(vocab.map((token,i)=>[token,i]))};
}
function tokenize(text,vocab){
  const ids=[101];
  const cleaned=text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[\p{Cc}\p{Cf}]/gu,c=>/\s/.test(c)?' ':'').replace(/([\p{Script=Han}\p{P}\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e])/gu,' $1 ');
  for(const word of cleaned.trim().split(/\s+/).filter(Boolean)){
    let pieces=[];
    const chars=[...word];
    for(let start=0;start<chars.length;){
      let end=chars.length,token;
      while(end>start && chars.length<=100){
        token=vocab.get((start?'##':'')+chars.slice(start,end).join(''));
        if(token!==undefined)break;
        end--;
      }
      if(token===undefined){pieces=[100];break;}
      pieces.push(token);start=end;
    }
    ids.push(...pieces);
    if(ids.length>=255)break;
  }
  return [...ids.slice(0,255),102];
}
async function vectors(texts){
  pending??=load().catch(error=>{pending=null;throw error;});
  const {ort,session,vocab}=await pending;
  const result=new Map();
  const missing=texts.filter(text=>{
    if(!cache.has(text))return true;
    result.set(text,cache.get(text));return false;
  });
  for(let start=0;start<missing.length;start+=8){
    const batch=missing.slice(start,start+8);
    const tokens=batch.map(text=>tokenize(text,vocab)),width=Math.max(...tokens.map(t=>t.length));
    const ids=new BigInt64Array(batch.length*width),mask=new BigInt64Array(ids.length);
    tokens.forEach((t,i)=>{ids.set(t.map(BigInt),i*width);mask.fill(1n,i*width,i*width+t.length);});
    const tensor=data=>new ort.Tensor('int64',data,[batch.length,width]);
    const {embeddings}=await session.run({input_ids:tensor(ids),attention_mask:tensor(mask)});
    batch.forEach((text,i)=>{
      const vector=embeddings.data.slice(i*384,(i+1)*384);
      result.set(text,vector);
      if(cache.size>=2000)cache.delete(cache.keys().next().value);
      cache.set(text,vector);
    });
  }
  return result;
}
export async function contextualRunner(def,questions){
  const passages=def.chunks.map(c=>rankingText(def,c,true));
  const queries=questions.flatMap(experimentQueries);
  const encoded=await vectors([...new Set([...passages,...queries])]);
  const byId=new Map(def.chunks.map((c,i)=>[c.id,encoded.get(passages[i])]));
  const encoder={contextual:true,filterIds:identifierIndex(def.chunks),score:(q,id)=>{
    const a=encoded.get(q),b=byId.get(id);
    let sum=0;
    for(let i=0;i<a.length;i++)sum+=a[i]*b[i];
    return Math.round(sum*1e6)/1e6;
  }};
  return (d,q)=>experimentalAnswer(d,q,encoder);
}
