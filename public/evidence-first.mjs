import {recordLookup} from './record-lookup.mjs';
import {answer,withPointers} from './engine.mjs';
const canonical=s=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function strictAnswer(def,question){
  const lookup=recordLookup(def,question);
  if(lookup)return lookup;
  const q=canonical(question);
  if(['which one','what about it'].includes(q))return answer(def,question);
  // Explicit topic requests can be verified as exact labels in the index.
  const label=q.replace(/^(?:what are the details for|give the source wording for|explain|describe|summarize) /,'');
  const matches=def.chunks.filter(c=>(!c.row||def.tools?.includes('csv_lookup'))&&canonical(c.topic)===label);
  if(matches.length===1){
    const {id,source,text}=matches[0];
    return {status:'answered',text,citations:[{id,source,text}]};
  }
  return withPointers({status:'refused',text:'I could not confirm an answer. Inspect the closest source passages.',citations:[]},def.chunks,question);
}
