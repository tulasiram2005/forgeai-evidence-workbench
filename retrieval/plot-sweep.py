"""Plot committed threshold measurements. Run from the repository root."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
data=json.loads(Path('public/runs/threshold-sweep.json').read_text())['points']
with plt.rc_context({'svg.fonttype':'none','svg.hashsalt':'forgeai-operating-curve','font.size':10}):
    fig,ax=plt.subplots(figsize=(8.8,4.5),layout='constrained')
    for key,label,color,marker in [('answerableRecall','Grounded answer recall','#205941','o'),
        ('refusalRecall','Refusal recall','#244871','s'),('nearMissFalseAnswers','Near-miss false answers','#8b422e','^')]:
        ax.plot([r['minimum'] for r in data],[r[key]['rate']*100 for r in data],marker=marker,color=color,label=label)
    ax.axvline(.5,color='0.5',linestyle=':',label='Frozen operating point')
    ax.set(xlabel='Minimum dense cosine similarity',ylabel='Share of eligible questions (%)',ylim=(-4,104),title='Confidence threshold on the original holdout')
    ax.spines[['right','top']].set_visible(False)
    ax.legend(loc='center left',bbox_to_anchor=(1,.5),frameon=False)
    fig.savefig('evidence/v2/threshold-sweep.svg',metadata={'Date':None})
