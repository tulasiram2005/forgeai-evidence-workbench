import {strictAnswer} from './evidence-first.mjs';
import {answer} from './engine.mjs';
export async function browserAnswer(def,question){
  if(def.runtime?.kind==='evidence-first')return strictAnswer(def,question);
  if(def.retrieval.gate || def.runtime?.kind!=='contextual-minilm')return answer(def,question);
  const {contextualRunner}=await import('./browser-minilm.mjs');
  return (await contextualRunner(def,[question]))(def,question);
}
