import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {build} from '../public/engine.mjs';
import {encode,experimentQueries,experimentalAnswer,candidates} from './hybrid.mjs';
import {scoreCase} from '../holdout.mjs';

const stop=new Set('a an the of in on at is it its i can could should would will which what when where who how my do did does after before for to from about and or with as each per any this that your me there these their by have be are then also'.split(' '));
const content=s=>new Set((s.toLowerCase().match(/[a-z0-9]+/g)??[]).filter(w=>!stop.has(w)));
export function metrics(rows){
  const positive=rows.filter(r=>r.status==='answered'),negative=rows.filter(r=>r.status==='refused');
  const near=negative.filter(r=>r.kind==='near miss');
  const ratio=(items,match)=>({count:items.filter(match).length,total:items.length});
  return {passed:ratio(rows,r=>r.passed),answerableRecall:ratio(positive,r=>r.passed),
    refusalRecall:ratio(negative,r=>r.actual.status==='refused'),nearMissFalseAnswers:ratio(near,r=>r.actual.status==='answered')};
}
export async function diagnose(folder,readDocuments){
  const documents=await readDocuments(join(folder,'docs'));
  const {definition:def}=build(await readFile(join(folder,'brief.txt'),'utf8'),documents,{contextual:true,splitValidation:true});
  const cases=JSON.parse(await readFile(join(folder,'cases.json')));
  const encoder=encode(def,cases.flatMap(c=>experimentQueries(c.question)),true);
  // Reproduce the pre-normalization identifier gate used by the frozen release.
  encoder.filterIds=null;
  const run=(c,policy={})=>scoreCase(c,experimentalAnswer(def,c.question,encoder,policy));
  const corpus=content(documents.map(c=>c.text).join(' '));
  const vocabulary=cases.filter(r=>r.status==='refused').map(c=>({question:c.question,kind:c.kind,
    shared:[...content(c.question)].filter(w=>corpus.has(w))}));
  const errors=[];
  for(const c of cases){
    if(c.status!=='answered'||run(c).actual.status!=='refused')continue;
    const parts=c.question.split(/\?\s+(?:also,?\s+)?(?=\S)/i);
    const clauses=parts.map((q,i)=>{
      const gold=def.chunks.filter(p=>p.source===c.sources[i]&&p.text.toLowerCase().includes(c.facts[i].toLowerCase()));
      if(!gold.length)throw Error('Gold passage absent: '+q);
      const rows=candidates(def.chunks,q,encoder).sort((a,b)=>b.cosine-a.cosine);
      const rank=rows.findIndex(r=>gold.some(p=>p.id===r.c.id))+1;
      const probe={...c,question:q,facts:[c.facts[i]],sources:[c.sources[i]]};
      const ordinary=run(probe),relaxed=run(probe,{minimum:-1,margin:0});
      const cause=ordinary.passed?null:rank>3?'retrieval miss':relaxed.passed?'threshold too strict':'vocabulary mismatch';
      return {question:q,gold:gold.map(p=>p.id),expectedFact:c.facts[i],source:c.sources[i],denseRank:rank,
        topThree:rows.slice(0,3).map(r=>({id:r.c.id,cosine:r.cosine,lexical:r.score,matchingTerms:r.matched})),
        relaxedGatePass:relaxed.passed,observed:ordinary.actual.status,cause};
    });
    const cause=['retrieval miss','vocabulary mismatch','threshold too strict'].find(k=>clauses.some(c=>c.cause===k));
    if(!cause)throw Error('Unclassified refusal: '+c.question);
    errors.push({question:c.question,cause,clauses});
  }
  const sweep=[0,0.2,0.3,0.4,0.5,0.6,0.7,0.8,1].map(minimum=>({minimum,margin:0.08,...metrics(cases.map(c=>run(c,{minimum})))}));
  return {errors,vocabulary,sweep};
}
