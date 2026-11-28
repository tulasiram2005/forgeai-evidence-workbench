// Lazy model initialization. Both runtimes use the same signed bytes and arithmetic.
let model,loading;
async function fetchBytes(url){
  const response=await fetch(url);
  if(!response.ok)throw Error('Could not load the local retrieval model.');
  return response.arrayBuffer();
}
export function loadGateModel(read=fetchBytes){
  loading??=Promise.all(['tokens.json','vectors.bin'].map(file=>read(new URL('./models/potion/'+file,import.meta.url)))).then(([v,b])=>{
    const tokens=JSON.parse(new TextDecoder().decode(v));
    const bytes=new Uint8Array(b),size=tokens.length*64;
    if(bytes.byteLength!==size+tokens.length*4)throw Error('Invalid embedding table length.');
    model={ids:new Map(tokens.map((t,i)=>[t,i])),rows:new Int8Array(bytes.buffer,bytes.byteOffset,size),
      scales:new Float32Array(bytes.buffer.slice(bytes.byteOffset+size,bytes.byteOffset+bytes.byteLength))};
  }).catch(e=>{loading=undefined;throw e;});
  return loading;
}
export function vector(text){
  if(!model)throw Error('Load the gate encoder before running this agent.');
  const out=new Float64Array(64);
  for(const word of text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu)??[]){
    if(word.length>100)continue;
    const parts=[];let start=0;
    while(start<word.length){
      let end=word.length,id;
      while(end>start){
        id=model.ids.get((start?'##':'')+word.slice(start,end));
        if(id!==undefined)break;
        end--;
      }
      if(id===undefined){parts.length=0;break;}
      parts.push(id);start=end;
    }
    for(const id of parts)for(let j=0;j<64;j++)out[j]+=model.rows[id*64+j]*model.scales[id];
  }
  const norm=Math.hypot(...out)||1;
  return out.map(n=>n/norm);
}
