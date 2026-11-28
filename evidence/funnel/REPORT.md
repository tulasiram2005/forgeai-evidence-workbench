# Failure funnel

Each answerable case is assigned to the first observed loss. Exact gold passages passed the extractive judge in every suite. Rankings cover all required facts in their specified sources. Gate loss means that the full-question hybrid top three covered the facts and the released runner returned a non-answer. This includes early guards and compound-question handling. Rank coverage alone does not prove that removing a particular guard would fix the case.

| Development suite | Answerable | Oracle passed | Outside top three among failures | Withheld with evidence in top three | Correct response |
|---|---:|---:|---:|---:|---:|
| holdout | 30 | 30 | 4 | 11 | 15 |
| holdout2 | 33 | 33 | 3 | 23 | 7 |
| holdout3 | 30 | 30 | 1 | 22 | 7 |
| holdout4 | 30 | 30 | 3 | 26 | 1 |
| pooled | 123 | 123 | 11 | 82 | 30 |

## Separating answerable questions from near misses

Higher values are treated as stronger evidence of answerability. Intervals come from question-level stratified bootstrap resampling. The shared corpora and authoring templates limit generalization.

| Signal | Pooled AUROC | 95% interval |
|---|---:|---:|
| cosine | 0.495 | 0.411 to 0.576 |
| margin | 0.351 | 0.282 to 0.428 |
| idfCoverage | 0.088 | 0.048 to 0.134 |
| reranker | 0.245 | 0.178 to 0.321 |

Lexical coverage and reranker confidence often rated near misses higher. A plausible reason is that an unsupported attribute can be asked using many words copied from a relevant source. The observed association does not establish causation. No score reversal or threshold adjustment was fitted.
