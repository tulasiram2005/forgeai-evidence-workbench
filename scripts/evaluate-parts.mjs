import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {corpora} from '../retrieval/reference-agents.mjs';
import {stressVerdict,judgeVersion} from '../retrieval/stress-judge.mjs';
import {strictAnswer} from '../public/evidence-first.mjs';
import {reviewParts} from '../public/review-parts.mjs';

const work=mkdtempSync(join(tmpdir(),'forge-parts-replay-'));
const rows=[], inputs=[];
function summarize(rows,arm){
  const scored=rows.map(r=>({...r,...r[arm]}));
  const metric=(items,predicate)=>({count:items.filter(predicate).length,total:items.length});
  return {
    overall:metric(scored,x=>x.passed),
    supported:metric(scored.filter(x=>x.expected==='answered'),x=>x.passed),
    refusals:metric(scored.filter(x=>x.expected==='refused'),x=>x.passed),
    nearMissFalseAnswers:metric(scored.filter(x=>x.kind==='near miss' && x.expected==='refused'),x=>x.status==='answered')
  };
}
try{
  const suites=['holdout','holdout2','holdout3','holdout4'];
  for(const suite of suites)for await(const {name,cases} of corpora(suite)){
    const folder=join('examples',suite,name),out=join(work,suite+'-'+name);
    execFileSync(process.execPath,['cli.mjs','forge','--no-llm','--brief',join(folder,'brief.txt'),'--docs',join(folder,'docs'),'--out',out]);
    const def=JSON.parse(readFileSync(join(out,'definition.json')));
    inputs.push({suite,name,casesSha256:createHash('sha256').update(readFileSync(join(folder,'cases.json'))).digest('hex')});
    for(let i=0;i<cases.length;i+=2){
      const group=cases.slice(i,i+2);
      const pair=group.length===2?group:[group[0],cases[0]];
      const review=reviewParts(def,pair.map(c=>c.question));
      for(const [index,c] of group.entries()){
        const baseline=strictAnswer(def,c.question),candidate=review.parts[index];
        const record=response=>({status:response.status,text:response.text,citations:response.citations,passed:stressVerdict(c,response,def.chunks)});
        rows.push({suite,name,ordinal:i+index+1,question:c.question,expected:c.status,kind:c.kind,baseline:record(baseline),candidate:record(candidate)});
      }
    }
  }
  const summary=[...suites,'pooled'].map(suite=>{
    const selected=suite==='pooled'?rows:rows.filter(r=>r.suite===suite);
    return {suite,baseline:summarize(selected,'baseline'),candidate:summarize(selected,'candidate'),
      gained:selected.filter(r=>r.candidate.passed&&!r.baseline.passed).length,
      lost:selected.filter(r=>r.baseline.passed&&!r.candidate.passed).length};
  });
  console.log(JSON.stringify({judgeVersion,inputs,summary,rows},null,2));
}finally{rmSync(work,{recursive:true,force:true});}
