import fs from 'node:fs';
import assert from 'node:assert/strict';
import {withPointers} from '../public/engine.mjs';
import {suites,corpora} from './reference-agents.mjs';
const rows=[];
for(const [i,suite] of suites.entries()){
  for await(const {name,chunks} of corpora(suite)){
    const folder=['experiments/first/normalized','experiments/second/normalized','holdout3/frozen'][i];
    const {results}=JSON.parse(fs.readFileSync('evidence/v2/'+folder+'/'+name+'.json'));
    for(const r of results.filter(r=>r.actual.status==='refused')){
      const response=withPointers(r.actual,chunks,r.question);
      assert.deepEqual(response.citations,[]);
      assert.ok(response.pointers.length<=3);
      const gold=r.sources??[];
      rows.push({suite,name,question:r.question,gold,pointers:response.pointers.map(p=>p.source),correct:gold.length?response.pointers.some(p=>gold.includes(p.source)):null});
    }
  }
}
console.log(JSON.stringify({definition:'A refusal with a known gold source counts once. Missing pointers count as misses. Unlabeled refusals are excluded.',correct:rows.filter(r=>r.correct).length,eligible:rows.filter(r=>r.correct!==null).length,rows},null,2));
