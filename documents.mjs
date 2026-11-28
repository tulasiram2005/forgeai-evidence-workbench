import {readFile,readdir,stat} from 'node:fs/promises';
import {join,relative,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export async function readDocuments(folder,structured=true){
  const docs=[];let bytes=0;
  async function walk(dir){
    const entries=(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      const path=join(dir,entry.name);
      if(entry.isDirectory()){if(!entry.name.startsWith('.')) await walk(path);continue;}
      if(!entry.isFile()||!['.md','.txt','.csv','.pdf',...(structured?['.docx']:[])].includes(extname(path).toLowerCase()))continue;
      const size=(await stat(path)).size; bytes+=size;
      if(docs.length>=32||bytes>16_000_000)throw Error('Input exceeds 32 files or 16 MB.');
      if(structured && /\.(pdf|docx)$/i.test(path)){
        const parsed=JSON.parse(execFileSync('python3',[fileURLToPath(new URL('./read-document.py',import.meta.url)),path],{encoding:'utf8',timeout:20000,maxBuffer:4000000}));
        if(!parsed.text.trim())throw Error('No readable text in '+entry.name);
        docs.push({name:relative(folder,path),...parsed});
        continue;
      }
      const text=/\.pdf$/i.test(path)?execFileSync('python3',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',path],{encoding:'utf8',timeout:20000,maxBuffer:1600000}):await readFile(path,'utf8');
      if(!text.trim()) throw Error('No readable text in '+entry.name);
      docs.push({name:relative(folder,path),text});
    }
  }
  await walk(folder);return docs;
}
