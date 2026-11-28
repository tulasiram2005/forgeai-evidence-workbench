import {pilot} from './forecast-pilot.mjs';
import {auditSources} from './source-audit.mjs';
import { validateCase, runReview } from './review.mjs';
import {browserAnswer as answer} from './browser-answer.mjs';

const byId = id => document.getElementById(id);
const item = (tag, content, cls) => {
  const element = document.createElement(tag);
  if (content !== undefined) element.textContent = content;
  if (cls) element.className = cls;
  return element;
};
const format = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const titles = { shore: 'North Pier shore desk', spares:'Ship-spares desk', conservation: 'Conservation dispatch' };
const pretty = value => String(value ?? '').replaceAll('_', ' ');
let activeRun;
let currentKey = 'shore';
let customRun;
let requestToken = 0;
let staged = [];
let readingFiles = false;

function selectView(view) {
  for (const name of ['evidence', 'runner', 'definition', 'review', 'impact']) {
    byId(name).hidden = view !== name;
    byId('tab-' + name).setAttribute('aria-pressed', String(name === view));
  }
}
for (const tab of document.querySelectorAll('[data-view]')) {
  tab.addEventListener('click', () => selectView(tab.dataset.view));
}

byId('start-query').onclick=()=>{
  if(!activeRun)return;
  selectView('runner');
  byId('query').value=activeRun.evals.find(c=>c.status==='answered')?.question ?? '';
  byId('query').focus();
};
byId('open-failures').onclick=()=>{
  selectView('evidence');
  byId('case-filter').value='fail';byId('case-search').value='';renderCases();
  byId('case-filter').focus();
};
fetch('./runs/release-results.json').then(response=>response.json()).then(data=>{
  const configs=['V2 contextual','Always refuse','Always answer with top-1'];
  const table=item('table');
  table.append(item('caption','All suites combined'));
  const heading=item('tr');
  for(const name of ['Configuration','Answerable recall','Refusal recall','Balanced accuracy'])heading.append(item('th',name));
  table.append(heading);
  const interval=m=>m.count+'/'+m.total+' ('+(100*m.lower).toFixed(1)+'% to '+(100*m.upper).toFixed(1)+'%)';
  for(const config of configs){
    const r=data.find(row=>row.suite==='pooled' && row.config===config);
    const line=item('tr');
    line.append(item('th',config),item('td',interval(r.answerableRecall)),item('td',interval(r.refusalRecall)),item('td',(100*r.balancedAccuracy).toFixed(1)+'%'));
    table.append(line);
  }
  byId('field-detail').replaceChildren(table,item('p','Class recalls include question-level 95% Wilson intervals. Balanced accuracy weights both classes equally.'));
  byId('field-scores').replaceChildren(...data.filter(r=>r.config===configs[0] && r.suite!=='pooled').map((r,i)=>{
    const cell=item('div');cell.append(item('strong',r.passed.count+'/'+r.passed.total),item('span',(i===3?'Prospective suite ':'Development suite ')+(i+1)));return cell;
  }));
}).catch(()=>{byId('field-scores').textContent='External results unavailable';});

function evidenceRow(label, value) {
  const row = item('p');
  row.append(item('strong', label + ' '), document.createTextNode(format(value) || '—'));
  return row;
}

