import {readFile} from 'node:fs/promises';
import {evaluate,rank} from '../public/engine.mjs';
import {answerQueries,candidates,encode,semanticAnswer} from './hybrid.mjs';

const results=[];
for (const domain of ['shore','conservation']) {
  const load=async name=>JSON.parse(await readFile(new URL('../evidence/'+domain+'/'+name+'.json',import.meta.url)));
  const def=await load('definition'), suite=await load('evals');
  const encoder=encode(def,suite.flatMap(c=>answerQueries(c.question)));
  const methods={lexical:{hits:0,total:0,first:0},dense:{hits:0,total:0,first:0},fusion:{hits:0,total:0,first:0}};
  const answerable=suite.filter(c=>c.status==='answered');
  for (const entry of answerable) {
    const fusion=candidates(def.chunks,entry.question,encoder);
    const lists={lexical:rank(def.chunks,entry.question),dense:[...fusion].sort((a,b)=>b.cosine-a.cosine),fusion};
    const expected=new Set(entry.expected.map(c=>c.id));
    for (const [method,rows] of Object.entries(lists)) {
      const m=methods[method];
      m.hits+=rows.slice(0,3).filter(r=>expected.has(r.c.id)).length;
      m.total+=expected.size;
      m.first+=Number(expected.has(rows[0].c.id));
    }
  }
  const baseline=evaluate(def,suite);
  const hybrid=evaluate(def,suite,(d,q)=>semanticAnswer(d,q,encoder));
  const changed=hybrid.flatMap((r,i)=>r.passed===baseline[i].passed?[]:[{id:r.id,question:r.question,previous:baseline[i].passed,passed:r.passed}]);
  results.push({domain,encoder:encoder.model,answerableCases:answerable.length,passageRetrieval:methods,
    endToEnd:{total:suite.length,lexical:baseline.filter(r=>r.passed).length,hybrid:hybrid.filter(r=>r.passed).length,changed}});
}
console.log(JSON.stringify(results,null,2));
