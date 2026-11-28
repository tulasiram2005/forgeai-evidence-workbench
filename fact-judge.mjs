// Keep each fact bound to its own acceptable sources for multi-document cases.
const tokens=text=>text.normalize('NFKC').toLowerCase().match(/[+-]?\d+(?:[.,]\d+)*|[\p{L}\p{N}]+/gu)??[];
function contains(text,fact){
  const haystack=tokens(text),needle=tokens(fact);
  return needle.length>0 && haystack.some((_,i)=>needle.every((t,j)=>t===haystack[i+j]));
}
export function factVerdict(def,entry,actual){
  const facts=entry.must_include_facts??entry.expected.map(c=>({
    phrase:c.text.replace(/^[^:\n]{1,90}:\s+/,''),acceptable_sources:[c.source]
  }));
  if(actual.status!==entry.status)return {passed:false,reason:'Outcome mismatch'};
  if(!actual.citations.every(c=>def.chunks.some(p=>p.id===c.id&&p.source===c.source&&p.text===c.text)))
    return {passed:false,reason:'Unverified citation'};
  if(entry.status==='answered' && !facts.length)return {passed:false,reason:'Missing reference facts'};
  for(const f of facts){
    const phrase=typeof f==='string'?f:f.phrase;
    const sources=typeof f==='string'?entry.acceptable_sources:f.acceptable_sources;
    if(!contains(actual.text,phrase)||!actual.citations.some(c=>sources?.includes(c.source)&&contains(c.text,phrase)))
      return {passed:false,reason:'Reference fact missing from answer or acceptable source'};
  }
  return {passed:true,reason:'All reference requirements met'};
}
