import {readFile} from 'node:fs/promises';
import {answer} from './public/engine.mjs';
import {compose} from './compose.mjs';

const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const definition=await load('./evidence/shore/definition.json');
const cases=await load('./evidence/shore/evals.json');
const {candidates}=await load('./evidence/shore-prompt-tournament/comparison.json');
const methods=[{name:'Extractive'},...candidates.map(c=>({name:'Compose '+c.index,prompt:c.prompt}))];
for(const method of methods){
  method.results=[];
  for(const entry of cases){
    const actual=method.prompt?await compose(definition,entry.question,{instruction:definition.systemPrompt+'\n'+method.prompt}):answer(definition,entry.question);
    const grounded=actual.citations.every(c=>definition.chunks.some(p=>p.source===c.source&&p.id===c.id&&p.text===c.text));
    const complete=entry.expected.every(p=>actual.citations.some(c=>p.id===c.id&&p.source===c.source) &&
      actual.text.includes(p.text.replace(/^[^:\n]{1,90}:\s+/,'')));
    const passed=actual.status===entry.status && grounded && complete && actual.citations.length===entry.expected.length;
    method.results.push({id:entry.id,passed,actual});
  }
  method.passed=method.results.filter(r=>r.passed).length;
  method.degradations=method.results.filter(r=>r.actual.degraded).length;
}
const best=[...methods].sort((a,b)=>b.passed-a.passed||a.degradations-b.degradations)[0];
console.log(JSON.stringify({cases:cases.length,winner:best.name,tieBreak:'Fewer degraded answers, then listed order',methods},null,2));
