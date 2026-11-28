export function passageContext(chunk) {
  if(chunk.section?.length)return chunk.section.join(' > ')+'. '+chunk.text;
  if(chunk.columns?.length && chunk.row){
    const labels={sku:'catalogue item code',pack:'units per pack',qty:'quantity',uom:'unit of measure'};
    return chunk.columns.map((name,i)=>(labels[name.trim().toLowerCase()]??name)+': '+(chunk.row[i]??'')).join('. ');
  }
  return chunk.text;
}
export function rankingText(def,chunk,contextual){
  const source=contextual?passageContext(chunk):chunk.text;
  const entry=contextual && def.searchExpansion?.passages[chunk.id];
  return entry?[source,entry.summary,...entry.questions].join(' '):source;
}
