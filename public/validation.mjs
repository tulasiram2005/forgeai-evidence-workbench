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
