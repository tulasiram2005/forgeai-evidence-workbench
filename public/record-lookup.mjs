// Match a named field and a complete record key. Preserve identifier punctuation and zeros.
const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const keyHeader = /^(?:(?:record|asset|item|part|product|equipment|order)[ _-]+)?(?:id|code|sku|identifier|number)$/i;
const fieldRequest = /^(?:(?:what is|what's|show me|show|give me|look up) (?:the )?)?(.+?) (?:for|of) (.+)$/;

export function recordLookup(definition, question) {
  if (!definition.tools?.includes('csv_lookup')) return null;
  const request = normalize(question).replace(/\?$/, '').trim().match(fieldRequest);
  if (!request) return null;

  const [, field, key] = request;
  const matches = [];
  for (const chunk of definition.chunks) {
    if (!Array.isArray(chunk.columns) || !Array.isArray(chunk.row)) continue;
    const keys = chunk.columns.filter(header => keyHeader.test(header.trim()));
    if (keys.length !== 1) continue;
    const rowKey = chunk.row[chunk.columns.indexOf(keys[0])];
    if (normalize(rowKey ?? '') !== key) continue;
    const fields = chunk.columns.filter(header => normalize(header) === field);
    if (!fields.length) continue;
    if (fields.length > 1) return null;
    const value = chunk.row[chunk.columns.indexOf(fields[0])] ?? '';
    const {id, source, text} = chunk;
    matches.push({value, citation: {id, source, text}});
  }

  if (matches.length > 1) {
    return {
      status: 'clarify',
      text: 'More than one row matches this record and field. Check the source rows before choosing a value.',
      citations: matches.map(match => match.citation)
    };
  }
  if (!matches.length || !matches[0].value.trim()) return null;
  return {status: 'answered', text: matches[0].value, tool: 'csv_lookup', citations: [matches[0].citation]};
}
