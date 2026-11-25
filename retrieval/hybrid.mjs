import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {answer, rank} from '../public/engine.mjs';

export function encode(def, queries) {
  const unique = [...new Set(queries)];
  const payload = {passages:def.chunks.map(c=>c.text), queries:unique};
  const script = fileURLToPath(new URL('./semantic.py', import.meta.url));
  const raw = execFileSync('python3',[script],{input:JSON.stringify(payload),encoding:'utf8',timeout:120000,maxBuffer:16_000_000});
  const {scores,...model} = JSON.parse(raw);
  const chunks = new Map(def.chunks.map((c,i)=>[c.id,i]));
  const table = new Map(unique.map((q,i)=>[q,scores[i]]));
  return {model, score:(query,id)=>table.get(query)?.[chunks.get(id)]};
}

// Ties share rank. Otherwise file order could masquerade as retrieval evidence.
function ranks(rows, key) {
  const sorted = [...rows].sort((a,b)=>b[key]-a[key]);
  const positions = new Map();
  let position=0;
  sorted.forEach((row,i)=>{
    if (i===0 || row[key]!==sorted[i-1][key]) position=i+1;
    positions.set(row.c.id,position);
  });
  return positions;
}
export function candidates(chunks, question, encoder) {
  const rows = rank(chunks,question).map(row=>({...row,cosine:encoder.score(question,row.c.id)}));
  if(rows.some(r=>!Number.isFinite(r.cosine))) throw Error('Query was not encoded.');
  const lexical=ranks(rows,'score'),dense=ranks(rows,'cosine');
  return rows.map(row=>({...row,fusion:1/(60+lexical.get(row.c.id))+1/(60+dense.get(row.c.id))}))
    .sort((a,b)=>b.fusion-a.fusion || b.score-a.score);
}
export function semanticAnswer(def, query, encoder) {
  return answer(def,query,(chunks,part)=>{
    const ranked=candidates(chunks,part,encoder);
    // Preserve the original confidence gate and explicit source conflicts.
    const eligible=ranked.filter(r=>r.score>=def.retrieval.threshold);
    return eligible.length ? eligible : ranked;
  });
}
export function answerQueries(query) {
  const q=String(query).trim().slice(0,2000);
  const part=q.match(/^according to (.+?),\s*(.+)$/i)?.[2] || q;
  return [q,part,...part.split(/\s+(?:and also|as well as|and)\s+/i)];
}
