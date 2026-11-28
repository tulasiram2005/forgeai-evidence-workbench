import fs from 'node:fs';
import {corpora,suites} from './reference-agents.mjs';
import {stressVerdict,judgeVersion} from './stress-judge.mjs';
import {metrics} from './diagnose.mjs';
import {splitScore} from '../public/validation.mjs';
const read=path=>JSON.parse(fs.readFileSync(path));
const refs=read('evidence/v2/reference-receipts.json');
const records=[];
const configs=['V2 contextual','Always refuse','Always answer with top-1'];
for(const [index,suite] of [...suites,'holdout4'].entries()){
  for await(const {name,chunks} of corpora(suite)){
    const folder=['experiments/first/normalized','experiments/second/normalized','holdout3/frozen','holdout4/frozen'][index];
    const raw=read('evidence/v2/'+folder+'/'+name+'.json');
    const controls=raw.references??refs.filter(r=>r.suite===suite&&r.name===name);
    for(const r of [...raw.results,...controls]){
      const config=r.config??r.agent??configs[0];
      records.push({...r,passed:stressVerdict(r,r.actual,chunks),suite,config});
    }
  }
}
const results=[];
for(const suite of [...suites,'holdout4','pooled'])for(const config of configs){
  const rows=records.filter(r=>(r.suite===suite||suite==='pooled')&&r.config===config);
  const m=metrics(rows);
  for(const v of Object.values(m)){
    const {lower,upper}=splitScore(Array.from({length:v.total},(_,i)=>({passed:i<v.count})));
    Object.assign(v,{lower,upper});
  }
  results.push({suite,config,judge:judgeVersion,...m,balancedAccuracy:(m.answerableRecall.count/m.answerableRecall.total+m.refusalRecall.count/m.refusalRecall.total)/2});
}
fs.writeFileSync('public/runs/release-results.json',JSON.stringify(results,null,2)+'\n');
const lines=['# All-suite comparison','','The extractive judge rechecks recorded outputs against original passages. Holdouts 1 to 3 informed development. Holdout 4 is prospective. Pooling them describes the full collection and cannot substitute for the fresh-suite result.','','| Suite | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |','|---|---|---:|---:|---:|---:|---:|'];
const pct=x=>(x*100).toFixed(1)+'%';
const fmt=m=>m.count+'/'+m.total+' ['+pct(m.lower)+', '+pct(m.upper)+']';
for(const r of results)lines.push('| '+[r.suite,r.config,r.passed.count+'/'+r.passed.total,...[r.answerableRecall,r.refusalRecall,r.nearMissFalseAnswers].map(fmt),pct(r.balancedAccuracy)].join(' | ')+' |');
fs.writeFileSync('evidence/v2/release-results.md',lines.join('\n')+'\n');
