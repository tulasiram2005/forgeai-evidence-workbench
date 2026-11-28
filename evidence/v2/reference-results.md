# Development reference results

Balanced accuracy gives equal weight to correct supported answers and correct refusals. Overall passes also include ambiguity. Intervals are question-level Wilson 95% intervals. Each pooled row combines case counts across all suites before calculating recalls. Historical configurations with incomplete suite coverage have individual suite rows only.

| Suite | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |
|---|---|---:|---:|---:|---:|---:|
| holdout | V1 lexical | 35/75 | 0/30 [0.0%, 11.4%] | 26/30 [70.3%, 94.7%] | 4/15 [10.9%, 52.0%] | 43.3% |
| holdout | Structured lexical, split | 39/75 | 0/30 [0.0%, 11.4%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 50.0% |
| holdout | Dense fallback | 47/75 | 8/30 [14.2%, 44.4%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 63.3% |
| holdout | V2 contextual, original IDs | 54/75 | 15/30 [33.2%, 66.8%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 75.0% |
| holdout | V2 contextual, normalized IDs | 54/75 | 15/30 [33.2%, 66.8%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 75.0% |
| holdout | V2 with local index expansion | 49/75 | 10/30 [19.2%, 51.2%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 66.7% |
| holdout | Portable encoder, earlier gate | 48/75 | 10/30 [19.2%, 51.2%] | 29/30 [83.3%, 99.4%] | 1/15 [1.2%, 29.8%] | 65.0% |
| holdout | V2 + calibrated gate | 39/75 | 0/30 [0.0%, 11.4%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 50.0% |
| holdout | Calibrated gate + CLI reranker | 39/75 | 0/30 [0.0%, 11.4%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 50.0% |
| holdout | Always refuse | 30/75 | 0/30 [0.0%, 11.4%] | 30/30 [88.6%, 100.0%] | 0/15 [0.0%, 20.4%] | 50.0% |
| holdout | Always answer with top-1 | 9/75 | 9/30 [16.7%, 47.9%] | 0/30 [0.0%, 11.4%] | 15/15 [79.6%, 100.0%] | 15.0% |
| holdout2 | V1 lexical | 24/60 | 0/33 [0.0%, 10.4%] | 16/18 [67.2%, 96.9%] | 2/18 [3.1%, 32.8%] | 44.4% |
| holdout2 | Structured lexical, split | 24/60 | 0/33 [0.0%, 10.4%] | 16/18 [67.2%, 96.9%] | 2/18 [3.1%, 32.8%] | 44.4% |
| holdout2 | Dense fallback | 25/60 | 5/33 [6.7%, 30.9%] | 12/18 [43.7%, 83.7%] | 6/18 [16.3%, 56.3%] | 40.9% |
| holdout2 | V2 contextual, original IDs | 29/60 | 7/33 [10.7%, 37.8%] | 14/18 [54.8%, 91.0%] | 4/18 [9.0%, 45.2%] | 49.5% |
| holdout2 | V2 contextual, normalized IDs | 29/60 | 7/33 [10.7%, 37.8%] | 14/18 [54.8%, 91.0%] | 4/18 [9.0%, 45.2%] | 49.5% |
| holdout2 | V2 with local index expansion | 27/60 | 4/33 [4.8%, 27.3%] | 15/18 [60.8%, 94.2%] | 3/18 [5.8%, 39.2%] | 47.7% |
| holdout2 | Portable encoder, earlier gate | 26/60 | 9/33 [15.1%, 44.2%] | 9/18 [29.0%, 71.0%] | 9/18 [29.0%, 71.0%] | 38.6% |
| holdout2 | V2 + calibrated gate | 25/60 | 0/33 [0.0%, 10.4%] | 17/18 [74.2%, 99.0%] | 1/18 [1.0%, 25.8%] | 47.2% |
| holdout2 | Calibrated gate + CLI reranker | 25/60 | 0/33 [0.0%, 10.4%] | 17/18 [74.2%, 99.0%] | 1/18 [1.0%, 25.8%] | 47.2% |
| holdout2 | Always refuse | 18/60 | 0/33 [0.0%, 10.4%] | 18/18 [82.4%, 100.0%] | 0/18 [0.0%, 17.6%] | 50.0% |
| holdout2 | Always answer with top-1 | 9/60 | 9/33 [15.1%, 44.2%] | 0/18 [0.0%, 17.6%] | 18/18 [82.4%, 100.0%] | 13.6% |
| holdout3 | V1 lexical | 26/60 | 0/30 [0.0%, 11.4%] | 20/24 [64.1%, 93.3%] | 4/24 [6.7%, 35.9%] | 41.7% |
| holdout3 | V2 contextual, normalized IDs | 32/60 | 7/30 [11.8%, 40.9%] | 19/24 [59.5%, 90.8%] | 5/24 [9.2%, 40.5%] | 51.2% |
| holdout3 | Portable encoder, earlier gate | 27/60 | 7/30 [11.8%, 40.9%] | 14/24 [38.8%, 75.5%] | 10/24 [24.5%, 61.2%] | 40.8% |
| holdout3 | V2 + calibrated gate | 30/60 | 0/30 [0.0%, 11.4%] | 24/24 [86.2%, 100.0%] | 0/24 [0.0%, 13.8%] | 50.0% |
| holdout3 | Always refuse | 24/60 | 0/30 [0.0%, 11.4%] | 24/24 [86.2%, 100.0%] | 0/24 [0.0%, 13.8%] | 50.0% |
| holdout3 | Always answer with top-1 | 7/60 | 7/30 [11.8%, 40.9%] | 0/24 [0.0%, 13.8%] | 24/24 [86.2%, 100.0%] | 11.7% |
| pooled | V1 lexical | 85/195 | 0/93 [0.0%, 4.0%] | 62/72 [76.3%, 92.3%] | 10/57 [9.8%, 29.4%] | 43.1% |
| pooled | V2 contextual, normalized IDs | 115/195 | 29/93 [22.7%, 41.2%] | 63/72 [77.9%, 93.3%] | 9/57 [8.5%, 27.4%] | 59.3% |
| pooled | Portable encoder, earlier gate | 101/195 | 26/93 [19.9%, 37.8%] | 52/72 [61.0%, 81.2%] | 20/57 [24.0%, 48.1%] | 50.1% |
| pooled | V2 + calibrated gate | 94/195 | 0/93 [0.0%, 4.0%] | 71/72 [92.5%, 99.8%] | 1/57 [0.3%, 9.3%] | 49.3% |
| pooled | Always refuse | 72/195 | 0/93 [0.0%, 4.0%] | 72/72 [94.9%, 100.0%] | 0/57 [0.0%, 6.3%] | 50.0% |
| pooled | Always answer with top-1 | 25/195 | 25/93 [18.9%, 36.7%] | 0/72 [0.0%, 5.1%] | 57/57 [93.7%, 100.0%] | 13.4% |
