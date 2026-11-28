import fs from 'node:fs';
const load=p=>JSON.parse(fs.readFileSync(p));
const summary=load('evidence/funnel/summary.json').summary;
const cases=fs.readdirSync('evidence/funnel').filter(f=>/^holdout.*\.json$/.test(f)).flatMap(f=>load('evidence/funnel/'+f)).map(r=>({suite:r.suite,corpus:r.name,question:r.question,stage:r.loss??r.actual.status,rank:r.ranks.hybrid.allFactsByRank,oracle:r.oracle?.passed??null,actual:r.actual.status,forced:r.forced.map(f=>f.passed)}));
const fresh=load('evidence/holdout5/summary.json').filter(r=>r.name==='pooled');
fs.writeFileSync('public/runs/submission.json',JSON.stringify({summary,fresh,cases})+'\n');
