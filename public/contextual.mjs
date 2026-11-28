import {answer,rank,withPointers} from './engine.mjs';
// Ties share rank. Otherwise file order could masquerade as retrieval evidence.
function ranks(rows, key) {
  const sorted = [...rows].sort((a,b)=>b[key]-a[key]);
  const positions = new Map();
  let position=0;
  sorted.forEach((row,i)=>{
    if (i===0 || row[key]!==sorted[i-1][key]) position=i+1;
    positions.set(row.c.id,position);
  });
  return positions;
}
export function candidates(chunks, question, encoder) {
  const rows = rank(chunks,question).map(row=>({...row,cosine:encoder.score(question,row.c.id)}));
  if(rows.some(r=>!Number.isFinite(r.cosine))) throw Error('Query was not encoded.');
  const lexical=ranks(rows,'score'),dense=ranks(rows,'cosine');
  return rows.map(row=>({...row,fusion:1/(60+lexical.get(row.c.id))+1/(60+dense.get(row.c.id))}))
    .sort((a,b)=>b.fusion-a.fusion || b.score-a.score);
}
export function semanticAnswer(def, query, encoder) {
  return answer(def,query,(chunks,part)=>{
    const ranked=candidates(chunks,part,encoder);
    // Preserve the original confidence gate and explicit source conflicts.
    const eligible=ranked.filter(r=>r.score>=def.retrieval.threshold);
    return eligible.length ? eligible : ranked;
  });
}
export function answerQueries(query) {
  const q=String(query).trim().slice(0,2000);
  const part=q.match(/^according to (.+?),\s*(.+)$/i)?.[2] || q;
  return [q,part,...part.split(/\s+(?:and also|as well as|and)\s+/i)];
}

// Experimental fallback for low-overlap questions. The original threshold still
// applies unless the encoder independently separates its top passage.
export function experimentalAnswer(def, query, encoder, policy={}) {
  return withPointers(contextualCore(def,query,encoder,policy),def.chunks,query);
}
function contextualCore(def,query,encoder,policy){
  const parts=String(query).split(/\?\s+(?:also,?\s+)?(?=\S)/i);
  if(parts.length>1){
    const answers=parts.map(part=>experimentalAnswer(def,part,encoder,policy));
    if(answers.some(a=>a.status!=='answered'))return answers.find(a=>a.status!=='answered');
    const cited=new Map(answers.flatMap(a=>a.citations).map(c=>[c.id,c]));
    const citations=[...cited.values()];
    return {status:'answered',text:citations.map(c=>c.text).join('\n'),citations};
  }
  // Dense similarity alone cannot establish author identity or an invented field.
  if(/\b(?:invent|fabricate|ignore)\b/i.test(query))return {status:'refused',text:'I could not establish that from the supplied sources.',citations:[]};
  const response=answer(def,query,(chunks,part)=>{
    // Embeddings can place adjacent catalogue codes almost on top of each other.
    // Restrict candidates to passages containing every explicit record identifier.
    let pool=chunks;
    if(encoder.filterIds){
      pool=encoder.filterIds(chunks,part);
    }else if(encoder.contextual){
      const identifiers=value=>(value.toLowerCase().match(/[a-z0-9]+(?:[-_][a-z0-9]+)*/g)??[])
        .filter(token=>/[a-z]/.test(token) && /[0-9]/.test(token));
      const keys=identifiers(part);
      if(keys.length)pool=chunks.filter(c=>{
        const actual=new Set(identifiers(c.text));
        return keys.every(id=>actual.has(id));
      });
    }
    const rows=candidates(pool,part,encoder);
    const dense=[...rows].sort((a,b)=>b.cosine-a.cosine);
    policy.observe?.(part,dense.slice(0,3));
    const top=dense[0];
    if(top && top.cosine>=(policy.minimum??0.50) && top.cosine-(dense[1]?.cosine??0)>=(policy.margin??0.08)){
      const score=Math.max(top.score,def.retrieval.threshold);
      // Preserve ties for conflicting same-topic sources.
      return [top,...rows.filter(r=>r!==top && r.c.topic===top.c.topic)].map(r=>({...r,score}));
    }
    return rows.filter(r=>r.score>=def.retrieval.threshold);
  });
  if(response.status==='answered' && /^(?:who|whose)\b/i.test(query) &&
    !response.citations.some(c=>/\b(?:signed|owner|approved by|contact|supervisor|manager|author)\b/i.test(c.text))){
    return {status:'refused',text:'The cited passage does not identify the responsible person.',citations:[]};
  }
  return response;
}

export function experimentQueries(query) {
  return [query,...query.split(/\?\s+(?:also,?\s+)?(?=\S)/i)].flatMap(answerQueries);
}
