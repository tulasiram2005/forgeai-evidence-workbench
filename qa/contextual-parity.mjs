import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  await page.goto(process.argv[2]);
  const results=[];
  for(const r of JSON.parse(fs.readFileSync('evidence/v2/contextual-parity-reference.json'))){
    const observed=await page.evaluate(async({brief,documents,questions})=>{
      const worker=new Worker('/compiler.worker.mjs',{type:'module'});
      try{
        const run=await new Promise((resolve,reject)=>{
          worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data.run);
          worker.onerror=e=>reject(Error(e.message));
          worker.postMessage({brief,documents,options:{contextualReview:true}});
        });
        const {contextualRunner}=await import('/browser-minilm.mjs');
        const runner=await contextualRunner(run.definition,questions.map(c=>c.question));
        return {split:run.report.splits,answers:questions.map(c=>runner(run.definition,c.question))};
      }finally{worker.terminate();}
    },r);
    assert.deepEqual(observed.split,r.split);
    for(const [i,response] of observed.answers.entries()){
      const {pointers,...core}=response;
      const {pointers:previous,...expected}=r.questions[i].expected;
      assert.deepEqual(core,expected);
      if(response.status==='refused'){
        assert.ok(pointers.length<=3);
        assert.ok(pointers.every(p=>p.text.includes(p.highlighted)));
      }
    }
    results.push({fixture:r.fixture,matched:r.questions.length,generatedSplitsMatched:true});
  }
  fs.mkdirSync('evidence/ui',{recursive:true});
  fs.writeFileSync('evidence/ui/contextual-parity.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser.close();}
