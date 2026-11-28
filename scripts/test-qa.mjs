import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {corpora,suites} from '../retrieval/reference-agents.mjs';
import {stressVerdict} from '../retrieval/stress-judge.mjs';
import {withPointers} from '../public/engine.mjs';
import {metrics} from '../retrieval/diagnose.mjs';
import {encode,candidates} from '../retrieval/hybrid.mjs';
const rows=[];
function typeOK(q,quote){
 const types=[[/how (long|soon|quickly)|how much time/i,/\b(hours?|minutes?|days?|weeks?|seconds?|months?|years?)\b/i],
 [/how (many|much money)|cost|price/i,/\d|one|two|three|four|five|six|seven|eight|nine|ten/i],
 [/what colou?r|which colou?r/i,/^[a-z]+$/i],[/what time|when does/i,/\d|noon|midnight|day/i],
 [/^who|^whose/i,/[a-z]{3}/i]];
 return types.every(([query,valid])=>!query.test(q)||valid.test(quote));
}
for(const suite of suites)for await(const {chunks,cases,name} of corpora(suite)){
 const traces=JSON.parse(fs.readFileSync('evidence/funnel/'+suite+'-'+name+'.json'));
 const extras=cases.filter(c=>!traces.some(t=>t.question===c.question));
 const encoder=extras.length?encode({chunks},extras.map(c=>c.question),true):null;
 const inputs=[],jobs=[];
 for(const entry of cases){
   const trace=traces.find(r=>r.question===entry.question);
   const passages=trace?trace.ranks.hybrid.top.slice(0,3).map(id=>chunks.find(c=>c.id===id)):candidates(chunks,entry.question,encoder).slice(0,3).map(r=>r.c);
   const offset=inputs.length;
   inputs.push(...passages.map(p=>({question:entry.question,text:p.text})));
   jobs.push({entry,offset,passages});
 }
 const outputs=JSON.parse(execFileSync('python3',['retrieval/qa-reader.py'],{encoding:'utf8',input:JSON.stringify(inputs)}));
 for(const {entry,offset,passages} of jobs){
   const trials=outputs.slice(offset,offset+3).map((r,i)=>({...r,p:passages[i]})).sort((a,b)=>b.margin-a.margin);
   const best=trials[0],accept=best.margin>0&&best.quote.trim()&&best.p.text.includes(best.quote)&&typeOK(entry.question,best.quote);
   const actual=accept?{status:'answered',text:best.quote,citations:[best.p]}:withPointers({status:'refused',text:'The source does not establish an answer.',citations:[]},chunks,entry.question);
   rows.push({suite,name,...entry,actual,margin:best.margin,passed:stressVerdict(entry,actual,chunks)});
 }
}
const report=metrics(rows);
const rate=m=>m.count/m.total;
fs.writeFileSync('evidence/funnel/qa-study.json',JSON.stringify({model:'deepset/minilm-uncased-squad2',revision:'934656cdda79824eabf503ed56e15c01ddbdbe3f',license:'CC-BY-4.0',balancedAccuracy:(rate(report.answerableRecall)+rate(report.refusalRecall))/2,report,rows},null,2)+'\n');
