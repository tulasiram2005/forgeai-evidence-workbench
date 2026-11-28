import {identifierIndex} from './identifiers.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';


import {rankingText} from '../public/passage-context.mjs';
export {passageContext,rankingText} from '../public/passage-context.mjs';
export function encode(def, queries, contextual=false) {
  const unique = [...new Set(queries)];
  const payload = {passages:def.chunks.map(c=>rankingText(def,c,contextual)), queries:unique};
  const script = fileURLToPath(new URL('./semantic.py', import.meta.url));
  const raw = execFileSync('python3',[script],{input:JSON.stringify(payload),encoding:'utf8',timeout:120000,maxBuffer:16_000_000});
  const {scores,...model} = JSON.parse(raw);
  const chunks = new Map(def.chunks.map((c,i)=>[c.id,i]));
  const table = new Map(unique.map((q,i)=>[q,scores[i]]));
  return {model, contextual, filterIds:contextual?identifierIndex(def.chunks):null, score:(query,id)=>table.get(query)?.[chunks.get(id)]};
}

export {candidates,semanticAnswer,answerQueries,experimentalAnswer,experimentQueries} from '../public/contextual.mjs';
