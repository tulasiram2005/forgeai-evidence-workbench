import {answer} from './engine.mjs';

// Hold the released configuration constant and vary only the available passages.
export async function auditSources(definition, question, runner=answer, original) {
  if(typeof question!=='string'||!question.trim()||question.length>2000) throw Error('Supply a question of 1–2,000 characters.');
  const baseline=original??await runner(definition,question);
  const available=new Set(definition.chunks.map(chunk=>chunk.source));
  const sources=new Set(baseline.citations.map(c=>c.source).filter(source=>available.has(source)));
  const trials=[];
  for(const source of sources){
    const chunks=definition.chunks.filter(chunk=>chunk.source!==source);
    const response=await runner({...definition,chunks},question);
    if(response.citations.some(c=>c.source===source))throw Error('Audit returned a citation to withheld material.');
    trials.push({source,removedPassages:definition.chunks.length-chunks.length,response,
      sameText:baseline.text===response.text,sameStatus:baseline.status===response.status});
  }
  return {question,baseline,trials};
}
