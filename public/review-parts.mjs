// Each part is an independently stated question. Never infer a shared entity or condition.
import {strictAnswer} from './evidence-first.mjs';

function reviewPart(definition, question) {
  const result = strictAnswer(definition, question);
  if (result.status !== 'refused') return result;

  // Allow a question requesting an exact source label. Keep substantive words intact.
  const request = question.match(/^(?:what is|what are) (?:the )?([^?]+)\??$/i);
  if (!request) return result;
  const label = request[1].trim().toLowerCase();
  const passages = definition.chunks.filter(chunk => !chunk.row && chunk.topic.toLowerCase() === label);
  const citations = passages.map(({id, source, text, page}) => ({id, source, text, ...(page ? {page} : {})}));
  if (citations.length === 1) return {status:'answered', text:citations[0].text, citations};
  if (citations.length > 1) return {status:'clarify', text:'Several passages use this label. Inspect the sources before applying a rule.', citations};
  return result;
}

export function reviewParts(definition, questions) {
  if (definition.runtime?.kind !== 'evidence-first') throw Error('This experiment requires an evidence-first definition.');
  if (questions.length < 2 || questions.length > 8) throw Error('Supply two to eight independent questions, each as a separate argument.');
  const parts = questions.map(question => {
    if (!question.trim() || question.length > 2000) throw Error('Each question must contain 1 to 2,000 characters.');
    return {question, ...reviewPart(definition, question.trim())};
  });
  const answered = parts.filter(part => part.status === 'answered').length;
  const coverage = answered === parts.length ? 'complete' : answered ? 'partial' : 'unresolved';
  return {experimental:true, coverage, parts};
}
