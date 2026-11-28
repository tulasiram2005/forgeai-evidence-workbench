import {parentPort,workerData} from 'node:worker_threads';
import {build,answer} from './public/engine.mjs';
import {enrich} from './model.mjs';

const {brief,docs,opts,model}=workerData;
if(model){
  opts.enrichment=await enrich(brief,docs);
  opts.model=model;
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
  }:prepareRunner;
}
const run=build(brief,docs,opts);
if(opts.expandIndex)run.definition.searchExpansion=await (await import('./retrieval/expand.mjs')).expandIndex(run.definition);
parentPort.postMessage({run,enrichment:opts.enrichment??null});
