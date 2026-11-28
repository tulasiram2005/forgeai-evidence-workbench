import {readFile,readdir,writeFile,mkdir,mkdtemp,rename,rm,stat} from 'node:fs/promises';
import {resolve,join,relative,dirname,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {connectedAnswer,evaluate,inspectRequirements} from './public/engine.mjs';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';

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
      if(!entry.isFile()||!['.md','.txt','.csv','.pdf',...(args.includes('--structured')?['.docx']:[])].includes(extname(path).toLowerCase()))continue;
      const size=(await stat(path)).size; bytes+=size;
      if(docs.length>=32||bytes>16_000_000)throw Error('Input exceeds 32 files or 16 MB.');
      if(args.includes('--structured') && /\.(pdf|docx)$/i.test(path)){
        const parsed=JSON.parse(execFileSync('python3',[fileURLToPath(new URL('./read-document.py',import.meta.url)),path],{encoding:'utf8',timeout:20000,maxBuffer:4000000}));
        if(!parsed.text.trim())throw Error('No readable text in '+entry.name);
        docs.push({name:relative(folder,path),...parsed});
        continue;
      }
      const text=/\.pdf$/i.test(path)?execFileSync('python3',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',path],{encoding:'utf8',timeout:20000,maxBuffer:1600000}):await readFile(path,'utf8');
      if(!text.trim()) throw Error('No readable text in '+entry.name);
      docs.push({name:relative(folder,path),text});
    }
  }
  await walk(folder);return docs;
}
async function runBuild(workerData,budgetMs){
  if(!Number.isInteger(budgetMs)||budgetMs<1||budgetMs>1800000)throw Error('Budget must be 1–1,800,000 milliseconds.');
  const worker=new Worker(new URL('./build-worker.mjs',import.meta.url),{workerData});
  let timer;
  try{
    return await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('Build latency budget exhausted before release.')),budgetMs);
      worker.once('message',resolve);
      worker.once('error',reject);
      worker.once('exit',code=>reject(Error('Build worker exited before release ('+code+').')));
    });
  }finally{clearTimeout(timer);await worker.terminate();}
}
async function runtimeAnswer(def,query){
  if(def.runtime?.kind==='local-evidence-selector')return (await import('./tournament.mjs')).modelAnswer(def,query);
  return connectedAnswer(def,query);
}
async function main(){
  if(command==='rescore'){
    const {factVerdict}=await import('./fact-judge.mjs');
    const [def,cases]=await Promise.all(args.slice(0,2).map(json));
    const scores=[];
    for(const entry of cases){
      const actual=await runtimeAnswer(def,entry.question);
      const old=evaluate(def,[entry],()=>actual)[0].passed;
      scores.push({id:entry.id,previous:old,...factVerdict(def,entry,actual)});
    }
    console.log(JSON.stringify({total:scores.length,original:scores.filter(r=>r.previous).length,
      factBased:scores.filter(r=>r.passed).length,flips:scores.filter(r=>r.previous!==r.passed),scores},null,2));
    return;
  }
  if(command==='holdout'){
    const {holdout}=await import('./holdout.mjs');
    console.log(JSON.stringify(await holdout(args[0],documents,{splitValidation:args.includes('--split-validation'),experimentalDense:args.includes('--experimental-dense')}),null,2));
    return;
  }
  if(command==='impact'){
    const {compareReleases}=await import('./public/impact.mjs');
    const [before,after,suite]=await Promise.all(args.slice(0,3).map(json));
    console.log(JSON.stringify(await compareReleases(before.definition??before,after.definition??after,suite.evals??suite,runtimeAnswer),null,2));
    return;
  }
  if(command==='review'){
    const {runReview}=await import('./public/review.mjs');
    const suite=await json(args[1]);
    const result=await runReview(await json(args[0]),Array.isArray(suite)?suite:suite.cases,runtimeAnswer);
    console.log(JSON.stringify(result,null,2));
    if(result.passed!==result.total)process.exitCode=2;
    return;
  }
  if(command==='audit'){
    const {auditSources}=await import('./public/source-audit.mjs');
    const result=await auditSources(await json(args[0]),args.slice(1).join(' '),runtimeAnswer);
    console.log(JSON.stringify(result,null,2));
    return;
  }
  if(command==='verify'){
    const def=await json(args[0]);
    const query=args.slice(1).join(' ').trim();
    if(!query || query.length>2000)throw Error('Supply a question of up to 2,000 characters.');
    // Keep noun pairs intact. Split explicit requests or clauses with a fresh interrogative.
    const parts=query.split(/(?:[,;]?\s+and(?:\s+also)?\s+(?=(?:what|which|when|where|who|how|why|does|do|can|is|are)\b)|\?\s+(?=\S))/i);
    const findings=[];
    for(const part of parts){
      const question=part.trim(),actual=await runtimeAnswer(def,question);
      findings.push({question,...actual});
    }
    const complete=findings.every(f=>f.status==='answered');
    console.log(JSON.stringify({complete,parts:findings},null,2));
    if(!complete)process.exitCode=2;
    return;
  }
  if(command==='tournament'){
    const {tournament}=await import('./tournament.mjs');
    const [definitionFile,suiteFile,out]=args;
    if(!out)throw Error('Use tournament DEFINITION EVALS NEW_DIRECTORY [--budget-ms N].');
    const result=await tournament(await json(definitionFile),await json(suiteFile),Number(flag('--budget-ms')??180000),process.env.FORGE_MODEL||'qwen2.5:1.5b');
    await mkdir(out);
    await writeFile(join(out,'comparison.json'),JSON.stringify(result.report,null,2)+'\n');
    if(result.definition)await writeFile(join(out,'definition.json'),JSON.stringify(result.definition,null,2)+'\n');
    console.log(JSON.stringify({winner:result.report.winner,stop:result.report.stop,scores:result.report.candidates.map(c=>[c.passed,c.results.length])}));
    if(!result.definition)process.exitCode=2;
    return;
  }
  if(command==='build' || command==='forge'){
    const briefPath=flag('--brief'),folder=flag('--docs'),out=flag('--out');
    if(!briefPath||!folder||!out) throw Error('Use build --brief FILE --docs FOLDER --out NEW_FOLDER [--model] [--interview].');
    const brief=(await readFile(briefPath,'utf8')).trim(),docs=await documents(folder),opts={splitValidation:args.includes('--split-validation')};
    if(args.includes('--interview')){
      const rl=createInterface({input:process.stdin,output:process.stdout});
      try{opts.audience=await rl.question('Who will use this agent? ');opts.tone=await rl.question('What tone should it use? ');}finally{rl.close();}
    }
    if(args.includes('--checkpoint')){
      const draft=inspectRequirements(brief,docs,opts);
      console.log(JSON.stringify(draft,null,2));
      const rl=createInterface({input:process.stdin,output:process.stdout});
      try{
        const confirmation=await rl.question('Approve these requirements before generation? Type APPROVE to proceed: ');
        if(confirmation.trim()!=='APPROVE')throw Error('Build cancelled before generation.');
      }finally{rl.close();}
      opts.approvedRequirements=draft;
    }
    const budgetMs=Number(flag('--budget-ms')??180000);
    const requested=process.env.FORGE_MODEL||'qwen2.5:1.5b';
    let model=args.includes('--model')?requested:null;
    if(command==='forge' && !model && !args.includes('--deterministic')){
      try{
        const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(900)});
        if(response.ok && (await response.json()).models.some(m=>m.name===requested)) model=requested;
      }catch{ /* The portable compiler works without Ollama. */ }
    }
    if(command==='forge')console.error(model?'Local model: '+model:'Using deterministic compiler. No model inference requested or available.');
    const start=performance.now();
    const {run,enrichment}=await runBuild({brief,docs,opts,model},budgetMs);
    run.report.budget={limitMs:budgetMs,elapsedMs:Math.round(performance.now()-start),scope:'model generation, compilation and optimization after intake'};
    const receipt={compiler:run.report.model,inputs:docs.map(d=>({source:d.name,sha256:createHash('sha256').update(d.text).digest('hex')})),enrichment,...(opts.approvedRequirements?{requirementsApproved:true}:{})};
    const target=resolve(out);await mkdir(dirname(target),{recursive:true});const tmp=await mkdtemp(join(dirname(target),'.forge-'));
    try{
      for(const [name,value] of Object.entries({...run,receipt})){
        await writeFile(join(tmp,name+'.json'),JSON.stringify(value,null,2)+'\n');
      }
      const lines=['# Build review','',run.report.model,'', '## Evaluation rounds','',
        ...run.iterations.map(r=>'- Round '+r.round+' · '+r.passed+'/'+r.total+(r.accepted===undefined?'':' · tuning '+r.tuning+'/'+(r.total-run.report.validationIds.length)+' · validation '+r.validation+'/'+run.report.validationIds.length+' · '+(r.accepted?'accepted':'rejected'))),
        '', 'Released round '+run.report.retainedRound+'. '+run.report.stop+'.','','## Judge controls','',
        ...run.report.judgeControls.map(c=>'- '+c.name+' · '+(c.rejected?'rejected':'accepted')),
        '', '## Remaining failures','',...run.report.failures.map(r=>'- '+r.id+' · '+r.category+' · '+r.question),
        ...(run.report.failures.length?[]:['All generated checks passed.']), '', '## Limits','',...run.report.limitations,''];
      await writeFile(join(tmp,'FINAL.md'),lines.join('\n'));
      await rename(tmp,target);
    }finally{await rm(tmp,{recursive:true,force:true});}
    console.log(JSON.stringify({out,passed:run.report.passed,total:run.report.total,stop:run.report.stop,tools:run.definition.tools},null,2));
  }else if(command==='ask' && args[1]==='--compose'){
    const {compose}=await import('./compose.mjs');
    console.log(JSON.stringify(await compose(await json(args[0]),args.slice(2).join(' ')),null,2));
  }else if(command==='ask' && ['--semantic','--experimental-dense'].includes(args[1])){
    const {encode,semanticAnswer,answerQueries,experimentalAnswer,experimentQueries}=await import('./retrieval/hybrid.mjs');
    const def=await json(args[0]), q=args.slice(2).join(' ');
    if(def.runtime?.kind==='local-evidence-selector')throw Error('Use ask without --semantic to run the tournament prompt.');
    const experimental=args[1]==='--experimental-dense';
    const encoder=encode(def,experimental?experimentQueries(q):answerQueries(q));
    console.log(JSON.stringify({...(experimental?experimentalAnswer:semanticAnswer)(def,q,encoder),encoder:encoder.model},null,2));
  }else if(command==='ask'){
    const def=await json(args[0]),question=args.slice(1).join(' ');
    const response=await runtimeAnswer(def,question);
    console.log(JSON.stringify(response,null,2));
  }else if(command==='regression'){
    const def=await json(args[0]),cases=await json(args[1]),results=[];
    for(const c of cases){
      const observed=await runtimeAnswer(def,c.question);
      results.push(...evaluate(def,[c],()=>observed));
    }
    const failures=results.filter(r=>!r.passed);
    console.log(JSON.stringify({passed:results.length-failures.length,total:results.length,failures},null,2));
    if(failures.length)process.exitCode=2;
  }else throw Error('Commands: build, ask, impact, audit, verify, review, regression, tournament. See README.md for examples.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
