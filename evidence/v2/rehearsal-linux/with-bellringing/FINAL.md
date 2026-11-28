# Build review

qwen2.5:1.5b

## Evaluation rounds

- Round 1 · 43/48 · tuning 32/36 · validation 11/12 · accepted
- Round 2 · 46/48 · tuning 35/36 · validation 11/12 · accepted

Released round 2. Frozen test scored once after selection.

## Judge controls

- Always refuses · rejected
- Always answers · rejected
- Fabricated number · rejected
- Wrong source · rejected

## Results by class

- cross-source · 3/3
- paraphrase · 31/33
- grounded · 4/4
- out of scope · 2/2
- near-domain refusal · 2/2
- ambiguous · 2/2
- instruction boundary · 1/1
- scope gap · 1/1

## Refusal quality

- Precision · 8/10
- Recall · 8/8

## Remaining failures

- E07 · retrieval miss · How long does it take for access to the tower based on the schedule provided?
- E05 · wrong refusal · Who is the approval owner for the R12 bellringing kit?
- E06 · wrong refusal · What is the quantity of the R12 bellringing kit inventory record?

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 35/36 (95% Wilson 85.8% to 99.5%)
validate 11/12 (95% Wilson 64.6% to 98.5%)
test 11/12 (95% Wilson 64.6% to 98.5%)

Test slice SHA-256 4677ea114a89dffab5061ac4dbbd966ad9d0fb119fbb0ebf32d06402876268c6