function renderCases() {
  if (!activeRun) return;
  const list = byId('cases');
  list.replaceChildren();
  const filter = byId('case-filter').value;
  const retained = activeRun.iterations[activeRun.report.retainedRound-1] ?? activeRun.iterations.find(entry => entry.passed === activeRun.report.passed);
  const results = [...(retained?.results ?? []),...(activeRun.report.testResults??[])];
  const definitions = new Map(activeRun.evals.map(entry => [entry.id, entry]));
  const search = byId('case-search').value.trim().toLowerCase();
  const sorted = [...results].sort((a,b) => Number(a.passed)-Number(b.passed));
  for (const result of sorted) {
    if (search && !(result.id+' '+result.question).toLowerCase().includes(search)) continue;
    if ((filter === 'fail' && result.passed) || (filter === 'pass' && !result.passed)) continue;
    const definition = definitions.get(result.id) ?? {};
    const details = item('details', undefined, 'case');
    details.id = 'case-'+result.id;
    const summary = item('summary');
    summary.append(item('span',result.id,'case-id'),item('span', result.passed ? 'Pass' : 'Fail', 'tag ' + (result.passed ? 'pass' : 'fail')), item('span', result.question ?? definition.question ?? result.id, 'question'));
    const body = item('div', undefined, 'case-body');
    const context = [pretty(definition.type ?? definition.kind), pretty(result.category)].filter(Boolean);
    if (context.length) body.append(item('p', context.join(' / '), 'case-context'));
    const comparison = item('div', undefined, 'case-comparison');
    const reference = item('section');
    reference.append(item('h3','Expected'));
    if (definition.status) reference.append(item('strong',pretty(definition.status)));
    const expected = definition.expected ?? definition.facts ?? definition.expectedFacts;
    if (Array.isArray(expected)) {
      for (const fact of expected) reference.append(item('p',fact.text),item('small',fact.source+' · '+fact.id));
    } else if (expected !== undefined) reference.append(item('p',format(expected)));
    const response = item('section');
    response.append(item('h3','Observed'));
    const observed = result.answer ?? result.output ?? result.actual;
    if (observed !== undefined) {
      if (observed.status) response.append(item('strong',pretty(observed.status)));
      response.append(item('p',format(observed?.text ?? observed)));
      showPointers(response,observed);
      for (const cite of observed.citations ?? []) response.append(item('small',cite.source+' · '+cite.id));
    }
    comparison.append(reference,response);
    body.append(comparison);
    if (result.reason) body.append(evidenceRow('Judgment', result.reason));
    body.append(evidenceRow('Round history', activeRun.iterations.map(r=>{
      const observed=r.results.find(x=>x.id===result.id);
      return 'R'+r.round+' '+(!observed?'unrecorded':observed.passed?'pass':'fail');
    }).join(' / ')));
    if (definition.sources) body.append(evidenceRow('Expected sources', definition.sources));
    details.append(summary, body);
    list.append(details);
  }
  if (!list.childElementCount) list.append(item('p', 'No cases match this filter.', 'empty'));
}
byId('case-search').addEventListener('input', renderCases);
byId('case-filter').addEventListener('change', renderCases);

function blueprintBlock(title, value) {
  const block = item('div', undefined, 'blueprint-block');
  block.append(item('h3', title), item(typeof value === 'string' ? 'p' : 'pre', format(value) ?? '—'));
  return block;
}

