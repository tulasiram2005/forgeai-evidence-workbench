import {build,indexDocs,inspectRequirements,makeEvals} from './engine.mjs';
import {splitCases} from './validation.mjs';

self.addEventListener('message',async event=>{
  try{
    const {brief,documents,options={}}=event.data;
    if(options.gateV2){
      await (await import('./static-encoder.mjs')).loadGateModel();
      self.postMessage({run:build(brief,documents,options)});
      return;
    }
    const opts={...options,release:true,contextual:true};
    const chunks=indexDocs(documents,opts);
    const requirements=inspectRequirements(brief,documents,opts,chunks);
    const cases=makeEvals(chunks,undefined,requirements.mustRefuse,60);
    const test=splitCases(cases).test;
    const bytes=new TextEncoder().encode(JSON.stringify(test,null,2)+'\n');
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    const sha256=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
    const {contextualRunner}=await import('./browser-minilm.mjs');
    const runner=await contextualRunner({chunks},cases.map(c=>c.question));
    const run=build(brief,documents,{...opts,approvedRequirements:requirements,
      prepareRunner:()=>runner,commitTest:()=>({sha256})});
    run.definition.runtime={kind:'contextual-minilm'};
    self.postMessage({run});
  }catch(error){self.postMessage({error:error.message});}
});
