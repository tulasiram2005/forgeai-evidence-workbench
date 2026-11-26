import {compareReleases} from './impact.mjs';
self.onmessage=async({data})=>{
  try {
    if(data.after?.runtime?.kind==='local-evidence-selector')throw Error('Use CLI impact for a definition that requires a local model.');
    self.postMessage({report:await compareReleases(data.before,data.after,data.cases)});
  } catch(e){ self.postMessage({error:e.message}); }
};
