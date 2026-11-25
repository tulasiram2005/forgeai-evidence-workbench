import {readFile,readdir,writeFile,mkdir,mkdtemp,rename,rm,stat} from 'node:fs/promises';
import {resolve,join,relative,dirname,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {build,connectedAnswer,evaluate} from './public/engine.mjs';
import {enrich} from './model.mjs';

const [command,...args]=process.argv.slice(2);
const flag=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function documents(folder){
  const docs=[];let bytes=0;
  async function walk(dir){
    const entries=(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      const path=join(dir,entry.name);
      if(entry.isDirectory()){if(!entry.name.startsWith('.')) await walk(path);continue;}
      if(!entry.isFile()||!['.md','.txt','.csv','.pdf'].includes(extname(path).toLowerCase()))continue;
      const size=(await stat(path)).size; bytes+=size;
      if(docs.length>=32||bytes>16_000_000)throw Error('Input exceeds 32 files or 16 MB.');
      const text=/\.pdf$/i.test(path)?execFileSync('python3',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',path],{encoding:'utf8',timeout:20000,maxBuffer:1600000}):await readFile(path,'utf8');
      if(!text.trim()) throw Error('No readable text in '+entry.name);
      docs.push({name:relative(folder,path),text});
    }
  }
  await walk(folder);return docs;
}
async function main(){
  if(command==='review'){
    const {runReview}=await import('./public/review.mjs');
    const suite=await json(args[1]);
    const result=await runReview(await json(args[0]),Array.isArray(suite)?suite:suite.cases);
    console.log(JSON.stringify(result,null,2));
    if(result.passed!==result.total)process.exitCode=2;
    return;
  }
  if(command==='build'){
    const briefPath=flag('--brief'),folder=flag('--docs'),out=flag('--out');
    if(!briefPath||!folder||!out) throw Error('Use build --brief FILE --docs FOLDER --out NEW_FOLDER [--model] [--interview].');
    const brief=(await readFile(briefPath,'utf8')).trim(),docs=await documents(folder),opts={};
    if(args.includes('--interview')){
      const rl=createInterface({input:process.stdin,output:process.stdout});
      try{opts.audience=await rl.question('Who will use this agent? ');opts.tone=await rl.question('What tone should it use? ');}finally{rl.close();}
    }
    if(args.includes('--model')){
      opts.enrichment=await enrich(brief,docs);opts.model=process.env.FORGE_MODEL||'qwen2.5:1.5b';
    }
    const run=build(brief,docs,opts);
    const receipt={compiler:run.report.model,inputs:docs.map(d=>({source:d.name,sha256:createHash('sha256').update(d.text).digest('hex')})),enrichment:opts.enrichment||null};
    const target=resolve(out);await mkdir(dirname(target),{recursive:true});const tmp=await mkdtemp(join(dirname(target),'.forge-'));
    try{
      for(const [name,value] of Object.entries({...run,receipt})){
        await writeFile(join(tmp,name+'.json'),JSON.stringify(value,null,2)+'\n');
      }
      await rename(tmp,target);
    }finally{await rm(tmp,{recursive:true,force:true});}
    console.log(JSON.stringify({out,passed:run.report.passed,total:run.report.total,stop:run.report.stop,tools:run.definition.tools},null,2));
  }else if(command==='ask' && args[1]==='--semantic'){
    const {encode,semanticAnswer,answerQueries}=await import('./retrieval/hybrid.mjs');
    const def=await json(args[0]), q=args.slice(2).join(' ');
    const encoder=encode(def,answerQueries(q));
    console.log(JSON.stringify({...semanticAnswer(def,q,encoder),encoder:encoder.model},null,2));
  }else if(command==='ask'){
    console.log(JSON.stringify(await connectedAnswer(await json(args[0]),args.slice(1).join(' ')),null,2));
  }else if(command==='regression'){
    const results=evaluate(await json(args[0]),await json(args[1])),failures=results.filter(r=>!r.passed);
    console.log(JSON.stringify({passed:results.length-failures.length,total:results.length,failures},null,2));
    if(failures.length)process.exitCode=2;
  }else throw Error('Commands: build, ask, review, regression. See README.md for examples.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
