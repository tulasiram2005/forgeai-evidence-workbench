import {pilot} from './forecast-pilot.mjs';
const stop=new Set('a an the how what why where when who which is are i my me can may we you do does should to from on at for of after in and or it this that did with must'.split(' '));
export function overlap(a,b){
 const words=s=>new Set((s.toLowerCase().match(/[a-z0-9]+/g)??[]).filter(w=>!stop.has(w)));
 const q=words(a),passage=words(b);
 return q.size?[...q].filter(w=>passage.has(w)).length/q.size:1;
}
export function describeRelease(run){
 const report=run.report;
 const observed=[...run.iterations[report.retainedRound-1].results,...(report.testResults??[])];
 const count=rs=>({passed:rs.filter(r=>r.passed).length,total:rs.length});
 const hard=count(observed.filter(r=>r.kind==='paraphrase-hard'));
 const easy=count(observed.filter(r=>r.kind!=='paraphrase-hard'));
 const qualified=pilot.qualified===true;
 const verdict=!qualified||report.judgeControls.some(r=>!r.rejected)?'DO NOT SHIP':easy.passed/easy.total>=.8&&hard.total&&hard.passed/hard.total>=.8?'SHIP':'SHIP WITH LIMITS';
 return {verdict,easy,hard,warning:easy.passed/easy.total>=.95&&hard.total&&hard.passed/hard.total<.6?'SATURATED EVAL':null,forecast:pilot.forecast,n:pilot.n,scope:pilot.metric};
}
