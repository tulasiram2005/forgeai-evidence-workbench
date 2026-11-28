import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright-core';

const url=process.argv[2];
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:360,height:800}});
  const external=[];
  page.on('request',request=>{
    if(request.url().startsWith('http') && new URL(request.url()).origin!==new URL(url).origin)external.push(request.url());
  });
  await page.goto(url);
  await page.locator('#new-run').click();
  await page.locator('#brief').fill(readFileSync('examples/repair-desk/brief.txt','utf8'));
  await page.locator('#files').setInputFiles(['stock.csv','handover.md'].map(file=>'examples/repair-desk/docs/'+file));
  await page.locator('#staged-list li').nth(1).waitFor();
  await page.locator('#compile').click();
  await page.locator('#builder').waitFor({state:'hidden'});
  await page.locator('#tab-runner').click();
  await page.locator('#query').fill('What is the drawer for BX-017?');
  await page.locator('#ask').click();
  await page.locator('#response').getByText('West, upper',{exact:true}).waitFor();
  await page.setViewportSize({width:1280,height:800});
  await page.locator('#query').fill('Who inspects worn seals on a Sunday?');
  await page.locator('#ask').click();
  await page.getByRole('button',{name:'Search passages by meaning'}).click();
  await page.getByRole('heading',{name:'Passages to inspect'}).waitFor({timeout:90000});
  const sources=await page.locator('#response blockquote strong').allTextContents();
  assert.equal(sources.length,3);
  assert.ok(sources.some(source=>source.includes('handover.md')));
  assert.deepEqual(external,[]);
  console.log(JSON.stringify({record:'West, upper',status:await page.locator('#response .kicker').first().textContent(),sources,external},null,2));
}finally{await browser.close();}
