import fs from 'node:fs';
import {corpora,suites} from './reference-agents.mjs';
import {encode} from './hybrid.mjs';
const rows=[];
for(const suite of suites)for await(const {chunks,cases,name} of corpora(suite)){
  const questions=[...chunks.map(c=>({group:'generated',question:'What are the details for '+c.topic+'?'})),
    ...cases.filter(c=>c.kind==='paraphrase'&&c.status==='answered').map(c=>({group:'reviewer paraphrase',question:c.question}))];
  const encoder=encode({chunks},questions.map(c=>c.question),true);
  for(const c of questions)rows.push({suite,name,...c,topCosine:Math.max(...chunks.map(p=>encoder.score(c.question,p.id)))});
}
fs.writeFileSync('evidence/v2/calibration-shift.json',JSON.stringify(rows,null,2)+'\n');
const md=['# Calibration shift','','Each value is the largest MiniLM question-to-passage cosine in the corresponding source folder. Generated positives use the compiler’s topic-label template. The comparison uses the frozen development cases labeled paraphrase. Quartiles use nearest ranks.','','| Group | Questions | Lower quartile | Median | Upper quartile |','|---|---:|---:|---:|---:|'];
for(const [group,items] of Map.groupBy(rows,r=>r.group)){
  const values=items.map(c=>c.topCosine).sort((a,b)=>a-b);
  md.push('| '+[group,values.length,...[.25,.5,.75].map(q=>values[Math.ceil(values.length*q)-1].toFixed(3))].join(' | ')+' |');
}
md.push('','These distributions pool passages and questions from related corpora. The label-based generator often repeats passage wording. Its score distribution can overstate how separable naturally phrased questions will be. This descriptive comparison did not change any retrieval settings.','');
fs.writeFileSync('evidence/v2/calibration-shift.md',md.join('\n'));
