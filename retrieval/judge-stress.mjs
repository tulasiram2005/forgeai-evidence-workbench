import fs from 'node:fs';
import assert from 'node:assert/strict';
import {suites,corpora,refuse,topOne} from './reference-agents.mjs';
import {stressVerdict,judgeVersion,numberWords} from './stress-judge.mjs';

const bounds=JSON.parse(fs.readFileSync('evidence/prereg/judge-controls.json'));
const results=[];
const entries=process.argv.slice(2);
for(const suite of entries.length?entries:suites){
  const scores={},changes={},events=[],casesSeen=[];
  for await(const {chunks,cases,name} of corpora(suite)){
    for(const c of cases){
      casesSeen.push(c);
      const citations=(c.facts??[]).map((f,i)=>{
        const p=chunks.find(p=>p.source===c.sources[i] && p.text.toLowerCase().includes(f.toLowerCase()));
        assert.ok(p,'missing source fact '+f);return p;
      });
      const oracle={status:c.status,text:(c.facts??[]).join(' '),citations};
      const top=topOne(chunks,c.question);
      const controls={alwaysRefuse:refuse(),alwaysAnswerTop1:top,fabricateNumber:{...top,text:top.text+' 987643'},
        citeWrongSource:{...top,citations:top.citations.map(p=>({...p,source:'wrong/'+p.source}))},
        copyQuestion:{...top,text:c.question,citations:[]},oracle};
      for(const [key,a] of Object.entries(controls))scores[key]=(scores[key]??0)+Number(stressVerdict(c,a,chunks));
      if(c.status!=='answered'||!stressVerdict(c,oracle,chunks))continue;
      const paths={holdout:'experiments/first/normalized',holdout2:'experiments/second/normalized',holdout3:'holdout3/frozen',holdout4:'holdout4/frozen'};
      const path='evidence/v2/'+paths[suite]+'/'+name+'.json';
      const observed=fs.existsSync(path)?JSON.parse(fs.readFileSync(path)).results.find(r=>r.question===c.question)?.actual:null;
      for(const [basis,response] of [['oracle',oracle],['contextual',observed]]){
      if(!response || !stressVerdict(c,response,chunks))continue;
      const trials=[
        ['number change',false,response.text.replace(/\d+/,v=>String(Number(v)+1))],
        ['appended claim',false,response.text+' Membership is transferable.'],
        ['triple padding',false,Array(3).fill(response.text).join(' ')],
        ['case',true,response.text.toUpperCase()],['whitespace',true,'  '+response.text.replaceAll(' ','   ')+'  '],
        ['punctuation',true,response.text+'!'],
        ['number words',true,response.text.replace(/\b\d{1,2}\b/g,(v,i,s)=>s[i-1]===':'||s[i+v.length]===':'?v:numberWords(Number(v)))],
        ['unit variants',true,response.text.replace(/\b(hours|minutes|seconds|millimeters|euros)\b/g,v=>({hours:'hrs',minutes:'mins',seconds:'secs',millimeters:'mm',euros:'EUR'})[v])],
        ['source swap',false,response.text,response.citations.map(p=>({...p,source:'wrong/'+p.source}))]];
      for(const [key,correct,text,quotes] of trials){
        if(text===response.text && !quotes)continue;
        const passed=stressVerdict(c,{...response,text,citations:quotes??response.citations},chunks);
        const m=changes[basis+' '+key]??={eligible:0,flips:0,correct};
        m.eligible++;m.flips+=Number(!passed);
        if(passed!==correct)events.push({name,question:c.question,key,text});
      }
      }
    }
  }
  const n=casesSeen.length,share=status=>casesSeen.filter(c=>c.status===status).length/n;
  for(const [agent,count] of Object.entries(scores)){
    const {floor=0,ceiling=1}=bounds[agent];
    const limit=typeof ceiling==='string'?share(agent==='alwaysRefuse'?'refused':'answered')+Number(ceiling.split(' + ')[1]):ceiling;
    assert.ok(count/n>=floor && count/n<=limit,agent+' breached on '+suite);
  }
  changes['date formats']??={eligible:0,flips:0,correct:true};
  const good=Object.values(changes).filter(v=>v.correct);
  results.push({suite,judgeVersion,total:n,scores,changes,correctParaphraseFalseFails:good.reduce((n,v)=>n+v.flips,0),correctParaphraseTrials:good.reduce((n,v)=>n+v.eligible,0),errors:events});
}
const date={id:'D1.1',source:'date.txt',text:'Window opens 2027-01-15'};
const c={status:'answered',facts:['2027-01-15'],sources:[date.source]};
for(const [text,expected] of [['15 January 2027',true],['16 January 2027',false]])assert.equal(stressVerdict(c,{status:'answered',text,citations:[date]},[date]),expected);
const rendered=JSON.stringify({dateFormatControl:'Equivalent and changed dates checked on a separate dated fixture.',results},null,2)+'\n';
if(process.env.WRITE_STRESS==='1')fs.writeFileSync('evidence/v2/judge-stress.json',rendered);
console.log(rendered);
assert.ok(results.every(r=>!r.errors.length),'Perturbation breach');
