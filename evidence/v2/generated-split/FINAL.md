# Build review

Deterministic local compiler

## Evaluation rounds

- Round 1 · 44/48 · tuning 32/36 · validation 12/12 · accepted
- Round 2 · 48/48 · tuning 36/36 · validation 12/12 · accepted

Released round 2. Frozen test scored once after selection.

## Judge controls

- Always refuses · rejected
- Always answers · rejected
- Fabricated number · rejected
- Wrong source · rejected

## Results by class

- paraphrase · 34/34
- cross-source · 4/4
- scope gap · 2/2
- out of scope · 3/3
- near-domain refusal · 1/1
- ambiguous · 2/2
- grounded · 1/1
- instruction boundary · 1/1

## Refusal quality

- Precision · 9/9
- Recall · 9/9

## Remaining failures

All generated checks passed.

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 36/36 (95% Wilson 90.4% to 100.0%)
validate 12/12 (95% Wilson 75.8% to 100.0%)
test 12/12 (95% Wilson 75.8% to 100.0%)

Test slice SHA-256 29ff010710f3014c744fa5fd1a88b16824fe6edcbf16b31df3d8286451afc495
