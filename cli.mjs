import {strictAnswer} from './public/evidence-first.mjs';
import {ollamaPort} from './model.mjs';
import {readFile,readdir,writeFile,mkdir,mkdtemp,rename,rm,stat} from 'node:fs/promises';
import {resolve,join,relative,dirname,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {answer,connectedAnswer,evaluate,inspectRequirements} from './public/engine.mjs';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';

const [command,...args]=process.argv.slice(2);
const flag=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const json=async p=>JSON.parse(await readFile(p,'utf8'));
import {readDocuments} from './documents.mjs';
const documents=folder=>readDocuments(folder,command==='forge'||args.includes('--structured'));
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
  if(def.runtime?.kind==='evidence-first')return strictAnswer(def,query);
  if(def.retrieval?.gate){
    const {loadLocalGate,crossScores}=await import('./retrieval/local-gate.mjs');
    await loadLocalGate();
    if(def.retrieval.gate.reranker)return answer(def,query,undefined,crossScores(def,[query]));
  }
  if(def.runtime?.kind==='contextual-minilm'){
    const {prepareRunner}=await import('./retrieval/release-runner.mjs');
    return prepareRunner(def,[{question:query}])(def,query);
  }
  if(def.runtime?.kind==='local-evidence-selector')return (await import('./tournament.mjs')).modelAnswer(def,query);
  return connectedAnswer(def,query);
}
async function main(){
  if(command==='scope'){
    const {scopeReview}=await import('./scope-review.mjs');
    const def=await json(args[0]),topics=args.slice(1).filter(a=>a!=='--semantic');
    if(!topics.length || topics.length>64 || topics.some(t=>!t.trim()||t.length>300))throw Error('Supply 1–64 topics of up to 300 characters.');
    const encoder=args.includes('--semantic')?(await import('./retrieval/hybrid.mjs')).encode(def,topics):null;
    console.log(JSON.stringify(scopeReview(def,topics,encoder),null,2));return;
  }
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
  if(command==='diagnose-second'){
    const {diagnoseSecond}=await import('./retrieval/diagnose-second.mjs');
    console.log(JSON.stringify(await diagnoseSecond(args[0],documents),null,2));return;
  }
  if(command==='diagnose'){
    const {diagnose}=await import('./retrieval/diagnose.mjs');
    console.log(JSON.stringify(await diagnose(args[0],documents),null,2));
    return;
  }
  if(command==='holdout'){
    const {holdout}=await import('./holdout.mjs');
    console.log(JSON.stringify(await holdout(args[0],documents,{splitValidation:args.includes('--split-validation'),staticContext:args.includes('--static-context'),experimentalDense:args.includes('--experimental-dense'),gateV2:args.includes('--gate-v2')||args.includes('--rerank'),cliRerank:args.includes('--rerank'),contextual:args.includes('--contextual')||args.includes('--expand-index')||args.includes('--gate-v2')||args.includes('--rerank'),expandIndex:args.includes('--expand-index')}),null,2));
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
    const brief=(await readFile(briefPath,'utf8')).trim(),docs=await documents(folder),opts={splitValidation:args.includes('--split-validation'),gateV2:args.includes('--gate-v2')||args.includes('--rerank'),cliRerank:args.includes('--rerank'),contextual:args.includes('--contextual')||args.includes('--expand-index')||args.includes('--gate-v2')||args.includes('--rerank'),expandIndex:args.includes('--expand-index')};
    if(command==='forge'){
      Object.assign(opts,{evidenceFirst:!opts.gateV2 && !opts.expandIndex && !args.includes('--contextual-review'),autoDetect:!args.includes('--model'),release:true,contextual:true,splitValidation:true});
      for(const old of ['--structured','--split-validation','--contextual'])if(args.includes(old))console.error('Deprecated '+old+' is already enabled.');
    }
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
        const response=await fetch('http://127.0.0.1:'+ollamaPort()+'/api/tags',{signal:AbortSignal.timeout(900)});
        if(response.ok && (await response.json()).models.some(m=>m.name===requested)) model=requested;
      }catch{ /* The portable compiler works without Ollama. */ }
    }
    if(command==='forge')console.error(model?'Local model: '+model:'DEGRADED: local model unavailable or explicitly disabled. Using deterministic templates.');
    if(opts.expandIndex)console.error('Generating ranking metadata with the local model.');
    const target=resolve(out);await mkdir(dirname(target),{recursive:true});const tmp=await mkdtemp(join(dirname(target),'.forge-'));
    try{
      opts.commitPath=join(tmp,'test-slice.json');
    const start=performance.now();
    const {run,enrichment}=await runBuild({brief,docs,opts,model},budgetMs);
    if(run.report.degraded)console.error('DEGRADED: '+run.report.degraded+'. Using deterministic templates.');
    if(opts.release && !opts.gateV2)run.definition.runtime={kind:opts.evidenceFirst?'evidence-first':'contextual-minilm'};
    run.report.budget={limitMs:budgetMs,elapsedMs:Math.round(performance.now()-start),scope:'model generation, compilation and optimization after intake'};
    const receipt={compiler:run.report.model,inputs:docs.map(d=>({source:d.name,sha256:createHash('sha256').update(d.text).digest('hex')})),enrichment,...(opts.approvedRequirements?{requirementsApproved:true}:{})};
      for(const [name,value] of Object.entries({...run,receipt})){
        await writeFile(join(tmp,name+'.json'),JSON.stringify(value,null,2)+'\n');
      }
      const lines=['# Build review','',run.report.model,'', '## Evaluation rounds','',
        ...run.iterations.map(r=>'- Round '+r.round+' · '+r.passed+'/'+r.total+(r.accepted===undefined?'':' · tuning '+r.tuning+'/'+(r.total-run.report.validationIds.length)+' · validation '+r.validation+'/'+run.report.validationIds.length+' · '+(r.accepted?'accepted':'rejected'))),
        '', 'Released round '+run.report.retainedRound+'. '+run.report.stop+'.','','## Judge controls','',
        ...run.report.judgeControls.map(c=>'- '+c.name+' · '+(c.rejected?'rejected':'accepted')),
        '', '## Results by class','',
        ...Object.entries(Object.groupBy(run.iterations[run.report.retainedRound-1].results,r=>r.kind)).map(([kind,rows])=>'- '+kind+' · '+rows.filter(r=>r.passed).length+'/'+rows.length),
        '', '## Refusal quality','',
        ...['refusalPrecision','requiredRefusals'].map(key=>{const m=run.report.metrics[key];return '- '+(key==='refusalPrecision'?'Precision':'Recall')+' · '+(m.total?m.matched+'/'+m.total:'No eligible cases');}),
        '', '## Remaining failures','',...run.report.failures.map(r=>'- '+r.id+' · '+r.category+' · '+r.question),
        ...(run.report.failures.length?[]:['All generated checks passed.']), '', '## Limits','',...run.report.limitations,''];
      if(run.report.splits)lines.push('## Frozen split scores','',...Object.entries(run.report.splits).map(([name,m])=>name+' '+m.passed+'/'+m.total+' (95% Wilson '+(100*m.lower).toFixed(1)+'% to '+(100*m.upper).toFixed(1)+'%)'),'','Test slice SHA-256 '+run.report.commitment.sha256,'');
      if(run.report.assessment){
        const a=run.report.assessment;
        lines.push('## Release verdict','',a.verdict+' for autonomous answering.','',
          'Easy tier '+a.easy.passed+'/'+a.easy.total+'. Hard model paraphrases '+(a.hard.total?a.hard.passed+'/'+a.hard.total:'unmeasured')+'.',
          ...(a.warning?[a.warning]:[]),'','Evidence-first forecast for overall case pass '+(100*a.forecast).toFixed(1)+'%, retrospective pilot n='+a.n+'. Includes correct refusals and clarifications.','');
      }
      await writeFile(join(tmp,'FINAL.md'),lines.join('\n'));
      await rename(tmp,target);
    console.log(JSON.stringify({out,passed:run.report.passed,total:run.report.total,stop:run.report.stop,tools:run.definition.tools},null,2));
    }finally{await rm(tmp,{recursive:true,force:true});}
  }else if(command==='ask' && args[1]==='--compose'){
    const {compose}=await import('./compose.mjs');
    console.log(JSON.stringify(await compose(await json(args[0]),args.slice(2).join(' ')),null,2));
  }else if(command==='ask' && ['--semantic','--experimental-dense','--contextual'].includes(args[1])){
    const {encode,semanticAnswer,answerQueries,experimentalAnswer,experimentQueries}=await import('./retrieval/hybrid.mjs');
    const def=await json(args[0]), q=args.slice(2).join(' ');
    if(def.runtime?.kind==='local-evidence-selector')throw Error('Use ask without --semantic to run the tournament prompt.');
    const experimental=args[1]!=='--semantic';
    const encoder=encode(def,experimental?experimentQueries(q):answerQueries(q),args[1]==='--contextual');
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
