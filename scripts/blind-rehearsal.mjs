// A domain owner can seal private cases, then run the actual factory without giving it the answers.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCase} from '../public/review.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const [mode, file, seal, brief, docs, output]=process.argv.slice(2);
if (!file || !seal || !['seal','run'].includes(mode)) throw Error('Use seal CASES SEAL or run CASES SEAL BRIEF DOCS NEW_OUTPUT.');
const bytes=readFileSync(file);
const entries=JSON.parse(bytes);
if (!Array.isArray(entries) || !entries.length || entries.length>50) throw Error('Supply 1 to 50 cases.');
const cases=entries.map(validateCase);
if(new Set(cases.map(c=>c.question.toLowerCase())).size!==cases.length)throw Error('Repeated question.');
if(!cases.some(c=>c.status==='answered') || !cases.some(c=>c.status==='refused'))throw Error('Include both supported and unsupported questions.');
const commitment={
  casesSha256:createHash('sha256').update(bytes).digest('hex'),
  version:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
};
function save(path,data){writeFileSync(path,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});}
if(mode==='seal'){
  save(seal,commitment);
}else{
  if(!brief||!docs||!output)throw Error('Supply BRIEF DOCS NEW_OUTPUT.');
  const frozen=JSON.parse(readFileSync(seal));
  if(frozen.casesSha256!==commitment.casesSha256 || frozen.version!==commitment.version)throw Error('Case file or code revision differs from the seal.');
  if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim())throw Error('Tracked changes would invalidate the sealed code revision.');
  mkdirSync(output,{mode:0o700});
  const agent=resolve(output,'agent');
  const start=performance.now();
  const build=spawnSync(process.execPath,['cli.mjs','forge','--brief',resolve(brief),'--docs',resolve(docs),'--out',agent],{cwd:root,encoding:'utf8'});
  save(join(output,'build.json'),{...commitment,exit:build.status,stdout:build.stdout,stderr:build.stderr,elapsedMs:Math.round(performance.now()-start)});
  if(build.status!==0)throw Error('Build failed. The first attempt is retained.');
  const score=spawnSync(process.execPath,['cli.mjs','review',join(agent,'definition.json'),resolve(file)],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
  if(![0,2].includes(score.status))throw Error(score.stderr || 'Review failed.');
  const receipt=JSON.parse(score.stdout);
  save(join(output,'review.json'),receipt);
  const outcomes={};
  for(const [index,entry] of cases.entries()){
    const row=outcomes[entry.status]??={passed:0,total:0,falseAnswers:0};
    row.total++;
    if(receipt.results[index].passed)row.passed++;
    if(entry.status==='refused' && receipt.results[index].actual.status==='answered')row.falseAnswers++;
  }
  save(join(output,'summary.json'),{...commitment,outcomes});
  console.log(JSON.stringify(outcomes));
}
