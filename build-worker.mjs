import {parentPort,workerData} from 'node:worker_threads';
import {build} from './public/engine.mjs';
import {enrich} from './model.mjs';

const {brief,docs,opts,model}=workerData;
if(model){
  opts.enrichment=await enrich(brief,docs);
  opts.model=model;
}
if(opts.gateV2){
  const {loadLocalGate,crossScores}=await import('./retrieval/local-gate.mjs');
  await loadLocalGate();
  if(opts.cliRerank){
    const seed=build(brief,docs,{...opts,gateV2:false});
    const {generatedCases}=await import('./public/gate.mjs');
    opts.rerank=crossScores(seed.definition,[...generatedCases(seed.definition).map(c=>c.q),...seed.evals.map(c=>c.question)]);
  }
}
const run=build(brief,docs,opts);
if(opts.expandIndex)run.definition.searchExpansion=await (await import('./retrieval/expand.mjs')).expandIndex(run.definition);
parentPort.postMessage({run,enrichment:opts.enrichment??null});
