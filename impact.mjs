import {answer} from './engine.mjs';

function sourceIndex(def) {
  if (!Array.isArray(def?.chunks) || def.chunks.length > 1500 || !Array.isArray(def.tools) || !def.retrieval) {
    throw Error('Choose a ForgeAI definition or dossier with up to 1,500 passages.');
  }
  const sources=new Map();
  for (const c of def.chunks) {
    if (![c.source,c.id,c.topic,c.text].every(v=>typeof v==='string')) throw Error('Invalid passage in agent definition.');
    if (!sources.has(c.source)) sources.set(c.source,[]);
    sources.get(c.source).push(c.text);
  }
  return sources;
}
function evidenceKeys(response) {
  return JSON.stringify(response.citations.map(c=>JSON.stringify([c.source,c.text])).sort());
}
function classify(before,after){
  if(before.status==='answered' && after.status!=='answered')return 'Answer lost';
  if(before.status!=='answered' && after.status==='answered')return 'New answer';
  if(before.status!==after.status)return 'Status changed';
  if(before.text!==after.text)return 'Wording changed';
  if(evidenceKeys(before)!==evidenceKeys(after))return 'Citation changed';
  return 'Unchanged';
}
async function fingerprint(def){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(def)));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function compareReleases(before,after,cases,runner=answer){
  const left=sourceIndex(before),right=sourceIndex(after);
  if(!Array.isArray(cases)||!cases.length||cases.length>256)throw Error('Supply 1–256 frozen questions.');
  const sources=[];
  for(const name of new Set([...left.keys(),...right.keys()])){
    const original=left.get(name),revised=right.get(name);
    if(JSON.stringify(original)===JSON.stringify(revised))continue;
    sources.push({name,change:!original?'Added':!revised?'Removed':'Edited',before:original?.length??0,after:revised?.length??0});
  }
  const results=[];
  for(const [i,c] of cases.entries()){
    if(typeof c.question!=='string'||!c.question.trim()||c.question.length>2000)throw Error('Invalid review question.');
    const original=await runner(before,c.question),updated=await runner(after,c.question);
    results.push({id:c.id??String(i+1),question:c.question,change:classify(original,updated),before:original,after:updated});
  }
  return {version:1,beforeSha256:await fingerprint(before),afterSha256:await fingerprint(after),sources,
    total:results.length,changed:results.filter(r=>r.change!=='Unchanged').length,results};
}
