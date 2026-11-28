import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {build} from '../public/engine.mjs';
import {encode,experimentQueries,experimentalAnswer} from './hybrid.mjs';
export async function diagnoseSecond(name,documents){
  const folder=join('examples/holdout2',name);
  const {definition:def}=build(await readFile(join(folder,'brief.txt'),'utf8'),await documents(join(folder,'docs')),{contextual:true,splitValidation:true});
  const {results}=JSON.parse(await readFile('evidence/v2/holdout2/frozen/'+name+'.json'));
  const failed=results.filter(r=>r.status==='answered'&&!r.passed);
  const encoder=encode(def,failed.flatMap(r=>experimentQueries(r.question)),true);
  encoder.filterIds=null;
  return failed.map(r=>{
    const traces=[];
    const actual=experimentalAnswer(def,r.question,encoder,{observe:(query,top)=>traces.push({query,ids:top.map(x=>x.c.id)})});
    assert.deepEqual(actual,r.actual);
    const gold=r.facts.map((fact,i)=>({fact,source:r.sources[i],ids:def.chunks.filter(c=>c.source===r.sources[i]&&c.text.toLowerCase().includes(fact.toLowerCase())).map(c=>c.id)}));
    assert.ok(gold.every(g=>g.ids.length));
    const retrieved=new Set(traces.flatMap(t=>t.ids));
    const missing=gold.filter(g=>!g.ids.some(id=>retrieved.has(id)));
    let classification='refused by a gate';
    if(actual.status==='answered'){
      classification=gold.some(g=>!actual.citations.some(c=>c.source===g.source))?'answered from the wrong source':'answered but missing required facts';
    }else if(traces.length && missing.length)classification='retrieval miss';
    return {corpus:name,question:r.question,classification,gold,traces,actual};
  });
}
