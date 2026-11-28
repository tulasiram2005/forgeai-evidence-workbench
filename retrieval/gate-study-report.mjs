// Rejudge the recorded outputs, never execute a model or modify frozen fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {scoreCase} from '../holdout.mjs';
import {metrics} from './diagnose.mjs';
const base='evidence/v2',study=base+'/gate-study';
const groups={first:['staff','spares','bench'],second:['onboarding','vendors','digitizer'],third:['claims','optics','helpdesk']};
const load=path=>JSON.parse(fs.readFileSync(path));
const judge='fact-source-v1';
const configs=[
 ['V1 lexical','6672204',['evidence/holdout/N',base+'/experiments/second/lexical/N',base+'/holdout3/lexical/N']],
 ['Structured lexical, split','efb689a',[base+'/holdout/N',study+'/second-historical/N-structured']],
 ['Dense fallback','6875964',[base+'/dense/N',study+'/second-historical/N-dense']],
 ['V2 contextual, original IDs','1d6e13c',[base+'/contextual/N',base+'/holdout2/frozen/N']],
 ['V2 contextual, normalized IDs','6c68b0e',[base+'/experiments/first/normalized/N',base+'/experiments/second/normalized/N',base+'/holdout3/frozen/N']],
 ['V2 with local index expansion','e6db09c',[base+'/experiments/first/expanded/N',base+'/experiments/second/expanded/N']],
 ['Portable encoder, earlier gate','9cffce0',Object.keys(groups).map(k=>study+'/static/'+k+'/N')],
 ['V2 + calibrated gate','972af33',Object.keys(groups).map(k=>study+'/gate/'+k+'/N')],
 ['Calibrated gate + CLI reranker','972af33',['first','second'].map(k=>study+'/reranked/'+k+'/N')]
];
function interval({count:x,total:n}){
 if(!n)return {count:x,total:n,lower:null,upper:null};
 const z=1.959963984540054,p=x/n,den=1+z*z/n;
 const mid=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
 return {count:x,total:n,lower:Math.max(0,mid-half),upper:Math.min(1,mid+half)};
}
const rows=[],audits=[];
for(const [config,commit,patterns] of configs){
 for(const [ix,group] of Object.keys(groups).entries()){
  if(!patterns[ix])continue;
  const records=[];
  for(const name of groups[group]){
   const path=patterns[ix].replace('/N','/'+name)+'.json';
   const receipt=load(path);
   const cases=load('examples/'+['holdout','holdout2','holdout3'][ix]+'/'+name+'/cases.json');
   assert.equal(receipt.results.length,cases.length);
   for(const [i,r] of receipt.results.entries()){
    const {actual,passed,...gold}=r;
    assert.deepEqual(gold,cases[i]);assert.equal(scoreCase(gold,actual).passed,passed);records.push(r);
   }
   if(receipt.calibration){
    const {selected,negatives,positives,curve}=receipt.calibration;
    assert.ok(negatives>=60 && selected.falseAnswers/negatives<=.1);
    assert.equal(selected.hits,Math.max(...curve.filter(p=>p.falseAnswers/negatives<=.1).map(p=>p.hits)));
    audits.push({config,group,name,positives,negatives,...selected,receipt:path});
   }
  }
  const measured=metrics(records);
  rows.push({config,commit,group,judge,...Object.fromEntries(Object.entries(measured).map(([k,m])=>[k,interval(m)]))});
 }
}
const write=(path,obj)=>fs.writeFileSync(path,JSON.stringify(obj,null,2)+'\n');
write(study+'/metrics.json',{interval:'Two-sided Wilson score, 95%, question as sampling unit',judge,rows,calibrations:audits});
const frac=m=>m.count+'/'+m.total;
const fmt=m=>frac(m)+' ['+(100*m.lower).toFixed(1)+', '+(100*m.upper).toFixed(1)+'%]';
const md=['# Gate release evaluation','','**Decision: keep the calibrated gate experimental.** It accepts too few supported answers. Its generated examples are direct questions about passage labels. Those examples make it easy to pass calibration without learning the vocabulary real reviewers use. The training cap applies to generated negatives only.','',
'## Reconciled development baselines','','| Configuration | Configuration commit | Judge | Holdout 1 | Holdout 2 |','|---|---|---|---:|---:|'];
for(const [name,sha] of configs){
 md.push('| '+[name,'`'+sha+'`',judge,...['first','second'].map(g=>frac(rows.find(r=>r.group===g&&r.config===name).passed))].join(' | ')+' |');
}
md.push('','The 35/75 receipt used lexical retrieval. The later 47/75 receipt used the dense fallback. They measure different runners on identical questions. The commit column identifies the scoring configuration. Some later-suite evaluations replay earlier configurations. Original and normalized IDs tied on the two development suites. V2 below uses normalized IDs on all three suites. Every saved verdict was cross-checked against the frozen expected status, tokenized key facts and specified source filenames. The judge originated at 6672204 and was extracted as scoreCase at e6db09c.','',
'## Class metrics with 95% Wilson intervals','','Counts precede percentage intervals. Answerable recall requires correct facts and citations. Refusal recall requires an explicit refusal. Near-miss false-answer rate counts an answered response to a near-miss question. Ambiguity is scored separately in the overall pass count.','',
'| Suite | Configuration | Overall | Answerable recall | Refusal recall | False answers on near misses |','|---|---|---:|---:|---:|---:|');
for(const g of Object.keys(groups))for(const r of rows.filter(r=>r.group===g&&['V1 lexical','V2 contextual, normalized IDs','V2 + calibrated gate'].includes(r.config))){
 md.push('| '+[g,r.config,frac(r.passed),fmt(r.answerableRecall),fmt(r.refusalRecall),fmt(r.nearMissFalseAnswers)].join(' | ')+' |');
}
md.push('','Interval widths reflect small denominators. Shared synthetic question patterns and shared sources violate independence, so these intervals describe uncertainty under a question-level binomial assumption. They are not deployment guarantees.','',
'## Holdout 2 error analysis','','| Corpus | Refused by gate | Answered without facts | Answered from wrong source | Retrieval miss |','|---|---:|---:|---:|---:|');
const errors=load(base+'/error-analysis-holdout2.json');
for(const [n,c] of Object.entries(errors.counts))md.push('| '+[n,...['refused by a gate','answered but missing required facts','answered from the wrong source','retrieval miss'].map(k=>c[k]??0)].join(' | ')+' |');
md.push('','Rank traces replay the original contextual release and assert exact agreement with the recorded answer. For multi-part questions the retrieval diagnostic uses the union of observed top-three lists. See the trace before interpreting an individual attribution.','',
'## Frozen protocol and tradeoffs','',
'Holdouts 1 and 2 are development data. Their past failures informed the choice of features. No questions or labels from any holdout enter calibration. Holdout 3 was committed at 68c4988 before scoring. Its first contextual executions were saved at ddc477b. The gate was frozen at 972af33 before scoring it on holdout 3. No post-score retuning was applied.','',
'The portable system changes both encoder and gate relative to historical MiniLM V2. The portable-encoder control in metrics.json keeps the previous gate. On holdout 3 the control passed '+frac(rows.find(r=>r.group==='third'&&r.config==='Portable encoder, earlier gate').passed)+'. A higher total driven by more refusals does not demonstrate improved supported answering. The optional reranker is a separate development experiment. It was excluded from holdout 3 to preserve the declared comparison.','',
'[All counts and curves manifest](metrics.json) · [Per-question failure evidence](../error-analysis-holdout2.json) · [Raw gate receipts with generated calibration pairs and curves](gate/) · [First third-suite receipts](../holdout3/frozen/) · [Browser and CLI parity receipt](browser-cli-parity.json)','');
fs.writeFileSync(study+'/REPORT.md',md.join('\n'));
