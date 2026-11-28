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

- Precision · 8/11
- Recall · 8/8

## Remaining failures

- E08 · wrong refusal · How long does it take to pick up a screen printing job?
- E05 · wrong refusal · Who is the approval owner for the printmaking kit?
- E07 · wrong refusal · What is the estimated time for a printmaking pickup?

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 35/36 (95% Wilson 85.8% to 99.5%)
validate 11/12 (95% Wilson 64.6% to 98.5%)
test 11/12 (95% Wilson 64.6% to 98.5%)

Test slice SHA-256 6a4d5d833eeee5704d5bd1811b0190fe553d136f5b625371f3a67a79b0ff67e7
