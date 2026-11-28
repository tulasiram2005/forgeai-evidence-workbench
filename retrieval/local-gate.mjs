import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadGateModel} from '../public/static-encoder.mjs';
import {gateRows,generatedCases} from '../public/gate.mjs';
export const loadLocalGate=()=>loadGateModel(readFile);
export function crossScores(def,queries){
  const pending=new Map(),table=new Map();
  function enqueue(q,pool){
    for(const r of gateRows(def,q,pool)){
      const id=r.c.id;
      pending.set(JSON.stringify([q,id]),{q,id,text:r.c.text});
    }
  }
  for(const query of new Set(queries)){
    for(const clause of [query,...query.split(/\?\s+(?:also,?\s+)?(?=\S)/i)]){
      const scope=clause.match(/^according to (.+?),\s*(.+)$/i);
      const q=scope?scope[2]:clause;
      const pool=scope?def.chunks.filter(c=>c.source.toLowerCase()===scope[1].trim().toLowerCase()):def.chunks;
      // Calibration ranks the unmodified question. The runner may split or scope it.
      enqueue(clause,def.chunks);
      for(const part of new Set([q,...q.split(/\s+(?:and also|as well as|and)\s+/i)]))enqueue(part,pool);
    }
  }
  const pairs=[...pending.values()];
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

export function calibrationReranker(seed){
  return crossScores(seed.definition,[...generatedCases(seed.definition).map(c=>c.q),...seed.evals.map(c=>c.question)]);
}
