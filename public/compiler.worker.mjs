import { build } from './engine.mjs';

self.addEventListener('message', async event => {
  try {
    const { brief, documents, options } = event.data;
    if(options?.gateV2)await (await import('./static-encoder.mjs')).loadGateModel();
    self.postMessage({ run: build(brief, documents, options) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
});
