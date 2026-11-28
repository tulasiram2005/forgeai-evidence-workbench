import {chromium} from 'playwright-core';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const [phase,url]=process.argv.slice(2);
const browser=await chromium.launch({headless:true});
try{
const dir='evidence/ui/'+phase;
await mkdir(dir,{recursive:true});
const page=await browser.newPage();
const external=[];
await page.route('**/*',route=>{
  if(new URL(route.request().url()).origin!==new URL(url).origin){external.push(route.request().url());return route.abort();}
  return route.continue();
});
await page.addInitScript({path:new URL('./node_modules/axe-core/axe.min.js',import.meta.url).pathname});
await page.goto(url);
await page.waitForSelector('#score-meter button');
for(const width of [360,768,1280,1728]){
 await page.setViewportSize({width,height:880});
 await page.locator('#tab-evidence').click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:dir+'/'+width+'-overview.jpg',type:'jpeg',quality:70});
 for(const tab of ['evidence','runner','definition','review','impact']){
 await page.locator('#tab-'+tab).click();
 if(tab==='impact'){await page.locator('#impact-demo').click();await page.waitForFunction(()=>document.querySelector('#impact-status').textContent.includes('36'));await page.locator('#impact-results summary').first().click();}
 if(tab==='runner'){await page.fill('#query','How much notice is needed for a shift swap?');await page.click('#ask');await page.getByText('Test source dependency',{exact:true}).click();}
 await page.locator('#'+tab).evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.screenshot({path:dir+'/'+width+'-'+tab+'.jpg',type:'jpeg',quality:64});
 }
}
if(phase==='after'){
 const reports=[];

 for(const tab of ['evidence','runner','definition','review','impact']){
 await page.locator('#tab-'+tab).click();
 const violations=await page.evaluate(async()=> (await axe.run()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})));
 reports.push({tab,violations});
 }
 await page.click('#remove-step');
 await page.waitForSelector('#response h3');
 await page.click('#policy-step');
 await page.waitForFunction(()=>document.querySelector('#impact-status').textContent.includes('36'));
 const custom=await page.evaluate(async()=>{
   const worker=new Worker('/compiler.worker.mjs',{type:'module'});
   try{return await new Promise((resolve,reject)=>{
     worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve({runtime:data.run.definition.runtime.kind,verdict:data.run.report.assessment.verdict});
     worker.onerror=e=>reject(Error(e.message));
     worker.postMessage({brief:'Explain coat storage.',documents:[{name:'cloakroom.txt',text:'Coat storage: Use the maple wardrobe.'}]});
   });}finally{worker.terminate();}
 });
 if(custom.runtime!=='evidence-first'||custom.verdict!=='DO NOT SHIP')throw Error('Incorrect default release');
 await writeFile('evidence/ui/default-build.json',JSON.stringify(custom,null,2));
 await writeFile('evidence/ui/axe.json',JSON.stringify(reports,null,2));
 await writeFile('evidence/ui/external-requests.json',JSON.stringify(external));
 if(external.length||reports.some(r=>r.violations.length))throw Error('Accessibility or external request check failed');
}
}finally{await browser.close();}
