// Run from the repository root after the documented holdout and diagnose commands.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {metrics} from './diagnose.mjs';
const root='evidence/v2';
const load=p=>JSON.parse(readFileSync(p));
const write=(p,obj)=>writeFileSync(p,JSON.stringify(obj,null,2)+'\n');
const names={first:['staff','spares','bench'],second:['onboarding','vendors','digitizer']};
const ds=names.first.map(folder=>({folder,...load(root+'/diagnostics/'+folder+'.json')}));
const errors=ds.flatMap(d=>d.errors.map(e=>({folder:d.folder,...e})));
for(const d of ds){
 const frozen=load(root+'/contextual/'+d.folder+'.json').results;
 assert.deepEqual(d.errors.map(r=>r.question),frozen.filter(r=>r.status==='answered'&&r.actual.status==='refused').map(r=>r.question));
}
const categories=['retrieval miss','vocabulary mismatch','threshold too strict'];
const reasons=Object.fromEntries(categories.map(k=>[k,errors.filter(e=>e.cause===k).length]));
const vocabulary=ds.flatMap(d=>d.vocabulary.map(v=>({folder:d.folder,...v})));
write(root+'/error-analysis.json',{configuration:'1d6e13c',k:3,reasons,errors,vocabulary});
const sweep=ds[0].sweep.map((row,i)=>{
 const point={minimum:row.minimum,margin:row.margin};
 for(const metric of ['passed','answerableRecall','refusalRecall','nearMissFalseAnswers']){
  const total=ds.reduce((t,d)=>t+d.sweep[i][metric].total,0),count=ds.reduce((t,d)=>t+d.sweep[i][metric].count,0);
  point[metric]={count,total,rate:total?count/total:null};
 }
 return point;
});
write('public/runs/threshold-sweep.json',{x:'Minimum dense cosine',series:['answerableRecall','refusalRecall','nearMissFalseAnswers'],points:sweep});
const cols=['minimum','margin',...Object.keys(sweep[0]).slice(2).flatMap(m=>[m+'_count',m+'_total',m+'_rate'])];
writeFileSync(root+'/threshold-sweep.csv',[cols.join(','),...sweep.map(p=>[p.minimum,p.margin,...Object.values(p).slice(2).flatMap(m=>[m.count,m.total,m.rate])].join(','))].join('\n')+'\n');
const fraction=r=>r.count+'/'+r.total;
const results=[];
for(const [group,folders] of Object.entries(names)){
 for(const mode of ['lexical','frozen','normalized','expanded']){
  const perFolder=folders.map(folder=>{
   const dir=mode==='frozen'?(group==='first'?root+'/contextual':root+'/holdout2/frozen'):root+'/experiments/'+group+'/'+mode;
   const rows=load(dir+'/'+folder+'.json').results;
   const suite=load('examples/'+(group==='first'?'holdout':'holdout2')+'/'+folder+'/cases.json');
   assert.deepEqual(rows.map(({actual,passed,...c})=>c),suite);
   return {folder,rows};
  });
  results.push({group,mode,...metrics(perFolder.flatMap(r=>r.rows)),folders:perFolder.map(f=>({name:f.folder,...metrics(f.rows)}))});
 }
}
write(root+'/holdout-comparison.json',results);
const shared=vocabulary.filter(r=>r.shared.length).length, near=vocabulary.filter(r=>r.kind==='near miss');
const output=['# Retrieval experiments','',
'The release decision uses the exact frozen questions and source-backed key facts. The second corpus set was committed before scoring. Its first contextual run is archived separately. Lexical means the portable v1 deterministic configuration. Frozen means the contextual v2 CPU encoder with its original identifier gate. Normalized changes identifier matching only. Expanded adds one Qwen summary and three questions per passage to that normalized configuration. Only source text can satisfy the judge.','',
'| Suite | Configuration | Passed | Grounded answerable recall | Refusal recall | False answers on near misses |','|---|---|---:|---:|---:|---:|',
...results.map(r=>'| '+[r.group,r.mode,...['passed','answerableRecall','refusalRecall','nearMissFalseAnswers'].map(k=>fraction(r[k]))].join(' | ')+' |'),
'','Expansion reduced total passes on both suites. The normalized identifier gate matched the frozen aggregate scores. Keep expansion opt-in. The second suite shows a cost to contextual retrieval: it answered more supported questions but gave more unsupported answers than lexical retrieval. All corpora are synthetic, and the second suite was authored in the same development session.','',
'![Measured operating curve](threshold-sweep.svg)','',
'## False-refusal analysis for the frozen first suite','','| Primary cause | Questions |','|---|---:|',...Object.entries(reasons).map(([k,v])=>'| '+k+' | '+v+' |'),'',
'For each refused clause, inspect the gold passage’s rank under cosine similarity. A gold passage outside the top three is a retrieval miss. Inside the top three, a correct answer after relaxing the dense floor and margin is classified as a threshold failure. Remaining top-three failures are classified as vocabulary mismatch, a ranking diagnosis rather than proof of user intent. For multi-part questions the primary label prioritizes retrieval miss, then vocabulary mismatch, then threshold. The JSON retains the clause-level evidence and alternate causes.','',
shared+' of '+vocabulary.length+' required refusals shared at least one lowercased non-stopword with the source documents. '+near.filter(r=>r.shared.length).length+' of '+near.length+' near misses shared vocabulary. Other required refusals include unsupported instructions. Near-miss false-answer rate counts answered responses only; refusal recall requires an explicit refusal. Grounded answerable recall requires the expected facts and sources.','',
'## Operating point','',
'The sweep varies only the minimum cosine with the separation margin fixed. Lexical fallback, tool policy and explicit refusal checks still apply. Lowering both gates in the diagnostic is a separate counterfactual. The sweep uses the first suite only.','',
'[Case evidence](error-analysis.json) · [Operating curve CSV](threshold-sweep.csv) · [Chart data](../../public/runs/threshold-sweep.json) · [Folder-level metrics](holdout-comparison.json) · [First runs on the second suite](holdout2/frozen/)',''];
writeFileSync(root+'/RETRIEVAL-REPORT.md',output.join('\n'));
