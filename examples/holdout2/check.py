"""Reject excessive content-word overlap with any individual gold passage."""
import csv,json,re
from pathlib import Path
from pypdf import PdfReader
STOP=set('a an the is are was be as at to how what which who where when do does did i me my it in on of from for with and or should must can may will have after before also that each'.split())
def words(s):return set(re.findall(r'[a-z0-9]+',s.lower()))-STOP
root=Path(__file__).resolve().parent
for p in sorted(root.glob('*/cases.json')):
 rows=json.loads(p.read_text())
 assert len(rows)==20 and len(set(r['question'] for r in rows))==20
 for row in rows:
  query=words(row['question'])
  for fact,source in zip(row.get('facts',[]),row.get('sources',[]),strict=True):
   f=p.parent/'docs'/source
   if f.suffix=='.pdf':lines=[s for page in PdfReader(f).pages for s in page.extract_text().splitlines()]
   elif f.suffix=='.csv':
    with f.open() as stream:lines=[' '.join(k+' '+v for k,v in r.items()) for r in csv.DictReader(stream)]
   else:lines=f.read_text().splitlines()
   gold=[line for line in lines if fact.lower() in line.lower()]
   assert gold,(source,fact)
   assert max(len(query & words(line))/len(query) for line in gold)<=0.6,(row['question'],gold)
 print(p.parent.name,len(rows),'validated')
