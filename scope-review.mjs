import {rank} from './public/engine.mjs';

const words=s=>new Set(s.toLowerCase().match(/[a-z0-9]+/g)?.filter(t=>!['the','of','for','and','a','to','is','what'].includes(t))??[]);
export function scopeReview(definition,topics,encoder){
  return topics.map(topic=>{
    const rows=rank(definition.chunks,topic);
    const selected=rows[0], requested=words(topic), evidence=words(selected.c.text);
    const missing=[...requested].filter(t=>!evidence.has(t));
    const verdict=!selected.matched?'unsupported':missing.length?'partial':'supported';
    return {topic,verdict,missing,lexical:selected.score,dense:encoder?.score(topic,selected.c.id)??null,
      supportingPassage:selected.matched?{id:selected.c.id,source:selected.c.source,text:selected.c.text}:null};
  });
}