function render(run, key) {
  resetImpact();
  clearReviewResult();
  activeRun = run;
  currentKey = key;
  byId('impact-demo').hidden=key!=='shore';
  const { definition, requirements, report, iterations, evals } = run;
  const reqBrief = requirements.brief ?? run.brief ?? requirements.scope;
  byId('run-title').textContent = titles[key] ?? 'Custom agent build';
  byId('run-brief').textContent = typeof reqBrief === 'string' ? reqBrief : (reqBrief ?? []).join(' · ');
  const stats = [new Set(definition.chunks.map(chunk => chunk.source)).size + ' sources', iterations.length + (iterations.length === 1 ? ' evaluation round' : ' evaluation rounds'), (definition.tools?.length ?? 0) + ' attached tools'];
  byId('run-meta').replaceChildren(...stats.map(s => item('span', s)));
  byId('score').replaceChildren(document.createTextNode(String(report.passed)), item('small', ' / ' + report.total));
  const assessment=report.assessment;
  byId('runner-verdict').textContent=(assessment?.verdict??'DO NOT SHIP')+' for autonomous answering. Evidence-first pilot forecast: '+(pilot.forecast*100).toFixed(1)+'% overall agreement across '+pilot.n+' suites.'+(assessment?.warning?' '+assessment.warning:'');
  byId('score-note').textContent = (report.total-report.passed)+' failed';
  const retained = iterations[report.retainedRound-1] ?? iterations.find(entry => entry.passed === report.passed);
  const released=[...(retained?.results??[]),...(report.testResults??[])];
  byId('score-meter').replaceChildren(...released.map(result => {
    const button = item('button',result.id,result.passed ? 'map-pass' : 'map-fail');
    const label = result.id+' · '+(result.passed?'Passed':'Failed')+' · '+result.question;
    button.title = label;
    button.setAttribute('aria-label',label);
    button.onclick = () => {
      selectView('evidence');
      byId('case-search').value='';
      byId('case-filter').value='all';
      renderCases();
      const row=byId('case-'+result.id);
      row.open=true;
      row.querySelector('summary').focus({preventScroll:true});
      row.scrollIntoView({block:'center'});
    };
    return button;
  }));
  byId('trace').replaceChildren(...iterations.map((entry, i) => {
    const node = item('div', undefined, 'step');
    const change = entry.change;
    node.append(item('strong', 'Round ' + (i + 1) + ' · ' + entry.passed + '/' + entry.total), item('p', typeof change === 'object' ? format(change) : pretty(change || 'Initial evaluation')));
    return node;
  }));
  const classes=new Map();
  for(const r of released){
    const score=classes.get(r.kind)??{passed:0,total:0};
    score.total++;score.passed+=Number(r.passed);classes.set(r.kind,score);
  }
  byId('stop').replaceChildren(item('p', 'Stopped · ' + pretty(report.stop)), item('p', 'Compiler · ' + (report.model || 'Local')));
  for(const [name,m] of Object.entries(report.splits??{}))byId('stop').append(evidenceRow(name,m.passed+'/'+m.total+' (95% Wilson '+(100*m.lower).toFixed(1)+'% to '+(100*m.upper).toFixed(1)+'%)'));
  for(const [kind,score] of classes)byId('stop').append(evidenceRow(pretty(kind),score.passed+'/'+score.total));
  if (report.metrics) {
    for (const [key,label] of [['citationPrecision','Cited passages matching expectations'],['evidenceRecall','Expected passages recovered'],['requiredRefusals','Required refusals observed']]) {
      const metric = report.metrics[key];
      if (metric) byId('stop').append(item('p', label + ' · ' + (metric.total ? metric.matched + '/' + metric.total : 'N/A')));
    }
  }
  if(retained?.tuning!==undefined)byId('stop').append(evidenceRow('Tuning',retained.tuning+'/'+(report.total-report.validationIds.length)),evidenceRow('Validation',retained.validation+'/'+report.validationIds.length));
  if(report.judgeControls)byId('stop').append(evidenceRow('Broken controls rejected',report.judgeControls.filter(c=>c.rejected).length+'/'+report.judgeControls.length));
  if (report.limitations?.length) byId('stop').append(item('p', report.limitations[0]));
  byId('case-search').value = '';
  byId('case-filter').value = 'all';
  renderCases();
  const grid = item('div', undefined, 'blue-grid');
  const sections = [
    ['Audience & tone', requirements.audience + ' · ' + requirements.tone],
    ['Source coverage', requirements.groundability + (requirements.mustRefuse?.length ? '\nFlagged topics: ' + requirements.mustRefuse.join(', ') : '')],
    ['Tool permissions', definition.tools.length ? definition.tools.join(', ') : 'No external tools attached.'],
    ['Retrieval configuration', definition.retrieval],
    ['Output contract', definition.outputContract],
    ['Clarifying questions', (requirements.clarifyingQuestions ?? []).join('\n')],
  ];
  for (const [label, value] of sections) grid.append(blueprintBlock(label, value));
  byId('blueprint').replaceChildren(blueprintBlock('System prompt', definition.systemPrompt), grid);
  byId('query').value = '';
  byId('response').replaceChildren();
  const chosen = new Set();
  const queries = [];
  for (const entry of evals) {
    const kind = entry.type ?? entry.kind;
    if (entry.question && !chosen.has(kind)) {
      chosen.add(kind);
      queries.push(entry.question);
    }
  }
  for (const entry of evals) if (queries.length < 3 && entry.question && !queries.includes(entry.question)) queries.push(entry.question);
  byId('suggestions').replaceChildren(...queries.slice(0, 4).map(query => {
    const button = item('button', query, 'suggest');
    button.addEventListener('click', () => { byId('query').value = query; byId('query').focus(); });
    return button;
  }));
  byId('status').textContent = '';
}

