import os,sys
os.environ['HF_HUB_OFFLINE']='1'
from pathlib import Path
import torch
from transformers import AutoModel
model=AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2',revision='c9745ed1d9f207416be6d2e6f8de32d1f16199bf',local_files_only=True,attn_implementation='eager')
class Embeddings(torch.nn.Module):
 def __init__(self):
  super().__init__()
  self.encoder=model
 def forward(self,input_ids,attention_mask):
  features=self.encoder(input_ids=input_ids,attention_mask=attention_mask).last_hidden_state
  mask=attention_mask.unsqueeze(-1)
  return torch.nn.functional.normalize((features*mask).sum(1)/mask.sum(1),dim=-1)
out=Path(sys.argv[1])
torch.onnx.export(Embeddings().eval(),(torch.ones(2,8,dtype=torch.long),torch.ones(2,8,dtype=torch.long)),str(out),input_names=['input_ids','attention_mask'],output_names=['embeddings'],dynamic_axes={'input_ids':{0:'batch',1:'sequence'},'attention_mask':{0:'batch',1:'sequence'},'embeddings':{0:'batch'}},opset_version=17,dynamo=False)
