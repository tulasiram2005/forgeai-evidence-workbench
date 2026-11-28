// Match complete record-like tokens. A space between ordinary prose and a
// number is not an identifier unless it uses a known prefix or an uppercase one.
const atoms=/[\p{L}\p{N}]+(?:[-_/][\p{L}\p{N}]+)*/gu;
const compact=s=>s.toLowerCase().replace(/[-_/\s]/g,'').replace(/\d+/g,n=>n.replace(/^0+(?=\d)/,''));
function identifiers(text,prefixes){
  const found=[];
  const tokens=Array.from(text.matchAll(atoms));
  for(let i=0;i<tokens.length;i++){
    const [word]=tokens[i];
    if(/[a-z]/i.test(word) && /\d/.test(word)){found.push(word);continue;}
    const next=tokens[i+1];
    if(!next || !/^[a-z]+$/i.test(word) || !/^\d+[a-z]*$/i.test(next[0]))continue;
    const gap=text.slice(tokens[i].index+word.length,next.index);
    if(!/^\s+$/.test(gap) || !(prefixes.has(word.toLowerCase()) || /^[A-Z]{2,8}$/.test(word)))continue;
    found.push(word+' '+next[0]);i++;
  }
  return found;
}
export function identifierIndex(chunks){
  const prefixes=new Set();
  for(const c of chunks){
    for(const raw of [...(c.row??[]),...identifiers(c.text,prefixes)]){
      const m=raw.match(/^([a-z]+)[\s_/-]*\d/i);
      if(m)prefixes.add(m[1].toLowerCase());
    }
  }
  const index=new Map(chunks.map(c=>[c.id,new Set([...identifiers(c.text,prefixes),
    ...(c.row??[]).filter(s=>/^[a-z]+\s+\d+[a-z]*$/i.test(s))].map(compact))]));
  return (candidates,query)=>{
    const keys=identifiers(query,prefixes).map(compact);
    return keys.length?candidates.filter(c=>keys.every(k=>index.get(c.id)?.has(k))):candidates;
  };
}
