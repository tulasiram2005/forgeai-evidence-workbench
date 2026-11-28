// Exercise production intake and dispatch against caller-owned files.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,cpSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserAnswer} from '../public/browser-answer.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const folder=mkdtempSync(join(tmpdir(),'forge-repair-'));
const docs=join(folder,'docs');
const cli=(...args)=>execFileSync(process.execPath,['cli.mjs',...args],{cwd:root,encoding:'utf8'});
const results=[];
function compile(revision){
  const out=join(folder,revision);
  cli('forge','--no-llm','--brief','examples/repair-desk/brief.txt','--docs',docs,'--out',out);
  return join(out,'definition.json');
}
async function check(file,question,status,value){
  const def=JSON.parse(readFileSync(file));
  const response=JSON.parse(cli('ask',file,question));
  assert.deepEqual(await browserAnswer(def,question),response);
  assert.equal(response.status,status,question);
  if(value!==undefined)assert.equal(response.text,value);
  if(status==='answered')assert.ok(response.citations.length);
  if(status==='refused')assert.deepEqual(response.citations,[]);
  for(const cite of response.citations){
    const chunk=def.chunks.find(c=>c.id===cite.id && c.source===cite.source);
    assert.equal(cite.text,chunk?.text);
  }
  results.push({question,...response});
}
try{
  cpSync(join(root,'examples/repair-desk/docs'),docs,{recursive:true});
  const initial=compile('initial');
  await check(initial,'What is the drawer for BX-017?','answered','West, upper');
  await check(initial,'Show me the finish for bx-0170','answered','polished');
  await check(initial,'What is the drawer for BX-044?','clarify');
  await check(initial,'What is the drawer for BX-028?','refused');
  await check(initial,'What is the drawer for BX-01?','refused');
  await check(initial,'What is the price for BX-017?','refused');
  await check(initial,'What is the drawer and price for BX-017?','refused');
  await check(initial,'Give the source wording for Seal check','answered','Seal check: Place inspected seals on the green tray before closing the desk.');
  const stock=join(docs,'stock.csv');
  writeFileSync(stock,readFileSync(stock,'utf8').replace('"West, upper"','Vault'));
  await check(compile('relocated'),'What is the drawer for BX-017?','answered','Vault');
  rmSync(stock);
  await check(compile('withdrawn'),'What is the drawer for BX-017?','refused');
  console.log(JSON.stringify({study:'Authored functional regression, not a blind evaluation',passed:results.length,results},null,2));
}finally{rmSync(folder,{recursive:true,force:true});}
