// Used by the offline rehearsal. Fail any Node HTTP fetch outside loopback.
const original=globalThis.fetch;
globalThis.fetch=(input,options)=>{
  const url=new URL(input instanceof Request?input.url:input);
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('Offline rehearsal blocked '+url.origin);
  return original(input,options);
};
