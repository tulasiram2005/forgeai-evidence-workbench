import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {corpora,suites} from '../retrieval/reference-agents.mjs';
import {encode,candidates,experimentQueries} from '../retrieval/hybrid.mjs';
import {normalized,stressVerdict} from '../retrieval/stress-judge.mjs';
import {readDocuments} from '../documents.mjs';
import {build,rank} from '../public/engine.mjs';
import {loadLocalGate} from '../retrieval/local-gate.mjs';
import {gateRows} from '../public/gate.mjs';
const output='evidence/funnel';
fs.mkdirSync(output,{recursive:true});
const save=(name,data)=>fs.writeFileSync(output+'/'+name+'.json',JSON.stringify(data,null,2)+'\n');
const folders=['experiments/first/normalized','experiments/second/normalized','holdout3/frozen','holdout4/frozen'];
const all=[];
const quote=chunks=>({status:'answered',text:chunks.map(c=>c.text).join('\n'),citations:chunks});
const contains=(text,fact)=>(' '+normalized(text)+' ').includes(' '+normalized(fact)+' ');
const band=n=>n===null?'miss':n===1?'top1':n<=3?'top3':n<=10?'top10':'miss';
await loadLocalGate();
for(const [si,suite] of [...suites,'holdout4'].entries()){
  for await(const {chunks,cases,name} of corpora(suite)){
    const path='examples/'+suite+'/'+name;
    const receipt=JSON.parse(fs.readFileSync('evidence/v2/'+folders[si]+'/'+name+'.json'));
    const {definition}=build(fs.readFileSync(path+'/brief.txt','utf8'),await readDocuments(path+'/docs'),{contextual:true,splitValidation:true});
    const threshold=(receipt.configuration??definition.retrieval).threshold;
    const eligible=cases.filter(c=>c.status==='answered'||c.kind==='near miss');
    const encoder=encode({chunks},eligible.flatMap(c=>experimentQueries(c.question)),true);
    const pairs=eligible.flatMap(c=>chunks.map(p=>({q:c.question,text:p.text})));
    const cross=JSON.parse(execFileSync('python3',['retrieval/cross-encoder.py'],{input:JSON.stringify(pairs),encoding:'utf8'}));
    const records=eligible.map((c,i)=>{
      const actual=receipt.results.find(r=>r.question===c.question).actual;
      const gold=(c.facts??[]).map((f,j)=>chunks.filter(p=>p.source===c.sources[j]&&contains(p.text,f)));
      const q=c.question,lexical=rank(chunks,q).map(r=>r.c),rows=candidates(chunks,q,encoder);
      const dense=[...rows].sort((a,b)=>b.cosine-a.cosine);
      const rerank=chunks.map((p,j)=>({p,score:cross[i*chunks.length+j]})).sort((a,b)=>b.score-a.score);
      const orders={lexical,dense:dense.map(r=>r.c),hybrid:rows.map(r=>r.c),reranker:rerank.map(r=>r.p)};
      const ranks={};
      for(const [method,order] of Object.entries(orders)){
        const sources=[...new Set(order.map(p=>p.source))];
        const factRanks=gold.map(pool=>order.findIndex(p=>pool.includes(p))+1||null);
        const completion=gold.length&&factRanks.every(Boolean)?Math.max(...factRanks):null;
        ranks[method]={factRanks,allFactsByRank:completion,band:band(completion),sourceRanks:(c.sources??[]).map(s=>sources.indexOf(s)+1||null),top:order.slice(0,10).map(p=>p.id)};
      }
      const oracle=quote([...new Set(gold.map(p=>p[0]).filter(Boolean))]);
      const judged=a=>stressVerdict(c,a,chunks);
      const signals={cosine:dense[0].cosine,margin:dense[0].cosine-(dense[1]?.cosine??0),idfCoverage:gateRows({chunks},q)[0]?.coverage??0,reranker:rerank[0].score};
      const forced=[1,3].map(k=>{const response=quote(orders.hybrid.slice(0,k));return {k,response,passed:judged(response)};});
      const passed=judged(actual);
      const loss=c.status!=='answered'?null:passed?'passed':!gold.every(a=>a.length)?'parse':!ranks.hybrid.allFactsByRank||ranks.hybrid.allFactsByRank>3?'retrieval':actual.status!=='answered'?'gate':'selection';
      const parts=experimentQueries(q).filter((v,i,a)=>a.indexOf(v)===i).map(part=>{
        const pool=encoder.filterIds(chunks,part),d=candidates(pool,part,encoder).sort((a,b)=>b.cosine-a.cosine);
        const score=d[0]?.cosine??null,margin=score===null?null:score-(d[1]?.cosine??0);
        return {part,score,margin,promoted:score!==null&&score>=.5&&margin>=.08,lexicalMaximum:d.length?Math.max(...d.map(r=>r.score)):null};
      });
      return {suite,name,question:q,expected:c.status,signals,ranks,goldFacts:c.facts??[],goldSources:c.sources??[],indexed:gold.map(a=>a.map(p=>p.id)),oracle:c.status==='answered'?{response:oracle,passed:judged(oracle)}:null,gate:{parts,minimumCosine:.5,minimumMargin:.08,lexicalThreshold:threshold,decision:actual.status},forced,actual,passed,loss};
    });
    save(suite+'-'+name,records);all.push(...records);
  }
}
let seed=1801;
const sample=a=>Array.from({length:a.length},()=>a[Math.floor((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296*a.length)]);
function auc(p,n){return p.reduce((s,x)=>s+n.reduce((t,y)=>t+(x>y?1:x===y?.5:0),0),0)/(p.length*n.length);}
const summary=[];
for(const suite of [...suites,'holdout4','pooled']){
  const rows=all.filter(r=>suite==='pooled'||r.suite===suite),positive=rows.filter(r=>r.oracle),neg=rows.filter(r=>!r.oracle);
  const signals={};
  for(const key of Object.keys(rows[0].signals)){
    const p=positive.map(r=>r.signals[key]),n=neg.map(r=>r.signals[key]);
    const reps=Array.from({length:1000},()=>auc(sample(p),sample(n))).sort((a,b)=>a-b);
    signals[key]={auc:auc(p,n),lower:reps[24],upper:reps[974]};
  }
  summary.push({suite,answerable:positive.length,oracle:positive.filter(r=>r.oracle.passed).length,nearMiss:neg.length,falseAnswers:neg.filter(r=>r.actual.status==='answered').length,losses:Object.fromEntries(Object.entries(Object.groupBy(positive,r=>r.loss)).map(([k,v])=>[k,v.length])),outsideHybridTop3:positive.filter(r=>!r.ranks.hybrid.allFactsByRank||r.ranks.hybrid.allFactsByRank>3).length,signals});
}
save('summary',{method:'All facts must be covered in their named sources. Whole-question diagnostic rankings are ungated. Gate component traces include candidate subqueries. Final verdict uses the archived response. AUROC uses stratified question bootstrap percentile intervals; shared corpora limit independence.',summary});
