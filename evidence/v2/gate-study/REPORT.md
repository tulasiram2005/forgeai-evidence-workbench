# Gate release evaluation

**Decision: keep the calibrated gate experimental.** It accepts too few supported answers. Its generated examples are direct questions about passage labels. Those examples make it easy to pass calibration without learning the vocabulary real reviewers use. The training cap applies to generated negatives only.

## Reconciled development baselines

| Configuration | Configuration commit | Judge | Holdout 1 | Holdout 2 |
|---|---|---|---:|---:|
| V1 lexical | `6672204` | fact-source-v1 | 35/75 | 24/60 |
| Structured lexical, split | `efb689a` | fact-source-v1 | 39/75 | 24/60 |
| Dense fallback | `6875964` | fact-source-v1 | 47/75 | 25/60 |
| V2 contextual, original IDs | `1d6e13c` | fact-source-v1 | 54/75 | 29/60 |
| V2 contextual, normalized IDs | `6c68b0e` | fact-source-v1 | 54/75 | 29/60 |
| V2 with local index expansion | `e6db09c` | fact-source-v1 | 49/75 | 27/60 |
| Portable encoder, earlier gate | `9cffce0` | fact-source-v1 | 48/75 | 26/60 |
| V2 + calibrated gate | `972af33` | fact-source-v1 | 39/75 | 25/60 |
| Calibrated gate + CLI reranker | `972af33` | fact-source-v1 | 39/75 | 25/60 |

The 35/75 receipt used lexical retrieval. The later 47/75 receipt used the dense fallback. They measure different runners on identical questions. The commit column identifies the scoring configuration. Some later-suite evaluations replay earlier configurations. Original and normalized IDs tied on the two development suites. V2 below uses normalized IDs on all three suites. Every saved verdict was cross-checked against the frozen expected status, tokenized key facts and specified source filenames. The judge originated at 6672204 and was extracted as scoreCase at e6db09c.

## Class metrics with 95% Wilson intervals

Counts precede percentage intervals. Answerable recall requires correct facts and citations. Refusal recall requires an explicit refusal. Near-miss false-answer rate counts an answered response to a near-miss question. Ambiguity is scored separately in the overall pass count.

| Suite | Configuration | Overall | Answerable recall | Refusal recall | False answers on near misses |
|---|---|---:|---:|---:|---:|
| first | V1 lexical | 35/75 | 0/30 [0.0, 11.4%] | 26/30 [70.3, 94.7%] | 4/15 [10.9, 52.0%] |
| first | V2 contextual, normalized IDs | 54/75 | 15/30 [33.2, 66.8%] | 30/30 [88.6, 100.0%] | 0/15 [0.0, 20.4%] |
| first | V2 + calibrated gate | 39/75 | 0/30 [0.0, 11.4%] | 30/30 [88.6, 100.0%] | 0/15 [0.0, 20.4%] |
| second | V1 lexical | 24/60 | 0/33 [0.0, 10.4%] | 16/18 [67.2, 96.9%] | 2/18 [3.1, 32.8%] |
| second | V2 contextual, normalized IDs | 29/60 | 7/33 [10.7, 37.8%] | 14/18 [54.8, 91.0%] | 4/18 [9.0, 45.2%] |
| second | V2 + calibrated gate | 25/60 | 0/33 [0.0, 10.4%] | 17/18 [74.2, 99.0%] | 1/18 [1.0, 25.8%] |
| third | V1 lexical | 26/60 | 0/30 [0.0, 11.4%] | 20/24 [64.1, 93.3%] | 4/24 [6.7, 35.9%] |
| third | V2 contextual, normalized IDs | 32/60 | 7/30 [11.8, 40.9%] | 19/24 [59.5, 90.8%] | 5/24 [9.2, 40.5%] |
| third | V2 + calibrated gate | 30/60 | 0/30 [0.0, 11.4%] | 24/24 [86.2, 100.0%] | 0/24 [0.0, 13.8%] |

Interval widths reflect small denominators. Shared synthetic question patterns and shared sources violate independence, so these intervals describe uncertainty under a question-level binomial assumption. They are not deployment guarantees.

## Holdout 2 error analysis

| Corpus | Refused by gate | Answered without facts | Answered from wrong source | Retrieval miss |
|---|---:|---:|---:|---:|
| onboarding | 7 | 0 | 0 | 2 |
| vendors | 6 | 0 | 0 | 1 |
| digitizer | 8 | 0 | 0 | 2 |

Rank traces replay the original contextual release and assert exact agreement with the recorded answer. For multi-part questions the retrieval diagnostic uses the union of observed top-three lists. See the trace before interpreting an individual attribution.

## Frozen protocol and tradeoffs

Holdouts 1 and 2 are development data. Their past failures informed the choice of features. No questions or labels from any holdout enter calibration. Holdout 3 was committed at 68c4988 before scoring. Its first contextual executions were saved at ddc477b. The gate was frozen at 972af33 before scoring it on holdout 3. No post-score retuning was applied.

The portable system changes both encoder and gate relative to historical MiniLM V2. The portable-encoder control in metrics.json keeps the previous gate. On holdout 3 the control passed 27/60. A higher total driven by more refusals does not demonstrate improved supported answering. The optional reranker is a separate development experiment. It was excluded from holdout 3 to preserve the declared comparison.

[All counts and curves manifest](metrics.json) · [Per-question failure evidence](../error-analysis-holdout2.json) · [Raw gate receipts with generated calibration pairs and curves](gate/) · [First third-suite receipts](../holdout3/frozen/) · [Browser and CLI parity receipt](browser-cli-parity.json)

## Development reference comparison

| Suite | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |
|---|---|---:|---:|---:|---:|---:|
| pooled | V2 contextual, normalized IDs | 115/195 | 29/93 [22.7%, 41.2%] | 63/72 [77.9%, 93.3%] | 9/57 [8.5%, 27.4%] | 59.3% |
| pooled | Always refuse | 72/195 | 0/93 [0.0%, 4.0%] | 72/72 [94.9%, 100.0%] | 0/57 [0.0%, 6.3%] | 50.0% |
| pooled | Always answer with top-1 | 25/195 | 25/93 [18.9%, 36.7%] | 0/72 [0.0%, 5.1%] | 57/57 [93.7%, 100.0%] | 13.4% |

[Full suite comparisons, interval definitions and historical configurations](../reference-results.md)
