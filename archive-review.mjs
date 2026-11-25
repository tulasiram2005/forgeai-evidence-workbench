// Fixed challenge for the released runtime; the optimizer never receives these cases.
import {build,answer} from './public/engine.mjs';
const docs=[
  {name:'boxes.csv',text:'code,collection,box_count\nARC101,Maps,12\nARC102,Prints,18'},
  {name:'access.txt',text:'Reader access: Bring the booking confirmation to the reading room.\nCopy fee: The photograph collection costs 4 credits per copy.\nLocker hours: Lockers close at 17:00.'},
  {name:'notice.txt',text:'Locker hours: Lockers close at 19:00.'}
];
const brief='Look up inventory records and calculate totals, but never use live weather.';
const def=build(brief,docs).definition;
const checks=[
 ['existing catalogue record','What is the box count for ARC102?','answered','18','boxes.csv'],
 ['missing catalogue record','What is the box count for ARC999?','refused'],
 ['conflicting source values','What are the locker hours?','clarify'],
 ['scoped calculation','Calculate 6 * 7','answered','42'],
 ['division by zero','Calculate 6 / 0','refused'],
 ['known access rule','What is reader access?','answered','booking confirmation','access.txt'],
 ['unsupported attribute','What is the valuation for ARC101?','refused'],
 ['unrelated subject','What is the orbital period of Neptune?','refused'],
 ['underspecified reference','Which one?','clarify'],
 ['forbidden tool','weather 12,77','refused']
];
const results=checks.map(([name,question,status,fact,source])=>{
 const result=answer(def,question);
 const passed=result.status===status && (!fact||result.text.includes(fact)) && (!source||result.citations.some(c=>c.source===source));
 return {name,question,expected:{status,fact,source},actual:result,passed};
});
const permissions=JSON.stringify(def.tools)===JSON.stringify(['csv_lookup','calculator']);
console.log(JSON.stringify({tools:def.tools,permissions,passed:results.filter(r=>r.passed).length+Number(permissions),total:results.length+1,results},null,2));
if(!permissions || results.some(r=>!r.passed))process.exitCode=1;
