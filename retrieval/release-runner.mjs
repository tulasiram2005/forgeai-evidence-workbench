import {encode,experimentQueries,experimentalAnswer} from './hybrid.mjs';
import {answer} from '../public/engine.mjs';
export function prepareRunner(def,cases){
  if(def.retrieval.gate)return answer;
  const encoder=encode(def,cases.flatMap(c=>experimentQueries(c.question)),true);
  return (d,q)=>experimentalAnswer(d,q,encoder);
}
