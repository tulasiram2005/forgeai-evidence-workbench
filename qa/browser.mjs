import {chromium} from 'playwright-core';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const [phase,url]=process.argv.slice(2);
const browser=await chromium.launch({headless:true});
try{
const dir='evidence/ui/'+phase;
await mkdir(dir,{recursive:true});
const page=await browser.newPage({bypassCSP:true});
await page.goto(url);
await page.waitForSelector('#score-meter button');
for(const width of [360,768,1280,1728]){
 await page.setViewportSize({width,height:880});
 for(const tab of ['evidence','runner','definition','review','impact']){
 await page.locator('#tab-'+tab).click();
 if(tab==='impact'){await page.locator('#impact-demo').click();await page.waitForFunction(()=>document.querySelector('#impact-status').textContent.includes('36'));await page.locator('#impact-results summary').first().click();}
 if(tab==='runner'){await page.fill('#query','How much notice is needed for a shift swap?');await page.click('#ask');await page.getByText('Test source dependency',{exact:true}).click();}
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:dir+'/'+width+'-'+tab+'.jpg',type:'jpeg',quality:64});
 }
}
if(phase==='after'){
 const reports=[];
 await page.addScriptTag({content:await readFile(new URL('./node_modules/axe-core/axe.min.js',import.meta.url),'utf8')});
 for(const tab of ['evidence','runner','definition','review','impact']){
 await page.locator('#tab-'+tab).click();
 const violations=await page.evaluate(async()=> (await axe.run()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})));
 reports.push({tab,violations});
 }
 await writeFile('evidence/ui/axe.json',JSON.stringify(reports,null,2));
}
}finally{await browser.close();}
