# Holdout 4 release decision

Both preregistered effectiveness criteria failed. Keep this release in review. The judge stress controls passed.

| Corpus | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |
|---|---|---:|---:|---:|---:|---:|
| ceramics | V2 contextual | 7/20 | 0/10 [0.0%, 27.8%] | 5/8 [30.6%, 86.3%] | 3/8 [13.7%, 69.4%] | 31.2% |
| ceramics | Always refuse | 8/20 | 0/10 [0.0%, 27.8%] | 8/8 [67.6%, 100.0%] | 0/8 [0.0%, 32.4%] | 50.0% |
| ceramics | Always answer with top-1 | 1/20 | 1/10 [1.8%, 40.4%] | 0/8 [0.0%, 32.4%] | 8/8 [67.6%, 100.0%] | 5.0% |
| cinema | V2 contextual | 9/20 | 1/10 [1.8%, 40.4%] | 6/8 [40.9%, 92.9%] | 2/8 [7.1%, 59.1%] | 42.5% |
| cinema | Always refuse | 8/20 | 0/10 [0.0%, 27.8%] | 8/8 [67.6%, 100.0%] | 0/8 [0.0%, 32.4%] | 50.0% |
| cinema | Always answer with top-1 | 0/20 | 0/10 [0.0%, 27.8%] | 0/8 [0.0%, 32.4%] | 8/8 [67.6%, 100.0%] | 0.0% |
| rowing | V2 contextual | 6/20 | 0/10 [0.0%, 27.8%] | 4/8 [21.5%, 78.5%] | 4/8 [21.5%, 78.5%] | 25.0% |
| rowing | Always refuse | 8/20 | 0/10 [0.0%, 27.8%] | 8/8 [67.6%, 100.0%] | 0/8 [0.0%, 32.4%] | 50.0% |
| rowing | Always answer with top-1 | 1/20 | 1/10 [1.8%, 40.4%] | 0/8 [0.0%, 32.4%] | 8/8 [67.6%, 100.0%] | 5.0% |
| pooled | V2 contextual | 22/60 | 1/30 [0.6%, 16.7%] | 15/24 [42.7%, 78.8%] | 9/24 [21.2%, 57.3%] | 32.9% |
| pooled | Always refuse | 24/60 | 0/30 [0.0%, 11.4%] | 24/24 [86.2%, 100.0%] | 0/24 [0.0%, 13.8%] | 50.0% |
| pooled | Always answer with top-1 | 2/60 | 2/30 [1.8%, 21.3%] | 0/24 [0.0%, 13.8%] | 24/24 [86.2%, 100.0%] | 3.3% |
