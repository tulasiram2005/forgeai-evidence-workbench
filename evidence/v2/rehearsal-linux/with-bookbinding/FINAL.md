# Build review

qwen2.5:1.5b

## Evaluation rounds

- Round 1 · 44/48 · tuning 32/36 · validation 12/12 · accepted
- Round 2 · 47/48 · tuning 35/36 · validation 12/12 · accepted

Released round 2. Frozen test scored once after selection.

## Judge controls

- Always refuses · rejected
- Always answers · rejected
- Fabricated number · rejected
- Wrong source · rejected

## Results by class

- cross-source · 3/3
- paraphrase · 31/32
- grounded · 4/4
- scope gap · 1/1
- out of scope · 3/3
- near-domain refusal · 2/2
- ambiguous · 2/2
- instruction boundary · 1/1

## Refusal quality

- Precision · 9/11
- Recall · 9/9

## Remaining failures

- E06 · wrong refusal · How long does it typically take to complete a press release related to bookbinding procedures?
- E05 · wrong refusal · What is the quantity of the R12 bookbinding kit in the inventory?

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 35/36 (95% Wilson 85.8% to 99.5%)
validate 12/12 (95% Wilson 75.8% to 100.0%)
test 11/12 (95% Wilson 64.6% to 98.5%)

Test slice SHA-256 db618b80e25fe4e0a3a2223f9d4fac7450876f57e554d4fae84ac6d6b1ab7f10
