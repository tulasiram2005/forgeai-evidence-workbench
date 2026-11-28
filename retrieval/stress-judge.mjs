// Extractive fact judge. Compare source quotations literally and normalize only answer text.
export const judgeVersion='extractive-fact-source-v2';
const small='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const tens='zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
export function numberWords(n){
  if(n<20)return small[n];
  if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+small[n%10]:'');
}
const numbers=new Map(Array.from({length:100},(_,n)=>[numberWords(n),String(n)]));
const words=new RegExp('\\b('+[...numbers.keys()].sort((a,b)=>b.length-a.length).join('|')+')\\b','gi');
const units={hrs:'hours',hr:'hours',mins:'minutes',min:'minutes',secs:'seconds',mm:'millimeters',eur:'euros'};
const months='january february march april may june july august september october november december'.split(' ');
export function normalized(s){
  return String(s).toLowerCase().normalize('NFKC')
    .replace(/\b(\d{1,2}) (\w+) (\d{4})\b/g,(v,d,m,y)=>months.includes(m)?y+'-'+String(months.indexOf(m)+1).padStart(2,'0')+'-'+d.padStart(2,'0'):v)
    .replace(/\b\d{4}-\d\d-\d\d\b/g,v=>' date'+v.replaceAll('-','')+' ')
    .replace(/(?<=\d)\.(?=\d)/g,' decimal ').replace(/(?<=\d):(?=\d)/g,' clock ')
    .replace(/[.,!?;()"“”]/g,' ').replace(/(?<=[a-z])-(?=[a-z])/g,' ')
    .replace(/\s+/g,' ').replace(words,v=>numbers.get(v)).replace(/\b(hrs?|mins?|secs|mm|eur)\b/g,v=>units[v]).trim();
}
export function stressVerdict(c,a,chunks){
  if(a.status!==c.status)return false;
  if(c.status!=='answered')return a.citations.length===0;
  if(!a.citations.length || a.citations.some(p=>!chunks.some(s=>s.id===p.id&&s.source===p.source&&s.text===p.text)))return false;
  const text=normalized(a.text), includes=(s,f)=>(' '+s+' ').includes(' '+f+' ');
  const supported=c.facts.every((f,i)=>includes(text,normalized(f))&&a.citations.some(p=>p.source===c.sources[i]&&includes(normalized(p.text),normalized(f))));
  if(!supported)return false;
  return [a.citations.map(p=>p.text).join(' '),c.facts.join(' ')].some(form=>normalized(form)===text) ||
    a.citations.some(p=>includes(normalized(p.text),text));
}
