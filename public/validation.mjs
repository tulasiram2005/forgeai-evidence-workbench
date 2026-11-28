// Distribute each class proportionally. Singletons stay available for tuning.
export function validationIds(cases) {
  const groups=Map.groupBy(cases,c=>c.kind);
  const ids=new Set();
  for(const entries of groups.values()){
    const count=Math.min(entries.length-1,Math.round(entries.length*0.3));
    for(let i=0;i<count;i++) ids.add(entries[Math.floor((i+0.5)*entries.length/count)].id);
  }
  return ids;
}

export function judgeControls(definition, cases, evaluate) {
  const positive=cases.find(c=>c.status==='answered' && c.expected.length);
  const negative=cases.find(c=>c.status==='refused');
  if(!positive || !negative) return [];
  const cite=positive.expected[0];
  const controls=[
    ['Always refuses',positive,{status:'refused',text:'Insufficient evidence',citations:[]}],
    ['Always answers',negative,{status:'answered',text:cite.text,citations:[cite]}],
    ['Fabricated number',positive,{status:'answered',text:cite.text+' 999991',citations:[cite]}],
    ['Wrong source',positive,{status:'answered',text:cite.text,citations:[{...cite,source:'missing/'+cite.source}]}]
  ];
  return controls.map(([name,entry,response])=>({name,caseId:entry.id,
    rejected:!evaluate(definition,[entry],()=>response)[0].passed}));
}

export function splitCases(cases){
  const buckets={tune:[],validate:[],test:[]};
  const classes=Map.groupBy(cases,c=>c.status);
  const target=Math.round(cases.length/5);
  function allocate(available){
    const quotas=[...classes].map(([key,rows])=>({key,quota:rows.length/5,count:Math.min(available[key],Math.floor(rows.length/5))}));
    const ranked=quotas.sort((a,b)=>(b.quota-b.count)-(a.quota-a.count));
    let remaining=target-ranked.reduce((n,v)=>n+v.count,0);
    for(const row of ranked)if(remaining && row.count<available[row.key]){row.count++;remaining--;}
    return Object.fromEntries(ranked.map(v=>[v.key,v.count]));
  }
  const sizes=Object.fromEntries([...classes].map(([k,v])=>[k,v.length]));
  const test=allocate(sizes),valid=allocate(Object.fromEntries(Object.entries(sizes).map(([k,n])=>[k,n-test[k]])));
  for(const [key,rows] of classes){
    const sorted=[...rows].sort((a,b)=>a.question.localeCompare(b.question,'en'));
    for(const [i,c] of sorted.entries()){
      const perm=(i+Math.floor(rows.length/3))%rows.length;
      buckets[perm<test[key]?'test':perm<test[key]+valid[key]?'validate':'tune'].push(c);
    }
  }
  return buckets;
}
export function splitScore(results){
  const n=results.length,x=results.filter(r=>r.passed).length,z=1.959963984540054,p=x/n,d=1+z*z/n;
  const mid=(p+z*z/(2*n))/d,width=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d;
  return {passed:x,total:n,lower:Math.max(0,mid-width),upper:Math.min(1,mid+width)};
}
