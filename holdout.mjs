import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {answer, build} from './public/engine.mjs';

export async function holdout(folder, readDocuments, options={}) {
  const brief = await readFile(join(folder,'brief.txt'),'utf8');
  const docs = await readDocuments(join(folder,'docs'));
  const {definition} = build(brief, docs, options);
  if(options.expandIndex)definition.searchExpansion=await (await import('./retrieval/expand.mjs')).expandIndex(definition);
  // Only open reviewer expectations after the agent definition is final.
  const cases = JSON.parse(await readFile(join(folder,'cases.json'),'utf8'));
  let runner=answer;
  if(options.experimentalDense || options.contextual){
    const {experimentalAnswer,experimentQueries,encode}=await import('./retrieval/hybrid.mjs');
    const encoder=encode(definition,cases.flatMap(c=>experimentQueries(c.question)),options.contextual);
    runner=(d,q)=>experimentalAnswer(d,q,encoder);
  }
  const results=cases.map(entry=>scoreCase(entry,runner(definition,entry.question)));
  const counts = rows => ({passed:rows.filter(r=>r.passed).length,total:rows.length});
  const rate = (expected,observed) => {
    const eligible=results.filter(r=>r.status===expected);
    return {count:eligible.filter(r=>r.actual.status===observed).length,total:eligible.length};
  };
  return {...(options.expandIndex?{searchExpansion:definition.searchExpansion}:{}),...counts(results),classes:Object.fromEntries([...new Set(results.map(r=>r.kind))].map(k=>[k,counts(results.filter(r=>r.kind===k))])),
    falseRefusals:rate('answered','refused'),falseAnswersOnRefusals:rate('refused','answered'),results};
}

export function scoreCase(entry,actual){
  const words=s=>s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[];
  const contains=(s,phrase)=>(' '+words(s).join(' ')+' ').includes(' '+words(phrase).join(' ')+' ');
  const supported=(entry.facts??[]).every((fact,i)=>contains(actual.text,fact) &&
    actual.citations.some(c=>c.source===entry.sources[i] && contains(c.text,fact)));
  return {...entry,actual,passed:entry.status===actual.status && supported};
}
