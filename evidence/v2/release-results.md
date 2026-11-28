# All-suite comparison

The extractive judge rechecks recorded outputs against original passages. Holdouts 1 to 3 informed development. Holdout 4 is prospective. Pooling them describes the full collection and cannot substitute for the fresh-suite result.

| Suite | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |
|---|---|---:|---:|---:|---:|---:|
| holdout | V2 contextual | 54/75 | 15/30 [33.2%, 66.8%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 75.0% |
| holdout | Always refuse | 30/75 | 0/30 [0.0%, 11.4%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 50.0% |
| holdout | Always answer with top-1 | 9/75 | 9/30 [16.7%, 47.9%] | 0/30 [0.0%, 11.4%] | 15/15 [79.6%, 100.0%] | 15.0% |
| holdout2 | V2 contextual | 29/60 | 7/33 [10.7%, 37.8%] | 14/18 [54.8%, 91.0%] | 4/18 [9.0%, 45.2%] | 49.5% |
| holdout2 | Always refuse | 18/60 | 0/33 [0.0%, 10.4%] | 18/18 [82.4%, 100.0%] | 0/18 [0.0%, 17.6%] | 50.0% |
| holdout2 | Always answer with top-1 | 9/60 | 9/33 [15.1%, 44.2%] | 0/18 [0.0%, 17.6%] | 18/18 [82.4%, 100.0%] | 13.6% |
| holdout3 | V2 contextual | 32/60 | 7/30 [11.8%, 40.9%] | 19/24 [59.5%, 90.8%] | 5/24 [9.2%, 40.5%] | 51.2% |
| holdout3 | Always refuse | 24/60 | 0/30 [0.0%, 11.4%] | 24/24 [86.2%, 100.0%] | 0/24 [0.0%, 13.8%] | 50.0% |
| holdout3 | Always answer with top-1 | 7/60 | 7/30 [11.8%, 40.9%] | 0/24 [0.0%, 13.8%] | 24/24 [86.2%, 100.0%] | 11.7% |
| holdout4 | V2 contextual | 22/60 | 1/30 [0.6%, 16.7%] | 15/24 [42.7%, 78.8%] | 9/24 [21.2%, 57.3%] | 32.9% |
| holdout4 | Always refuse | 24/60 | 0/30 [0.0%, 11.4%] | 24/24 [86.2%, 100.0%] | 0/24 [0.0%, 13.8%] | 50.0% |
| holdout4 | Always answer with top-1 | 2/60 | 2/30 [1.8%, 21.3%] | 0/24 [0.0%, 13.8%] | 24/24 [86.2%, 100.0%] | 3.3% |
| pooled | V2 contextual | 137/255 | 30/123 [17.7%, 32.7%] | 78/96 [72.3%, 87.8%] | 18/81 [14.5%, 32.4%] | 52.8% |
| pooled | Always refuse | 96/255 | 0/123 [0.0%, 3.0%] | 96/96 [96.2%, 100.0%] | 0/81 [0.0%, 4.5%] | 50.0% |
| pooled | Always answer with top-1 | 27/255 | 27/123 [15.5%, 30.1%] | 0/96 [0.0%, 3.8%] | 81/81 [95.5%, 100.0%] | 11.0% |
