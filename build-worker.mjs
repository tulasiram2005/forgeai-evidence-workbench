import {parentPort,workerData} from 'node:worker_threads';
import {build} from './public/engine.mjs';
import {enrich} from './model.mjs';

const {brief,docs,opts,model}=workerData;
if(model){
  opts.enrichment=await enrich(brief,docs);
  opts.model=model;
}
parentPort.postMessage({run:build(brief,docs,opts),enrichment:opts.enrichment??null});
