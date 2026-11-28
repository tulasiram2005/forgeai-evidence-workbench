// A domain owner can seal private cases, then run the actual factory without giving it the answers.
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCase} from '../public/review.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const argv=process.argv.slice(2);
const option=argv.indexOf('--comparator');
let comparator;
if(option>=0){
  if(option!==argv.length-2)throw Error('Place --comparator CONFIG.json at the end.');
  comparator=argv[option+1];
  argv.splice(option,2);
}
const [mode, file, seal, brief, docs, output]=argv;
const comparatorBytes=comparator ? readFileSync(comparator) : null;
const config=comparatorBytes ? JSON.parse(comparatorBytes) : null;
if(comparator && (!config || !Array.isArray(config.tools) || !config.retrieval || !config.runtime || typeof config.systemPrompt!=='string'))throw Error('Supply an independently authored ForgeAI configuration with tools, retrieval, runtime and systemPrompt.');

if (!file || !seal || !['seal','run'].includes(mode)) throw Error('Use seal CASES SEAL or run CASES SEAL BRIEF DOCS NEW_OUTPUT.');
const bytes=readFileSync(file);
const entries=JSON.parse(bytes);
if (!Array.isArray(entries) || !entries.length || entries.length>50) throw Error('Supply 1 to 50 cases.');
const cases=entries.map(validateCase);
if(new Set(cases.map(c=>c.question.toLowerCase())).size!==cases.length)throw Error('Repeated question.');
if(!cases.some(c=>c.status==='answered') || !cases.some(c=>c.status==='refused'))throw Error('Include both supported and unsupported questions.');
const commitment={
  casesSha256:createHash('sha256').update(bytes).digest('hex'),
  ...(comparatorBytes?{comparatorSha256:createHash('sha256').update(comparatorBytes).digest('hex')}:{}),
  version:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()
};
function save(path,data){writeFileSync(path,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});}
if(mode==='seal'){
  save(seal,commitment);
}else{
  if(!brief||!docs||!output)throw Error('Supply BRIEF DOCS NEW_OUTPUT.');
  const frozen=JSON.parse(readFileSync(seal));
  if(frozen.casesSha256!==commitment.casesSha256 || frozen.version!==commitment.version)throw Error('Case file or code revision differs from the seal.');
  if(frozen.comparatorSha256!==commitment.comparatorSha256)throw Error('Comparator differs from the seal.');
  if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim())throw Error('Tracked changes would invalidate the sealed code revision.');
  mkdirSync(output,{mode:0o700});
  const agent=resolve(output,'agent');
  const start=performance.now();
  const build=spawnSync(process.execPath,['cli.mjs','forge','--brief',resolve(brief),'--docs',resolve(docs),'--out',agent],{cwd:root,encoding:'utf8'});
  save(join(output,'build.json'),{...commitment,exit:build.status,stdout:build.stdout,stderr:build.stderr,elapsedMs:Math.round(performance.now()-start)});
  if(build.status!==0)throw Error('Build failed. The first attempt is retained.');
  const casesPath=join(resolve(output),'sealed-cases.json');
  writeFileSync(casesPath,bytes,{flag:'wx',mode:0o600});
  function scoreDefinition(path){
    const score=spawnSync(process.execPath,['cli.mjs','review',path,casesPath],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
    if(![0,2].includes(score.status))throw Error(score.stderr || 'Review failed.');
    return JSON.parse(score.stdout);
  }
  const factoryPath=join(agent,'definition.json');
  const receipt=scoreDefinition(factoryPath);
  save(join(output,'review.json'),receipt);
  if(config){
    // Compare decision policies on exactly the same extracted evidence.
    const factory=JSON.parse(readFileSync(factoryPath));
    const comparatorPath=join(resolve(output),'comparator-definition.json');
    save(comparatorPath,{...config,chunks:factory.chunks});
    const comparison=scoreDefinition(comparatorPath);
    save(join(output,'comparator-review.json'),comparison);
    const paired=cases.map((entry,i)=>({
      question:entry.question,expected:entry.status,
      factory:receipt.results[i].passed,comparator:comparison.results[i].passed,
      factoryStatus:receipt.results[i].actual.status,comparatorStatus:comparison.results[i].actual.status
    }));
    save(join(output,'comparison.json'),{...commitment,design:'Shared index, frozen configurations, identical cases and grader',
      factoryOnly:paired.filter(row=>row.factory&&!row.comparator).length,
      comparatorOnly:paired.filter(row=>row.comparator&&!row.factory).length,
      bothCorrect:paired.filter(row=>row.factory&&row.comparator).length,
      bothWrong:paired.filter(row=>!row.factory&&!row.comparator).length,paired});
  }
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
