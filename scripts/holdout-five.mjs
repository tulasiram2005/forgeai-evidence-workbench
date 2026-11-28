import fs from 'node:fs';
import {corpora,topOne,refuse} from '../retrieval/reference-agents.mjs';
import {prepareRunner} from '../retrieval/release-runner.mjs';
import {strictAnswer} from '../public/evidence-first.mjs';
import {stressVerdict} from '../retrieval/stress-judge.mjs';
import {build} from '../public/engine.mjs';
import {readDocuments} from '../documents.mjs';
import {metrics} from '../retrieval/diagnose.mjs';
import {splitScore} from '../public/validation.mjs';
const output='evidence/holdout5';
fs.mkdirSync(output);
const rows=[];
for await(const {name,chunks,cases} of corpora('holdout5')){
 const folder='examples/holdout5/'+name;
 const {definition}=build(fs.readFileSync(folder+'/brief.txt','utf8'),await readDocuments(folder+'/docs'),{contextual:true,splitValidation:true});
 const contextual=prepareRunner(definition,cases);
 const records=[];
 for(const c of cases)for(const [config,runner] of Object.entries({contextual,strict:strictAnswer,alwaysRefuse:()=>refuse(),alwaysAnswer:(d,q)=>topOne(d.chunks,q)})){
   const actual=runner(definition,c.question),r={name,config,...c,actual,passed:stressVerdict(c,actual,chunks)};
   rows.push(r);records.push(r);
 }
 fs.writeFileSync(output+'/'+name+'.json',JSON.stringify(records,null,2)+'\n',{flag:'wx'});
}
const summary=[];
for(const name of [...new Set(rows.map(r=>r.name)),'pooled'])for(const [config,rs] of Map.groupBy(rows.filter(r=>name==='pooled'||r.name===name),r=>r.config)){
 const m=metrics(rs);
 for(const v of Object.values(m)){
   const {lower,upper}=splitScore(Array.from({length:v.total},(_,i)=>({passed:i<v.count})));Object.assign(v,{lower,upper});
 }
 summary.push({name,config,...m,balancedAccuracy:(m.answerableRecall.count/m.answerableRecall.total+m.refusalRecall.count/m.refusalRecall.total)/2});
}
fs.writeFileSync(output+'/summary.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
