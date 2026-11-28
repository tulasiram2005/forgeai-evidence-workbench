import fs from 'node:fs';
import assert from 'node:assert/strict';
import {scoreCase} from '../holdout.mjs';
import {metrics} from './diagnose.mjs';
import {corpora,suites,topOne,refuse} from './reference-agents.mjs';

const get=path=>JSON.parse(fs.readFileSync(path));
const save=(path,data)=>fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');
const groups=['first','second','third'];
const rows=get('evidence/v2/gate-study/metrics.json').rows.map(row=>({...row,suite:suites[groups.indexOf(row.group)]}));
const refs=['Always refuse','Always answer with top-1'];
const keys=['passed','answerableRecall','refusalRecall','nearMissFalseAnswers'];
export function wilson({count,total}){
  if(!total)return {count,total,lower:null,upper:null};
  const z=1.959963984540054,p=count/total,d=1+z*z/total;
  const mid=(p+z*z/(2*total))/d,width=z*Math.sqrt((p*(1-p)+z*z/(4*total))/total)/d;
  return {count,total,lower:Math.max(0,mid-width),upper:Math.min(1,mid+width)};
}
const receipts=[];
for(const suite of suites){
  const records=[[],[]];
  for await(const {name,chunks,cases} of corpora(suite)){
    for(const c of cases)for(const [i,response] of [refuse(),topOne(chunks,c.question)].entries()){
      const r=scoreCase(c,response);
      records[i].push(r);
      receipts.push({suite,name,agent:refs[i],...r});
    }
  }
  for(const [i,items] of records.entries())rows.push({config:refs[i],suite,judge:'fact-source-v1',...metrics(items)});
}
save('evidence/v2/reference-receipts.json',receipts);
for(const config of new Set(rows.map(r=>r.config))){
  const subset=rows.filter(r=>r.config===config);
  if(subset.length!==suites.length)continue;
  const pooled={config,suite:'pooled',judge:subset[0].judge};
  for(const k of keys)pooled[k]=subset.reduce((v,r)=>({count:v.count+r[k].count,total:v.total+r[k].total}),{count:0,total:0});
  rows.push(pooled);
}
for(const r of rows){
  for(const k of keys)r[k]=wilson(r[k]);
  r.balancedAccuracy=(r.answerableRecall.count/r.answerableRecall.total+r.refusalRecall.count/r.refusalRecall.total)/2;
  assert.ok(Number.isFinite(r.balancedAccuracy));
}
save('public/runs/reference-results.json',rows);
const pct=x=>(100*x).toFixed(1)+'%';
const fmt=m=>m.count+'/'+m.total+' ['+pct(m.lower)+', '+pct(m.upper)+']';
const lines=['# Development reference results','','Balanced accuracy gives equal weight to correct supported answers and correct refusals. Overall passes also include ambiguity. Intervals are question-level Wilson 95% intervals. Each pooled row combines case counts across all suites before calculating recalls. Historical configurations with incomplete suite coverage have individual suite rows only.','','| Suite | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |','|---|---|---:|---:|---:|---:|---:|'];
for(const suite of [...suites,'pooled'])for(const r of rows.filter(r=>r.suite===suite))lines.push('| '+[suite,r.config,r.passed.count+'/'+r.passed.total,fmt(r.answerableRecall),fmt(r.refusalRecall),fmt(r.nearMissFalseAnswers),pct(r.balancedAccuracy)].join(' | ')+' |');
fs.writeFileSync('evidence/v2/reference-results.md',lines.join('\n')+'\n');
const highlights=lines.filter(line=>line.startsWith('| pooled')&&[...refs,'V2 contextual, normalized IDs'].some(name=>line.includes('| '+name+' |')));
for(const [path,link] of [['README.md','evidence/v2/reference-results.md'],['evidence/v2/gate-study/REPORT.md','../reference-results.md']]){
  const marker='\n## Development reference comparison\n';
  const source=fs.readFileSync(path,'utf8').split(marker)[0];
  fs.writeFileSync(path,source.trimEnd()+'\n'+marker+'\n'+[lines[4],lines[5],...highlights,'','[Full suite comparisons, interval definitions and historical configurations]('+link+')',''].join('\n'));
}
