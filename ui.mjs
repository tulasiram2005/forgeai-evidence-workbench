import { answer } from './engine.mjs';

const byId = id => document.getElementById(id);
const item = (tag, content, cls) => {
  const element = document.createElement(tag);
  if (content !== undefined) element.textContent = content;
  if (cls) element.className = cls;
  return element;
};
const format = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const titles = { shore: 'North Pier shore desk', conservation: 'Conservation dispatch' };
const pretty = value => String(value ?? '').replaceAll('_', ' ');
let activeRun;
let currentKey = 'shore';
let customRun;
let requestToken = 0;
let staged = [];
let readingFiles = false;

function selectView(view) {
  for (const name of ['evidence', 'runner', 'definition']) {
    byId(name).hidden = view !== name;
    byId('tab-' + name).setAttribute('aria-pressed', String(name === view));
  }
}
for (const tab of document.querySelectorAll('[data-view]')) {
  tab.addEventListener('click', () => selectView(tab.dataset.view));
}

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
  const retained = activeRun.iterations.find(entry => entry.passed === activeRun.report.passed);
  const results = retained?.results ?? [];
  const definitions = new Map(activeRun.evals.map(entry => [entry.id, entry]));
  for (const result of results) {
    if ((filter === 'fail' && result.passed) || (filter === 'pass' && !result.passed)) continue;
    const definition = definitions.get(result.id) ?? {};
    const details = item('details', undefined, 'case');
    const summary = item('summary');
    summary.append(item('span', result.passed ? 'Pass' : 'Fail', 'tag ' + (result.passed ? 'pass' : 'fail')), item('span', result.question ?? definition.question ?? result.id, 'question'));
    const body = item('div', undefined, 'case-body');
    body.append(evidenceRow('Case', result.id));
    if (definition.type || definition.kind) body.append(evidenceRow('Class', pretty(definition.type ?? definition.kind)));
    if (result.category) body.append(evidenceRow('Diagnosis', pretty(result.category)));
    const expected = definition.expected ?? definition.facts ?? definition.expectedFacts;
    if (definition.status) body.append(evidenceRow('Expected outcome', definition.status));
    if (Array.isArray(expected)) {
      for (const fact of expected) body.append(evidenceRow(fact.source + ' · ' + fact.id, fact.text));
    } else if (expected !== undefined) body.append(evidenceRow('Expected', expected));
    const observed = result.answer ?? result.output ?? result.actual;
    if (observed !== undefined) {
      body.append(evidenceRow('Observed', observed?.text ?? observed));
      for (const cite of observed.citations ?? []) body.append(evidenceRow('Cited', cite.source + ' · ' + cite.id));
    }
    if (result.reason) body.append(evidenceRow('Judgment', result.reason));
    if (definition.sources) body.append(evidenceRow('Expected sources', definition.sources));
    details.append(summary, body);
    list.append(details);
  }
  if (!list.childElementCount) list.append(item('p', 'No cases match this filter.', 'empty'));
}
byId('case-filter').addEventListener('change', renderCases);

function blueprintBlock(title, value) {
  const block = item('div', undefined, 'blueprint-block');
  block.append(item('h3', title), item(typeof value === 'string' ? 'p' : 'pre', format(value) ?? '—'));
  return block;
}

function render(run, key) {
  activeRun = run;
  currentKey = key;
  const { definition, requirements, report, iterations, evals } = run;
  const reqBrief = requirements.brief ?? run.brief ?? requirements.scope;
  byId('run-title').textContent = titles[key] ?? 'Custom agent build';
  byId('run-brief').textContent = typeof reqBrief === 'string' ? reqBrief : (reqBrief ?? []).join(' · ');
  const stats = [new Set(definition.chunks.map(chunk => chunk.source)).size + ' sources', iterations.length + (iterations.length === 1 ? ' evaluation round' : ' evaluation rounds'), (definition.tools?.length ?? 0) + ' attached tools'];
  byId('run-meta').replaceChildren(...stats.map(s => item('span', s)));
  byId('score').replaceChildren(document.createTextNode(String(report.passed)), item('small', ' / ' + report.total));
  const percent = report.total ? Math.round(100 * report.passed / report.total) : 0;
  byId('score-note').textContent = percent + '% of cases passed';
  const units = Math.min(40, report.total);
  byId('score-meter').replaceChildren(...Array.from({ length: units }, (_, i) => item('i', undefined, i < Math.round(percent * units / 100) ? 'on' : '')));
  byId('trace').replaceChildren(...iterations.map((entry, i) => {
    const node = item('div', undefined, 'step');
    const change = entry.change;
    node.append(item('strong', 'Round ' + (i + 1) + ' · ' + entry.passed + '/' + entry.total), item('p', typeof change === 'object' ? format(change) : pretty(change || 'Initial evaluation')));
    return node;
  }));
  byId('stop').replaceChildren(item('p', 'Stopped · ' + pretty(report.stop)), item('p', 'Compiler · ' + (report.model || 'Local')));
  if (report.limitations?.length) byId('stop').append(item('p', report.limitations[0]));
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
    for (const citation of response.citations ?? []) {
      const quote = item('div', undefined, 'quote');
      quote.append(item('strong', citation.source + (citation.id ? ' · ' + citation.id : '')), item('span', citation.text));
      panel.append(quote);
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
      reject(new Error('This build exceeded its 45-second budget. Reduce the source set and retry.'));
    }, 45000);
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
    const opts = {};
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
loadRun('shore');
