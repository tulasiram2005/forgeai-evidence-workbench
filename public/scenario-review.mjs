// Resolve follow-up questions only within an explicitly indexed scenario and action.
const supportedFields = new Set(['eligibility', 'approver', 'submission deadline']);
const key = value => value.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();
const unresolved = question => ({question, status:'refused', text:'The supplied sources do not establish this part.', citations:[]});

function scenarioTitle(statement) {
  // Preserve qualifiers, nouns, and negation. Remove only first-person framing.
  return key(statement).replace(/^i (?:have just |have |just )?/, '').replace(/^(lost|misplaced) my /, '$1 ');
}

function requestedField(clause) {
  const q = key(clause);
  const permission = q.match(/^can i (?:still )?(.+)$/);
  if (permission) return {field:'eligibility', action:permission[1]};
  if (/^who (?:approves it|must approve it|can approve it)$/.test(q)) return {field:'approver'};
  if (/^when (?:do i submit(?: it)?|must i submit(?: it)?|is it due)$/.test(q)) return {field:'submission deadline'};
  return {};
}

function resolveField(chunks, field, question) {
  // Continuations without labels can change a rule. Do not quote a fragment.
  if (!chunks.length || chunks.some(chunk => !supportedFields.has(key(chunk.topic)) || !chunk.text.startsWith(chunk.topic + ':'))) return unresolved(question);
  const matches = chunks.filter(chunk => key(chunk.topic) === field);
  if (!matches.length) return unresolved(question);
  const citations = matches.map(({id, source, section, text}) => ({id, source, section, text}));
  if (new Set(matches.map(chunk => chunk.text)).size > 1) {
    return {question, status:'clarify', text:'The sources give different wording for this field. Review both before applying the rule.', citations};
  }
  if (!matches[0].text.slice(matches[0].topic.length + 1).trim()) return unresolved(question);
  return {question, status:'answered', text:matches[0].text, citations};
}

export function reviewScenario(definition, question) {
  if (definition.runtime?.kind !== 'evidence-first') throw Error('Choose an evidence-first definition.');
  if (!question.trim() || question.length > 2000) throw Error('Supply a question of up to 2,000 characters.');
  const request = question.trim().match(/^([^.!?]+)\.\s+(.+)$/s);
  if (!request) return {experimental:true, coverage:'unresolved', parts:[unresolved(question)]};
  const scenario = scenarioTitle(request[1]);
  const clauses = request[2].replace(/\?$/, '').split(/,\s*(?:and\s+)?|\?\s+|\s+and\s+(?=(?:who|when|can)\b)/i);
  if (clauses.length > 8) throw Error('Supply up to eight clauses.');
  const scoped = definition.chunks.filter(c => c.section?.length && key(c.section[0]) === scenario);
  let action;
  const parts = clauses.map(clause => {
    const request = requestedField(clause);
    if (!request.field) {
      action = undefined;
      return unresolved(clause);
    }
    if (request.action) action = request.action;
    if (!action) return unresolved(clause);
    const relevant = scoped.filter(c => c.section.length === 1 || key(c.section[1]) === action);
    if (relevant.some(c => c.section.length !== 2)) return unresolved(clause);
    return resolveField(relevant, request.field, clause);
  });
  const answers = parts.filter(part => part.status === 'answered').length;
  return {experimental:true, scenario, coverage:answers === parts.length ? 'complete' : answers ? 'partial' : 'unresolved', parts};
}
