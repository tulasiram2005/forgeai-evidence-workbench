# Build review

Deterministic local compiler

## Evaluation rounds

- Round 1 · 45/48 · tuning 34/36 · validation 11/12 · accepted
- Round 2 · 48/48 · tuning 36/36 · validation 12/12 · accepted

Released round 2. Frozen test scored once after selection.

## Judge controls

- Always refuses · rejected
- Always answers · rejected
- Fabricated number · rejected
- Wrong source · rejected

## Results by class

- paraphrase · 30/30
- cross-source · 3/3
- grounded · 4/4
- scope gap · 1/1
- missing attribute · 2/2
- out of scope · 3/3
- near-domain refusal · 2/2
- ambiguous · 2/2
- instruction boundary · 1/1

## Refusal quality

- Precision · 11/11
- Recall · 11/11

## Remaining failures

All generated checks passed.

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 36/36 (95% Wilson 90.4% to 100.0%)
validate 12/12 (95% Wilson 75.8% to 100.0%)
test 12/12 (95% Wilson 75.8% to 100.0%)

Test slice SHA-256 6faca1e01f6efa717c0f3683d446fc4af9433e5eeb0a187c5b843f6c07292776
