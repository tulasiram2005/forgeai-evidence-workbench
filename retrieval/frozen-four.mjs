import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareRunner} from './release-runner.mjs';
import {topOne,refuse} from './reference-agents.mjs';
import {judgeVersion,stressVerdict} from './stress-judge.mjs';
import {metrics} from './diagnose.mjs';
import {splitScore} from '../public/validation.mjs';
const base='examples/holdout4',out='evidence/v2/holdout4';
fs.mkdirSync(out);fs.mkdirSync(out+'/frozen');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const temp=fs.mkdtempSync(join(tmpdir(),'forge-h4-'));
const all=[];
for(const name of fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort()){
  const fixture=join(base,name),dest=join(temp,name);
  execFileSync(process.execPath,['cli.mjs','forge','--brief',fixture+'/brief.txt','--docs',fixture+'/docs','--out',dest,'--deterministic'],{stdio:['ignore','ignore','inherit']});
  const def=JSON.parse(fs.readFileSync(dest+'/definition.json'));
  const cases=JSON.parse(fs.readFileSync(fixture+'/cases.json'));
  const run=prepareRunner(def,cases);
  const results=[],references=[];
  for(const c of cases){
    const actual=run(def,c.question);
    for(const [config,a] of [['V2 contextual',actual],['Always refuse',refuse()],['Always answer with top-1',topOne(def.chunks,c.question)]]){
      const r={...c,actual:a,passed:stressVerdict(c,a,def.chunks)};
      all.push({name,config,...r});
      if(config==='V2 contextual')results.push(r);else references.push({config,...r});
    }
  }
  fs.writeFileSync(out+'/frozen/'+name+'.json',JSON.stringify({source,judgeVersion,configuration:def.retrieval,results,references},null,2)+'\n',{flag:'wx'});
}
const rows=[];
for(const name of [...new Set(all.map(r=>r.name)),'pooled'])for(const [config,rs] of Map.groupBy(all.filter(r=>name==='pooled'||r.name===name),r=>r.config)){
  const m=metrics(rs);
  for(const x of Object.values(m)){
    const scores=splitScore(Array.from({length:x.total},(_,i)=>({passed:i<x.count})));
    Object.assign(x,{lower:scores.lower,upper:scores.upper});
  }
  rows.push({name,config,...m,balancedAccuracy:(m.answerableRecall.count/m.answerableRecall.total+m.refusalRecall.count/m.refusalRecall.total)/2});
}
fs.writeFileSync(out+'/summary.json',JSON.stringify(rows,null,2)+'\n',{flag:'wx'});
