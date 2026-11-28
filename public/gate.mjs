import {identifierIndex} from './identifiers.mjs';
import {rankingText} from './passage-context.mjs';
import {vector} from './static-encoder.mjs';

const stop=new Set('a an are as at and by can did do does for from how i in is it my of on or should the to what when where which who with would'.split(' '));
const terms=s=>new Set((s.toLowerCase().match(/[a-z0-9]+/g)??[]).filter(t=>!stop.has(t)));
const types=[
  [/how long|interval|duration|deadline/i,/\b(?:minutes?|hours?|days?|weeks?|months?|years?|seconds?)\b/i],
  [/how much|cost|price|fee|pay(?:ment)?/i,/(?:[$£€]|\b(?:dollars?|euros?|pounds?|credits?)\b)/i],
  [/how many|quantity|number of/i,/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i],
  [/what time|what date|calendar|which day/i,/\b(?:\d{1,2}:\d{2}|\d{4}|monday|tuesday|wednesday|thursday|friday)\b/i],
  [/\bwho\b|whose|which person/i,/\b(?:operator|owner|desk|librarian|technician|physicist|supervisor|manager|examiner|coordinator|reviewer|director|lead|officer|agent)\b/i]
];
const byChunks=new WeakMap();
function corpusIndex(def){
  if(byChunks.has(def.chunks))return byChunks.get(def.chunks);
  const docs=new Map(),frequency=new Map();
  for(const c of def.chunks){
    const text=rankingText(def,c,true),words=terms(text);
    docs.set(c.id,{words,heading:terms([...(c.section??[]),c.topic].join(' ')),vector:vector(text)});
    for(const t of words)frequency.set(t,(frequency.get(t)??0)+1);
  }
  const index={docs,idf:t=>1+Math.log((1+docs.size)/(1+(frequency.get(t)??0))),
    rare:t=>(frequency.get(t)??0)<=Math.max(1,docs.size*0.1),filter:identifierIndex(def.chunks)};
  byChunks.set(def.chunks,index);return index;
}
export function gateRows(def,question,pool=def.chunks,rerank){
  const index=corpusIndex(def),words=[...terms(question)],q=vector(question);
  const weight=words.reduce((sum,t)=>sum+index.idf(t),0)||1;
  const typed=types.find(([query])=>query.test(question));
  const rows=index.filter(pool,question).map(c=>{
    const doc=index.docs.get(c.id);
    let cosine=0;
    for(let i=0;i<q.length;i++)cosine+=q[i]*doc.vector[i];
    const coverage=words.reduce((n,t)=>n+(doc.words.has(t)?index.idf(t):0),0)/weight;
    const heading=words.reduce((n,t)=>n+(doc.heading.has(t)?index.idf(t):0),0)/weight;
    return {c,cosine,coverage,heading,pre:cosine+0.25*coverage};
  }).sort((a,b)=>b.pre-a.pre);
  return rows.slice(0,3).map((r,i)=>{
    const margin=r.pre-(rows[i===0?1:0]?.pre??0);
    const unmatchedRare=words.filter(t=>index.rare(t)&&!index.docs.get(r.c.id).words.has(t)).length;
    const typeMatch=typed?(typed[1].test(r.c.text)?1:-1):0;
    const cross=rerank?.(question,r.c.id)??0;
    const score=2*r.cosine+0.7*margin+0.9*r.coverage+0.35*r.heading+0.35*typeMatch-0.16*unmatchedRare+0.5*cross;
    return {...r,margin,unmatchedRare,typeMatch,cross,score};
  }).sort((a,b)=>b.score-a.score);
}

// No reviewer input is accepted. Topics and answer labels come from these chunks only.
const attributes='deductible|commission|royalty|deduction|amortization|depreciation|waiver|surcharge|serial number|deactivation date|issuer|invoice number|indemnity|exchange rate|deposit|franchise fee|reinstatement fee|restocking fee|tax rate|grace period|renewal period|expiry date|interest rate|vendor address|insurance premium|patent number|license number|emission rating|seismic rating|customs duty|auction value|rental fee|failure probability|compensation rate|audit interval|embargo date|transfer fee|storage charge|design patent|payroll code|dispatch postcode|tariff band|escalation number|export permit|approval stamp|shelf life|solubility|heat capacity|torque limit|duty cycle|voltage rating|proof load|retirement date|discount rate|replacement value|billing currency|vat code|escrow fee|ballot count|board resolution|bond maturity|trademark number|insurance limit|review quorum|franchise territory|bank routing code|capital allowance|stamp duty'.split('|');
export function generatedCases(def){
  const body=def.chunks.map(c=>c.text).join('\n').toLowerCase();
  const chunks=def.chunks.filter((c,i)=>def.chunks.findIndex(k=>k.topic===c.topic)===i).slice(0,48);
  const positive=chunks.map(c=>({q:'What is documented about '+c.topic+'?',gold:c.id}));
  const negatives=new Map();
  for(const attr of attributes.filter(a=>!body.includes(a))){
    for(const c of chunks){
      const q='What is the '+attr+' for '+c.topic+'?';
      negatives.set(q,{q,attribute:attr});
    }
  }
  if(negatives.size<60)throw Error('Insufficient distinct absent attributes for calibration.');
  const all=[...negatives.values()];
  return [...positive,...Array.from({length:60},(_,i)=>all[Math.floor(i*all.length/60)])];
}
export function calibrateGate(def,rerank){
  const samples=generatedCases(def).map(entry=>{
    const top=gateRows(def,entry.q,def.chunks,rerank)[0];
    return {...entry,topId:top?.c.id,score:top?.score??null};
  });
  const cuts=[...new Set(samples.flatMap(s=>s.score===null?[]:[s.score]))].sort((a,b)=>b-a);
  cuts.unshift((cuts[0]??0)+1);
  const positives=samples.filter(s=>s.gold).length, negatives=samples.length-positives;
  const curve=cuts.map(cut=>{
    const accepted=samples.filter(s=>s.score!==null&&s.score>=cut);
    return {cut,hits:accepted.filter(s=>s.gold&&s.gold===s.topId).length,falseAnswers:accepted.filter(s=>!s.gold).length};
  });
  const selected=curve.filter(p=>p.falseAnswers/negatives<=0.1).sort((a,b)=>b.hits-a.hits || a.falseAnswers-b.falseAnswers || b.cut-a.cut)[0];
  return {version:2,encoder:'potion-base-2M-int8',reranker:Boolean(rerank),positives,negatives,selected,curve,samples};
}
