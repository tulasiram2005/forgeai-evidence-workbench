import fs from 'node:fs';
import {corpora,suites} from '../retrieval/reference-agents.mjs';
import {withPointers,rank} from '../public/engine.mjs';
const rows=[];
for(const suite of [...suites,'holdout4'])for await(const {name,chunks} of corpora(suite)){
  const traces=JSON.parse(fs.readFileSync('evidence/funnel/'+suite+'-'+name+'.json'));
  for(const t of traces.filter(t=>t.expected==='answered'&&t.actual.status==='refused')){
    const old=[];
    for(const {c,matched} of rank(chunks,t.question))if(matched&&!old.includes(c.source)&&old.length<2)old.push(c.source);
    const pointers=withPointers(t.actual,chunks,t.question).pointers;
    rows.push({suite,name,question:t.question,gold:t.goldSources,previous:old.some(s=>t.goldSources.includes(s)),correct:pointers.some(p=>t.goldSources.includes(p.source)),pointers});
  }
}
console.log(JSON.stringify({denominator:rows.length,old:rows.filter(r=>r.previous).length,correctAt3:rows.filter(r=>r.correct).length,rows},null,2));
