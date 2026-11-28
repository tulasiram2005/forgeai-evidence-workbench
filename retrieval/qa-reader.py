"""Score each original passage against the SQuAD2 CLS no-answer logit."""
import json, os, sys
import torch
from transformers import AutoModelForQuestionAnswering, AutoTokenizer
MODEL='deepset/minilm-uncased-squad2'
REVISION='934656cdda79824eabf503ed56e15c01ddbdbe3f'
source=os.environ.get('FORGE_QA_CACHE',MODEL)
tok=AutoTokenizer.from_pretrained(source,revision=REVISION,local_files_only=True)
model=AutoModelForQuestionAnswering.from_pretrained(source,revision=REVISION,local_files_only=True).eval()
torch.set_num_threads(4)
pairs=json.load(sys.stdin)
out=[]
with torch.inference_mode():
 for start in range(0,len(pairs),16):
  batch=pairs[start:start+16]
  data=tok([r['question'] for r in batch],[r['text'] for r in batch],padding=True,truncation='only_second',max_length=384,return_offsets_mapping=True,return_tensors='pt')
  offsets=data.pop('offset_mapping')
  result=model(**data)
  for i,row in enumerate(batch):
   s,e=result.start_logits[i],result.end_logits[i]
   indices=[j for j,seq in enumerate(data.sequence_ids(i)) if seq==1]
   score,a,b=max((float(s[a]+e[b]),a,b) for a in indices for b in indices if a<=b<a+30)
   lo=int(offsets[i,a,0]);hi=int(offsets[i,b,1]);null=float(s[0]+e[0])
   out.append(dict(quote=row['text'][lo:hi],start=lo,end=hi,spanScore=score,nullScore=null,margin=score-null))
print(json.dumps(out))
