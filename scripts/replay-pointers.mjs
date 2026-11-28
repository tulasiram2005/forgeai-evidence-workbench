import fs from 'node:fs';
import assert from 'node:assert/strict';
import {corpora,suites} from '../retrieval/reference-agents.mjs';
import {normalized} from '../retrieval/stress-judge.mjs';
const load=file=>JSON.parse(fs.readFileSync(file));
const archived=load('evidence/funnel/pointer-recall.json').rows;
const rows=[];
for(const suite of [...suites,'holdout4']){
 for await(const {name,chunks} of corpora(suite)){
  const traces=load('evidence/funnel/'+suite+'-'+name+'.json');
  for(const old of archived.filter(r=>r.suite===suite&&r.name===name)){
   const trace=traces.find(r=>r.question===old.question);
   function check(ids){
    const cards=ids.map(id=>{const p=chunks.find(p=>p.id===id);assert.ok(p);return p;});
    return {ids,source:cards.some(p=>trace.goldSources.includes(p.source)),allFacts:trace.goldFacts.every((fact,i)=>cards.some(p=>p.source===trace.goldSources[i]&&(' '+normalized(p.text)+' ').includes(' '+normalized(fact)+' ')))};
   }
   const lexical=check(old.pointers.map(p=>p.id)),hybrid=check(trace.ranks.hybrid.top.slice(0,3));
   assert.equal(lexical.source,old.correct);
   rows.push({suite,name,question:old.question,lexical,hybrid});
  }
 }
}
assert.equal(rows.length,archived.length);
const summary={};
for(const metric of ['source','allFacts']){
 const count=pred=>rows.filter(pred).length;
 summary[metric]={lexical:count(r=>r.lexical[metric]),hybrid:count(r=>r.hybrid[metric]),gained:count(r=>!r.lexical[metric]&&r.hybrid[metric]),lost:count(r=>r.lexical[metric]&&!r.hybrid[metric])};
}
console.log(JSON.stringify({scope:'Development replay of archived rankings on answerable refusals only. Hybrid always shows three passages where available; lexical may show fewer. No human timing or near-miss safety measured.',total:rows.length,emptyLexical:rows.filter(r=>!r.lexical.ids.length).length,summary,rows},null,2));
