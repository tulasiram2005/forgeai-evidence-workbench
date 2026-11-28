// Local research interface. Raw source excerpts are navigation aids.
import fs from 'node:fs/promises';
import {encode,candidates} from '../retrieval/hybrid.mjs';
import {rank} from '../public/engine.mjs';
const [file,mode,...words]=process.argv.slice(2);
if(!file || !['search','cards'].includes(mode) || !words.length)throw Error('Use: node scripts/inspect-passages.mjs DEFINITION.json search|cards QUESTION');
const definition=JSON.parse(await fs.readFile(file,'utf8'));
const question=words.join(' ').trim();
if(!question||question.length>2000)throw Error('Enter a question of up to 2,000 characters.');
if(!Array.isArray(definition.chunks)||!definition.chunks.length||definition.chunks.length>1500)throw Error('Choose a compiled ForgeAI definition.');
const results=mode==='cards'?candidates(definition.chunks,question,encode(definition,[question],true)).slice(0,3):rank(definition.chunks,question);
console.log(JSON.stringify({question,mode,label:'Source passages for inspection. Relevance does not confirm the requested fact.',passages:results.map(({c})=>({id:c.id,source:c.source,text:c.text}))},null,2));
