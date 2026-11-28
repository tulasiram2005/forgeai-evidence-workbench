import fs from 'node:fs';
import {readDocuments} from '../documents.mjs';
import {prepareRunner} from '../retrieval/release-runner.mjs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const records=[];
for(const fixture of ['examples/holdout/dispatch','examples/holdout3/optics']){
  const temp=fs.mkdtempSync(join(tmpdir(),'forge-web-reference-'));
  try{
    const out=join(temp,'run');
    execFileSync(process.execPath,['cli.mjs','forge','--brief',fixture+'/brief.txt','--docs',fixture+'/docs','--out',out,'--deterministic','--contextual-review']);
    const definition=JSON.parse(fs.readFileSync(out+'/definition.json'));
    const cases=JSON.parse(fs.readFileSync(fixture+'/cases.json'));
    const run=prepareRunner(definition,cases);
    records.push({fixture,brief:fs.readFileSync(fixture+'/brief.txt','utf8').trim(),documents:await readDocuments(fixture+'/docs'),
      split:JSON.parse(fs.readFileSync(out+'/report.json')).splits,questions:cases.map(c=>({question:c.question,expected:run(definition,c.question)}))});
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
fs.writeFileSync('evidence/v2/contextual-parity-reference.json',JSON.stringify(records,null,2)+'\n');
