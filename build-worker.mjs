import {parentPort,workerData} from 'node:worker_threads';
import {build} from './public/engine.mjs';
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
  }
}
const run=build(brief,docs,opts);
if(opts.expandIndex)run.definition.searchExpansion=await (await import('./retrieval/expand.mjs')).expandIndex(run.definition);
parentPort.postMessage({run,enrichment:opts.enrichment??null});
