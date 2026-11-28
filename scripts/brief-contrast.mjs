// Exercise two generated definitions using identical documents and reviewer questions.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {browserAnswer} from '../public/browser-answer.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const input=join(root,'examples/brief-contrast');
const out=mkdtempSync(join(tmpdir(),'forge-contrast-'));
const cli=(...args)=>JSON.parse(execFileSync(process.execPath,['cli.mjs',...args],{cwd:root,encoding:'utf8'}));
const questions=[
  ['What is the pack for KL-028?','18','csv_lookup'],
  ['Calculate 18 * 3','54','calculator'],
  ['Give the source wording for Seal exception', 'Seal exception: A torn seal requires quarantine until the receiving lead signs the exception slip.'],
  ['What is the price for KL-028?']
];
const runs=[];
try{
  for(const name of ['procurement','audit']){
    const dir=join(out,name);
    cli('forge','--no-llm','--brief',join(input,name+'.txt'),'--docs',join(input,'docs'),'--out',dir);
    const file=join(dir,'definition.json');
    const def=JSON.parse(readFileSync(file));
    assert.deepEqual(def.tools,name==='audit'?[]:['csv_lookup','calculator']);
    const responses=[];
    for(const [question,value,tool] of questions){
      const expected=name==='audit' && tool ? undefined : value;
      const actual=cli('ask',file,question);
      assert.deepEqual(await browserAnswer(def,question),actual);
      assert.equal(actual.status,expected===undefined?'refused':'answered');
      if(expected!==undefined){
        assert.equal(actual.text,expected);
        assert.equal(actual.tool,tool);
        if(tool!=='calculator')assert.ok(actual.citations.some(c=>def.chunks.some(p=>p.source===c.source && p.text===c.text && p.id===c.id)));
      }
      responses.push({question,actual});
    }
    const receipt=JSON.parse(readFileSync(join(dir,'receipt.json')));
    runs.push({name,inputs:receipt.inputs,brief:def.requirements.scope,tools:def.tools,responses});
  }
  assert.deepEqual(runs[0].inputs,runs[1].inputs);
  console.log(JSON.stringify({kind:'Authored functional comparison',runs},null,2));
}finally{rmSync(out,{recursive:true,force:true});}
