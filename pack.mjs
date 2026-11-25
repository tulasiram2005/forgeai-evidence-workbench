// Materialize portable releases using the exact recorded model outputs.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from './public/engine.mjs';
for(const id of ['shore','conservation']){
  const dir='examples/'+id, evidence='evidence/'+id;
  const docs=await Promise.all((await readdir(dir+'/docs')).sort().map(async name=>({name,text:await readFile(dir+'/docs/'+name,'utf8')})));
  const receipt=JSON.parse(await readFile(evidence+'/receipt.json','utf8'));
  assert.deepEqual(receipt.inputs,docs.map(d=>({source:d.name,sha256:createHash('sha256').update(d.text).digest('hex')})));
  const run=build((await readFile(dir+'/brief.txt','utf8')).trim(),docs,{model:receipt.compiler,enrichment:receipt.enrichment});
  for(const [key,value] of Object.entries(run)) await writeFile(evidence+'/'+key+'.json',JSON.stringify(value,null,2)+'\n');
  await writeFile('public/runs/'+id+'.json',JSON.stringify(run));
  console.log(id,run.report.passed,run.report.total,run.report.stop);
}
