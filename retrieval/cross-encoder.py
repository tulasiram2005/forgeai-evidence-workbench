"""Score requested pairs locally using the pinned TinyBERT cross-encoder."""
import json, os, sys
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
model_id='cross-encoder/ms-marco-TinyBERT-L-2-v2'
rev='81d1926f67cb8eee2c2be17ca9f793c7c3bd20cc'
folder=os.environ.get('FORGE_RERANKER_CACHE')
source=str(Path(folder)/rev) if folder else model_id
options=dict(revision=rev,local_files_only=True)
tokenizer=AutoTokenizer.from_pretrained(source,**options)
model=AutoModelForSequenceClassification.from_pretrained(source,**options).eval()
torch.set_num_threads(4)
rows=json.load(sys.stdin)
scores=[]
with torch.inference_mode():
    for start in range(0,len(rows),32):
        batch=rows[start:start+32]
        encoded=tokenizer([r['q'] for r in batch],[r['text'] for r in batch],padding=True,truncation=True,max_length=256,return_tensors='pt')
        scores.extend(torch.sigmoid(model(**encoded).logits.flatten()).tolist())
print(json.dumps(scores))
