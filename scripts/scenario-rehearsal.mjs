import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const folder = mkdtempSync(join(tmpdir(),'forge-scenario-'));
const docs = join(folder,'docs');
const cli = (...args) => JSON.parse(execFileSync(process.execPath,['cli.mjs',...args],{encoding:'utf8'}));
const question = 'I lost my taxi receipt. Can I still claim the fare, who approves it, and when do I submit?';
const trials = [];
function compile(revision){
  const out = join(folder,revision);
  cli('forge','--brief','examples/scenario-review/brief.txt','--docs',docs,'--out',out,'--no-llm');
  return join(out,'definition.json');
}
function check(name, file, input, statuses){
  const result = cli('review-scenario',file,input);
  const {chunks} = JSON.parse(readFileSync(file));
  assert.deepEqual(result.parts.map(part=>part.status),statuses);
  for(const part of result.parts){
    if(part.status==='answered')assert.ok(part.citations.length);
    for(const citation of part.citations)assert.ok(chunks.some(c=>c.id===citation.id && c.text===citation.text && c.source===citation.source && JSON.stringify(c.section)===JSON.stringify(citation.section)));
  }
  trials.push({name,input,result});
  return result;
}
try{
  cpSync('examples/scenario-review/docs',docs,{recursive:true});
  const initial = compile('initial');
  const base = check('mixed support',initial,question,['answered','refused','answered']);
  assert.match(base.parts[0].text,/signed missing-receipt declaration/);
  assert.match(base.parts[2].text,/twelve calendar days/);
  check('different scenario',initial,question.replace('taxi','bus'),['refused','refused','refused']);
  check('extra condition',initial,question.replace('receipt.','receipt abroad.'),['refused','refused','refused']);
  check('other action',initial,question.replace('claim the fare','appeal the fine'),['refused','refused','refused']);
  check('no antecedent',initial,'I lost my taxi receipt. Who approves it?',['refused']);
  const file=join(docs,'filing.md');
  const original=readFileSync(file,'utf8');
  writeFileSync(file,original.replace('twelve','six'));
  assert.match(check('revised deadline',compile('revised'),question,['answered','refused','answered']).parts[2].text,/six calendar days/);
  writeFileSync(join(docs,'other.md'),original);
  assert.equal(check('conflicting deadlines',compile('conflict'),question,['answered','refused','clarify']).parts[2].citations.length,2);
  rmSync(file);
  rmSync(join(docs,'other.md'));
  check('filing policy withdrawn',compile('withdrawn'),question,['answered','refused','refused']);
  writeFileSync(file,original+'Exclusions: International travel requires separate review.\n');
  check('additional unmodeled restriction',compile('restricted'),question,['refused','refused','refused']);
  writeFileSync(file,'# Damaged access badge\n## Replace the badge\nEligibility: Bring the damaged badge to the desk.\nApprover: The access supervisor signs the replacement form.\n');
  const badge = check('different domain and explicit approver',compile('badge'),'Damaged access badge. Can I replace the badge, who approves it, and when do I submit?',['answered','answered','refused']);
  assert.match(badge.parts[1].text,/access supervisor/);
  console.log(JSON.stringify({kind:'Authored structured-policy regression', trials},null,2));
}finally{rmSync(folder,{recursive:true,force:true});}
