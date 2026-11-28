import {browserAnswer} from './browser-answer.mjs';
import {compareReleases} from './impact.mjs';
self.onmessage=async({data})=>{
  try {
    if(data.after?.runtime?.kind==='local-evidence-selector')throw Error('Use CLI impact for a definition that requires a local model.');
    if(data.before?.retrieval?.gate||data.after?.retrieval?.gate)await (await import('./static-encoder.mjs')).loadGateModel();
    self.postMessage({report:await compareReleases(data.before,data.after,data.cases,browserAnswer)});
  } catch(e){ self.postMessage({error:e.message}); }
};
