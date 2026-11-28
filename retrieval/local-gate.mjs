import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGateModel} from '../public/static-encoder.mjs';
import {gateRows} from '../public/gate.mjs';
export const loadLocalGate=()=>loadGateModel(readFile);
export function crossScores(def,queries){
  const pairs=[],table=new Map();
  const parts=queries.flatMap(q=>[q,...q.split(/\?\s+(?:also,?\s+)?(?=\S)/i)])
    .flatMap(q=>[q,q.match(/^according to (.+?),\s*(.+)$/i)?.[2]??q])
    .flatMap(q=>[q,...q.split(/\s+(?:and also|as well as|and)\s+/i)]);
  for(const q of new Set(parts)){
    const rows=gateRows(def,q);
    for(const r of rows)pairs.push({q,id:r.c.id,text:r.c.text});
  }
  if(pairs.length){
    const output=execFileSync('python3',[fileURLToPath(new URL('./cross-encoder.py',import.meta.url))],
      {input:JSON.stringify(pairs),encoding:'utf8',timeout:180000,maxBuffer:8_000_000});
    const scores=JSON.parse(output);
    if(scores.length!==pairs.length || scores.some(s=>!Number.isFinite(s)))throw Error('Invalid cross-encoder scores.');
    pairs.forEach(({q,id},i)=>table.set(JSON.stringify([q,id]),scores[i]));
  }
  return (q,id)=>{
    const score=table.get(JSON.stringify([q,id]));
    if(score===undefined)throw Error('Unscored cross-encoder pair.');
    return score;
  };
}