async function loadRun(key) {
  const token = ++requestToken;
  try {
    if (key === 'custom' && customRun) return render(customRun, key);
    if (!Object.hasOwn(titles, key)) throw new Error('Unknown build.');
    byId('status').textContent = 'Opening build…';
    const response = await fetch('./runs/' + key + '.json');
    if (!response.ok) throw new Error('Could not open this evidence bundle.');
    const data = await response.json();
    if (token === requestToken) render(data, key);
  } catch (error) {
    if (token !== requestToken) return;
    byId('status').textContent = error.message;
    if (activeRun) byId('demo-select').value = currentKey;
    else { byId('run-title').textContent = 'No build loaded'; byId('run-brief').textContent = 'Create a new build or select another evidence bundle.'; }
  }
}
byId('demo-select').addEventListener('change', event => loadRun(event.target.value));

byId('chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!activeRun) return;
  const question = byId('query').value.trim();
  if (!question) return;
  const startingRun = activeRun;
  const button = byId('ask');
  button.disabled = true;
  try {
    const response = await answer(activeRun.definition, question);
    if (activeRun !== startingRun) return;
    const panel = item('div', undefined, 'result-card');
    panel.append(item('div', pretty(response.status), 'kicker'), item('h3', 'Agent response'), item('p', response.text));
    showPointers(panel,response);
    for (const citation of response.citations ?? []) {
      const quote = item('div', undefined, 'quote');
      quote.append(item('strong', citation.source + (citation.id ? ' · ' + citation.id : '')), item('span', citation.text));
      panel.append(quote);
    }
    if(response.citations.some(c=>startingRun.definition.chunks.some(chunk=>chunk.source===c.source))){
      const audit=item('button','Test source dependency','outline');
      audit.id='source-dependency';
      audit.type='button';
      const output=item('div');
      output.setAttribute('aria-live','polite');
      audit.onclick=async()=>{
        audit.disabled=true;
        try {
          const receipt=await auditSources(startingRun.definition,question,answer,response);
          output.replaceChildren(item('h3','Source-removal audit'),item('p','Each trial repeats the question with one cited document withheld.'));
          for(const trial of receipt.trials){
            const block=item('div',undefined,'quote');
            block.append(item('strong','Without '+trial.source),evidenceRow('Outcome',trial.response.status),
              item('p',trial.response.text));
            for(const cite of trial.response.citations)block.append(evidenceRow('Remaining source',cite.source+' · '+cite.id));
            output.append(block);
          }
          const save=item('button','Download audit','outline');
          save.onclick=()=>download(receipt,'forgeai-source-audit.json');
          output.append(save);
        } catch(error){output.textContent=error.message;audit.disabled=false;}
      };
      panel.append(audit,output);
    }
    byId('response').replaceChildren(panel);
  } catch (error) {
    byId('response').textContent = 'Question failed. ' + error.message;
  } finally { button.disabled = false; }
});

function download(value, file) {
  if (!value) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type:'application/json'}));
  const link = item('a');
  link.href = url;
  link.download = file;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
byId('download-run').addEventListener('click', () => download(activeRun, 'forgeai-' + currentKey + '-dossier.json'));
byId('export-definition').addEventListener('click', () => download(activeRun?.definition, 'forgeai-' + currentKey + '-agent.json'));

