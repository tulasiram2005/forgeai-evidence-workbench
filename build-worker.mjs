import {strictAnswer} from './public/evidence-first.mjs';
import {describeRelease} from './public/verdict.mjs';
import {parentPort,workerData} from 'node:worker_threads';
import {build,answer} from './public/engine.mjs';
import {enrich} from './model.mjs';

const {brief,docs,opts,model}=workerData;
if(model){
  const requested=process.env.FORGE_BACKEND;
  const backends=requested==='llama.cpp'?['llama.cpp']:opts.autoDetect?['ollama','llama.cpp']:['ollama'];
  const failures=[];
  for(const backend of backends){
    process.env.FORGE_BACKEND=backend;
    try{
      opts.enrichment=await enrich(brief,docs,20000);
      opts.model=model;
      opts.generationBackend=backend;
      break;
    }catch(error){
      failures.push(backend+': '+error.message);
      if(!opts.autoDetect)throw error;
    }
  }
  if(failures.length)opts.degraded=failures.join(' / ')+'. Selected '+(opts.generationBackend??'deterministic templates')+'.';
}
if(opts.release && opts.enrichment){
  try{
    const {hardQuestions}=await import('./retrieval/hard-questions.mjs');
    for(const q of await hardQuestions(docs,model)){
      if(!opts.enrichment.questions.some(existing=>existing.question===q.question))opts.enrichment.questions.push(q);
    }
  }catch(error){opts.hardTierNotice='Hard paraphrase generation unavailable: '+error.message;}
}
if(opts.gateV2){
  const {loadLocalGate,calibrationReranker}=await import('./retrieval/local-gate.mjs');
  await loadLocalGate();
  if(opts.cliRerank){
    const seed=build(brief,docs,{...opts,gateV2:false});
    opts.rerank=calibrationReranker(seed);
    opts.scoreQuestions=(await import('./retrieval/local-gate.mjs')).crossScores;
  }
}
if(opts.release){
  const {createHash}=await import('node:crypto');
  const {writeFileSync}=await import('node:fs');
  const {prepareRunner}=await import('./retrieval/release-runner.mjs');
  const {execFileSync}=await import('node:child_process');
  const {dirname,basename,join}=await import('node:path');
  const {rmSync}=await import('node:fs');
  opts.commitTest=cases=>{
    const body=JSON.stringify(cases,null,2)+'\n';
    const sha256=createHash('sha256').update(body).digest('hex');
    writeFileSync(opts.commitPath,body,{flag:'wx'});
    const dir=dirname(opts.commitPath);
    const git=args=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',env:{...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}});
    git(['init','--quiet','-b','split']);
    git(['add','--',basename(opts.commitPath)]);
    git(['-c','user.name=ForgeAI compiler','-c','user.email=compiler@localhost','-c','core.hooksPath=/dev/null','commit','--quiet','-m','Freeze generated test slice before optimizer round one']);
    const commit=git(['rev-parse','HEAD']).trim();
    git(['bundle','create',join(dir,'split.bundle'),'refs/heads/split']);
    rmSync(join(dir,'.git'),{recursive:true});
    return {sha256,commit,file:'test-slice.json',bundle:'split.bundle'};
  };
  opts.prepareRunner=opts.cliRerank?(d,rows)=>{
    const scores=opts.scoreQuestions(d,rows.map(c=>c.question));
    return (def,q)=>answer(def,q,undefined,scores);
  }:opts.evidenceFirst?()=>strictAnswer:prepareRunner;
}
const run=build(brief,docs,opts);
if(opts.release)run.report.assessment=describeRelease(run);
if(opts.generationBackend)run.report.generationBackend=opts.generationBackend;
if(opts.hardTierNotice)run.report.hardTierNotice=opts.hardTierNotice;
if(opts.degraded)run.report.degraded=opts.degraded;
if(opts.expandIndex)run.definition.searchExpansion=await (await import('./retrieval/expand.mjs')).expandIndex(run.definition);
parentPort.postMessage({run,enrichment:opts.enrichment??null});
