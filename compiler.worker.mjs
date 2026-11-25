import { build } from './engine.mjs';

self.addEventListener('message', event => {
  try {
    const { brief, documents, options } = event.data;
    self.postMessage({ run: build(brief, documents, options) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
});
