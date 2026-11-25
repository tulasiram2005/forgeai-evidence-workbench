import { answer } from './engine.mjs';

const words = text => text.normalize('NFKC').toLowerCase().match(/[+-]?\d+(?:[.,]\d+)*|[\p{L}\p{N}]+/gu) ?? [];

function containsPhrase(text, phrase) {
  const tokens = words(text);
  const expected = words(phrase);
  return tokens.some((_, index) => expected.every((word, offset) => tokens[index + offset] === word));
}

export function validateCase(entry) {
  if (!entry || typeof entry.question !== 'string' || !entry.question.trim() || entry.question.length > 2000)
    throw Error('Enter a question of up to 2,000 characters.');
  if (!['answered', 'refused', 'clarify'].includes(entry.status)) throw Error('Choose an expected outcome.');
  const facts = entry.facts ?? [];
  if (!Array.isArray(facts) || facts.length > 12 || facts.some(f => typeof f !== 'string' || !words(f).length || f.length > 300))
    throw Error('Use up to 12 expected phrases, each 1–300 characters.');
  if (entry.status === 'answered' && !facts.length) throw Error('Enter at least one phrase the answer must contain.');
  if (entry.status !== 'answered' && facts.length) throw Error('Only answered cases can require answer phrases.');
  const source = entry.source ?? '';
  if (typeof source !== 'string' || source.length > 300) throw Error('The expected filename is too long.');
  return {question:entry.question.trim(), status:entry.status, facts:facts.map(f => f.trim()), source:source.trim()};
}

export async function runReview(definition, cases) {
  if (!Array.isArray(cases) || !cases.length || cases.length > 50) throw Error('Add between 1 and 50 questions.');
  const validated = cases.map(validateCase);
  if (new Set(validated.map(c => c.question.toLowerCase())).size !== validated.length) throw Error('Each review question must be distinct.');
  const bytes = new TextEncoder().encode(JSON.stringify(definition));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const results = validated.map(entry => {
    const actual = answer(definition, entry.question);
    const issues = [];
    if (actual.status !== entry.status) issues.push('Expected '+entry.status+'; observed '+actual.status+'.');
    for (const fact of entry.facts) {
      if (!containsPhrase(actual.text, fact)) issues.push('Missing phrase: '+fact);
    }
    if (entry.source && !actual.citations.some(c => c.source === entry.source)) issues.push('Missing source: '+entry.source);
    return {passed:issues.length === 0, issues, actual};
  });
  return {version:1, definitionSha256:Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join(''),
    passed:results.filter(r => r.passed).length, total:results.length, cases:validated, results};
}
