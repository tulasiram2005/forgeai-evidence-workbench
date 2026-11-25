// Human-readable probes outside the generated suite. The optimizer cannot see these.
import {readFile} from 'node:fs/promises';
import {answer} from './public/engine.mjs';
const probes=[
  ['shore','How much notice is needed for a shift swap?','answered','36 hours'],
  ['shore','What about payroll appeals?','refused',''],
  ['shore','How many days after I return can I submit travel expenses?','answered','14 calendar days'],
  ['shore','What about it?','clarify',''],
  ['conservation','What is the pack quantity for MAT102?','answered','24'],
  ['conservation','How much is the collection insured for?','refused',''],
  ['conservation','When do sealed crates need to get to the collection bay?','answered','15:30'],
  ['conservation','How much spacing does transit foam require?','answered','30 millimeter']
];
const results=[];
for(const [domain,question,status,fact] of probes){
  const def=JSON.parse(await readFile('evidence/'+domain+'/definition.json'));
  const actual=answer(def,question);
  results.push({domain,question,expected:{status,fact},actual,passed:actual.status===status&&actual.text.includes(fact)});
}
console.log(JSON.stringify({description:'Curated review probes, excluded from the optimization loop. Small illustrative sample.',passed:results.filter(x=>x.passed).length,total:results.length,results},null,2));