const dialog = byId('builder');
byId('new-run').addEventListener('click', () => { dialog.showModal(); byId('brief').focus(); });
byId('close').addEventListener('click', () => dialog.close());
function renderStaged() {
  byId('staged-list').replaceChildren(...staged.map((doc, index) => {
    const li = item('li');
    const remove = item('button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + doc.name);
    remove.addEventListener('click', () => { staged.splice(index, 1); renderStaged(); });
    li.append(item('span', doc.name), remove);
    return li;
  }));
}
function validateBatch(newDocs) {
  if (staged.length + newDocs.length > 12) throw new Error('Choose up to 12 documents per build.');
  const names = new Set(staged.map(doc => doc.name));
  for (const doc of newDocs) {
    if (!doc.text.trim()) throw new Error(doc.name + ' contains no source text.');
    if (new TextEncoder().encode(doc.text).length > 160000) throw new Error(doc.name + ' exceeds 160 KB.');
    if (names.has(doc.name)) throw new Error('A document named ' + doc.name + ' is already staged.');
    names.add(doc.name);
  }
  staged.push(...newDocs);
  renderStaged();
}
byId('files').addEventListener('change', async event => {
  byId('build-error').textContent = '';
  readingFiles = true;
  try {
    const files = [...event.target.files];
    if (files.length + staged.length > 12) throw new Error('Choose up to 12 documents.');
    for (const file of files) {
      if (!/\.(md|txt|csv)$/i.test(file.name)) throw new Error('Choose TXT, Markdown or CSV documents.');
      if (file.size > 160000) throw new Error(file.name + ' exceeds 160 KB.');
    }
    validateBatch(await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() }))));
  } catch (error) { byId('build-error').textContent = error.message; }
  finally { event.target.value = ''; readingFiles = false; }
});
function stagePaste() {
  const source = byId('doc-text');
  const name = byId('doc-name');
  validateBatch([{ name: name.value.trim() || 'source-' + (staged.length + 1) + '.txt', text: source.value.trim() }]);
  source.value = '';
  name.value = '';
}
byId('add-document').addEventListener('click', () => {
  byId('build-error').textContent = '';
  try { stagePaste(); } catch (error) { byId('build-error').textContent = error.message; }
});
function compile(brief, documents, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./compiler.worker.mjs', import.meta.url), {type:'module'});
    const deadline = setTimeout(() => {
      worker.terminate();
      reject(new Error('This build exceeded its 180-second budget. Reduce the source set and retry.'));
    }, 180000);
    const cleanUp = () => { clearTimeout(deadline); worker.terminate(); };
    worker.onmessage = event => {
      cleanUp();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.run);
    };
    worker.onerror = () => {
      cleanUp();
      reject(new Error('The compiler could not start. Reload the page and try again.'));
    };
    worker.postMessage({ brief, documents, options });
  });
}
byId('build-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = byId('compile');
  byId('build-error').textContent = '';
  button.disabled = true;
  try {
    if (readingFiles) throw new Error('Documents are still loading. Try again in a moment.');
    if (byId('doc-text').value.trim()) stagePaste();
    if (!staged.length) throw new Error('Attach or paste at least one source document.');
    const brief = byId('brief').value.trim();
    if (!brief) throw new Error('Describe the agent you want to build.');
    button.textContent = 'Evaluating…';
    await new Promise(resolve => setTimeout(resolve, 30));
    const opts = {contextual:true};
    if(byId('gate-toggle').checked){
      await (await import('./static-encoder.mjs')).loadGateModel();
      opts.gateV2=true;opts.contextual=true;
    }
    for (const key of ['audience','tone']) if (byId(key).value.trim()) opts[key] = byId(key).value.trim();
    customRun = await compile(brief, [...staged], opts);
    ++requestToken;
    if (![...byId('demo-select').options].some(option => option.value === 'custom')) byId('demo-select').add(new Option('Custom agent build', 'custom'));
    byId('demo-select').value = 'custom';
    render(customRun, 'custom');
    selectView('evidence');
    dialog.close();
    byId('main').scrollIntoView();
  } catch (error) { byId('build-error').textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Compile and evaluate ↗'; }
});
const reviewCases = [];
let receipt;
let reviewRevision = 0;
function clearReviewResult() {
  reviewRevision++;
  receipt = null;
  byId('review-results').replaceChildren();
  byId('review-message').textContent = '';
  byId('review-download').hidden = true;
}
function showReviewCases() {
  clearReviewResult();
  byId('review-list').replaceChildren(...reviewCases.map((entry, index) => {
    const row = item('div', undefined, 'review-entry');
    const remove = item('button', 'Remove', 'outline');
    remove.setAttribute('aria-label', 'Remove '+entry.question);
    remove.onclick = () => { reviewCases.splice(index,1); showReviewCases(); };
    row.append(item('strong',entry.question),item('p',[entry.status,...entry.facts,entry.source].filter(Boolean).join(' · ')),remove);
    return row;
  }));
  byId('review-run').disabled = !reviewCases.length;
}
byId('review-status').onchange = () => { byId('review-facts-field').hidden = byId('review-status').value !== 'answered'; };
byId('review-form').onsubmit = event => {
  event.preventDefault();
  try {
    const status = byId('review-status').value;
    const entry = validateCase({question:byId('review-question').value,status,
      facts:status === 'answered' ? byId('review-facts').value.split(/\n/).map(s=>s.trim()).filter(Boolean) : [],source:byId('review-source').value});
    if (reviewCases.length >= 50) throw Error('The review already has 50 questions.');
    if (reviewCases.some(c=>c.question.toLowerCase()===entry.question.toLowerCase())) throw Error('This question is already in your review.');
    reviewCases.push(entry);
    event.target.reset(); byId('review-facts-field').hidden=false; showReviewCases(); byId('review-question').focus();
  } catch (e) { byId('review-message').textContent=e.message; }
};
byId('review-run').onclick = async () => {
  if (!activeRun) return;
  clearReviewResult();
  const revision = reviewRevision;
  try {
    const output = await runReview(activeRun.definition,reviewCases,answer);
    if (revision !== reviewRevision) return;
    receipt=output;
    byId('review-message').textContent=output.passed+' of '+output.total+' reviewer cases passed.';
    byId('review-results').replaceChildren(...output.results.map((result,index)=>{
      const block=item('article',undefined,'result-card');
      block.append(item('span',result.passed?'Pass':'Fail','tag '+(result.passed?'pass':'fail')),item('h3',output.cases[index].question),
        evidenceRow('Observed',result.actual.status),item('p',result.actual.text));
      for(const issue of result.issues) block.append(evidenceRow('Mismatch',issue));
      for(const citation of result.actual.citations) block.append(evidenceRow('Source',citation.source+' · '+citation.id));
      return block;
    }));
    byId('review-download').hidden=false;
  } catch (e) { if(revision === reviewRevision) byId('review-message').textContent=e.message; }
};
byId('review-download').onclick=()=>{if(receipt) download(receipt,'forgeai-review.json');};
let impactJob=0, impactWorker, impactReport, impactTimer;
function resetImpact(){
  impactJob++;
  impactWorker?.terminate();
  clearTimeout(impactTimer);
  impactReport=null;
  byId('impact-results').replaceChildren();
  byId('impact-status').textContent='';
  byId('impact-download').hidden=true;
  byId('impact-demo').hidden=currentKey!=='shore';
}
async function runImpact(load){
  resetImpact();
  const job=impactJob;
  try {
    if(!activeRun)throw Error('Select an active build first.');
    byId('impact-status').textContent='Comparing releases…';
    const candidate=await load();
    if(job!==impactJob)return;
    const worker=new Worker(new URL('./impact.worker.mjs',import.meta.url),{type:'module'});
    impactWorker=worker;
    const fail=message=>{worker.terminate();clearTimeout(impactTimer);byId('impact-status').textContent=message;};
    impactTimer=setTimeout(()=>fail('Comparison exceeded 45 seconds.'),180000);
    worker.onerror=()=>fail('Could not run the comparison.');
    worker.onmessage=({data})=>{
      if(job!==impactJob)return;
      if(data.error){fail(data.error);return;}
      clearTimeout(impactTimer);worker.terminate();
      impactReport=data.report;
      byId('impact-status').textContent=impactReport.changed+' of '+impactReport.total+' responses changed.';
      const result=byId('impact-results');
      for(const source of impactReport.sources)result.append(evidenceRow(source.change,source.name));
      for(const c of impactReport.results.filter(c=>c.change!=='Unchanged')){
        const row=item('details',undefined,'result-card');
        row.append(item('summary',c.id+' · '+c.change+' · '+c.question));
        for(const [label,res] of [['Before',c.before],['After',c.after]]){
          const line=item('p');
          line.append(item('strong',label+' · '+res.status+' '));
          const other=label==='Before'?c.after.text:c.before.text;
          const words=res.text.split(/(\s+)/),peer=other.split(/(\s+)/);
          let first=0,last=0;
          while(first<words.length && words[first]===peer[first])first++;
          while(last<Math.min(words.length,peer.length)-first && words.at(-1-last)===peer.at(-1-last))last++;
          line.append(document.createTextNode(words.slice(0,first).join('')),
            item(label==='Before'?'del':'ins',words.slice(first,words.length-last).join('')),
            document.createTextNode(words.slice(words.length-last).join('')));
          row.append(line);
          for(const cite of res.citations)row.append(evidenceRow('Source',cite.source+' · '+cite.id));
        }
        result.append(row);
      }
      byId('impact-download').hidden=false;
    };
    worker.postMessage({before:activeRun.definition,after:candidate.definition??candidate,cases:activeRun.evals});
  } catch(e){if(job===impactJob)byId('impact-status').textContent=e.message;}
}
byId('impact-file').onchange=event=>{
  const file=event.target.files[0];event.target.value='';
  if(file)runImpact(async()=>{if(file.size>8000000)throw Error('Choose JSON under 8 MB.');return JSON.parse(await file.text());});
};
byId('impact-demo').onclick=()=>runImpact(async()=>{
  const response=await fetch('./runs/shore-revision.json');
  if(!response.ok)throw Error('Could not load the sample revision.');
  return response.json();
});
byId('impact-download').onclick=()=>download(impactReport,'forgeai-impact.json');
loadRun('shore');

