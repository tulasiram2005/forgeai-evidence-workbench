import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdtemp,readdir,writeFile,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright-core';
const temp=await mkdtemp(join(tmpdir(),'forge-parity-'));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  await page.goto(process.argv[2]);
  const receipts=[];
  for(const fixture of ['examples/holdout/dispatch','examples/holdout3/optics']){
    const docs=await Promise.all((await readdir(fixture+'/docs')).sort().map(async name=>({name,text:await readFile(fixture+'/docs/'+name,'utf8')})));
    const brief=await readFile(fixture+'/brief.txt','utf8');
    const questions=JSON.parse(await readFile(fixture+'/cases.json')).map(c=>c.question);
    const out=join(temp,fixture.split('/').pop());
    execFileSync(process.execPath,['cli.mjs','build','--brief',fixture+'/brief.txt','--docs',fixture+'/docs','--out',out,'--gate-v2','--split-validation']);
    const node=questions.map(q=>JSON.parse(execFileSync(process.execPath,['cli.mjs','ask',out+'/definition.json',q],{encoding:'utf8'})));
    const web=await page.evaluate(async({brief,docs,questions})=>{
      const {loadGateModel}=await import('/static-encoder.mjs');
      const {answer}=await import('/engine.mjs');
      await loadGateModel();
      const worker=new Worker('/compiler.worker.mjs',{type:'module'});
      try{
        const run=await new Promise((resolve,reject)=>{
          worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data.run);
          worker.onerror=e=>reject(Error(e.message));
          worker.postMessage({brief,documents:docs,options:{gateV2:true,splitValidation:true}});
        });
        return questions.map(q=>answer(run.definition,q));
      }finally{worker.terminate();}
    },{brief,docs,questions});
    assert.deepEqual(web,node);
    receipts.push({fixture,matched:questions.length,questions});
  }
  await mkdir('evidence/ui',{recursive:true});
  await writeFile('evidence/ui/gate-parity.json',JSON.stringify(receipts,null,2));
}finally{await browser.close();await rm(temp,{recursive:true,force:true});}
