import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {readDocuments} from '../documents.mjs';
import {indexDocs,rank} from '../public/engine.mjs';

export const suites=['holdout','holdout2','holdout3'];
const included=[['bench','spares','staff'],['digitizer','onboarding','vendors'],['claims','helpdesk','optics']];
export async function* corpora(suite){
  const folder=join('examples',suite);
  const names=included[suites.indexOf(suite)]??(await readdir(folder,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort();
  for(const name of names){
    const chunks=indexDocs(await readDocuments(join(folder,name,'docs')),{contextual:true});
    const cases=JSON.parse(await readFile(join(folder,name,'cases.json')));
    yield {name,chunks,cases};
  }
}
export function topOne(chunks,question){
  const {id,source,text}=rank(chunks,question)[0].c;
  return {status:'answered',text,citations:[{id,source,text}]};
}
export const refuse=()=>({status:'refused',text:'Insufficient evidence.',citations:[]});