function showPointers(panel,response){
  if(response.status!=='refused'||!response.pointers?.length)return;
  const list=item('ul');
  for(const p of response.pointers){
    const li=item('li'),mark=item('mark',p.highlighted??p.text);
    li.append(item('small',p.source+' · '+p.id),mark);
    list.append(li);
  }
  panel.append(item('h4','Closest evidence, not confirmed'),list);
}

byId('remove-step').onclick=async()=>{
  if(!activeRun)return;
  selectView('runner');
  const q=activeRun.evals.find(c=>c.status==='answered');
  if(!q)return;
  byId('query').value=q.question;
  const a=await answer(activeRun.definition,q.question);
  const receipt=await auditSources(activeRun.definition,q.question,answer,a);
  const panel=byId('response');
  panel.replaceChildren(item('h3','Source-removal audit'),item('p',q.question));
  for(const t of receipt.trials)panel.append(evidenceRow('Without '+t.source,t.response.status+' · '+t.response.text));
  if(!receipt.trials.length)panel.append(item('p','This question produced no cited source to remove.'));
};
byId('policy-step').onclick=()=>{selectView('impact');byId('impact-demo').click();};
fetch('./runs/submission.json').then(r=>r.json()).then(({summary,fresh,cases})=>{
  const root=byId('fresh-trust'),strict=fresh.find(r=>r.config==='strict'),control=fresh.find(r=>r.config==='alwaysRefuse');
  root.replaceChildren(item('p','Fresh suite · '+strict.answerableRecall.count+'/'+strict.answerableRecall.total+' supported answers. '+strict.nearMissFalseAnswers.count+'/'+strict.nearMissFalseAnswers.total+' near-miss false answers.'),
    item('p','Balanced accuracy: evidence-first '+(100*strict.balancedAccuracy).toFixed(1)+'%, always refuse '+(100*control.balancedAccuracy).toFixed(1)+'%.'));
  const development=summary.find(r=>r.suite==='holdout4');
  root.append(item('p','Earlier contextual build · development suite 4: '+development.losses.passed+'/'+development.answerable+' supported answers.'));
  const pooled=summary.find(r=>r.suite==='pooled'),chart=byId('funnel-chart');
  for(const [label,value] of [['Indexed gold facts',pooled.oracle],['All facts in the top three',pooled.answerable-pooled.outsideHybridTop3],['Correct contextual answer',pooled.losses.passed]]){
    const bar=item('progress');bar.max=pooled.answerable;bar.value=value;bar.setAttribute('aria-label',label);
    chart.append(item('p',label+' · '+value+'/'+pooled.answerable),bar);
  }
  for(const c of cases){
    const d=item('details'),title=item('summary',c.question);
    d.append(title,item('p',c.suite+' / '+c.corpus+' · '+c.stage),
      item('p',c.oracle===null?'No gold passage expected.':'Gold passage judge: '+(c.oracle?'pass':'fail')+'. Complete hybrid evidence rank: '+(c.rank??'missing')+'.'),
      item('p','Forced top-one / top-three verdicts: '+c.forced.map(v=>v?'pass':'fail').join(' / ')+'. Final response: '+c.actual+'.'));
    byId('funnel-cases').append(d);
  }
}).catch(()=>{byId('fresh-trust').textContent='Prospective results unavailable.';});
