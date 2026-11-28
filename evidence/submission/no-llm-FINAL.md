# Build review

Deterministic local compiler

## Evaluation rounds

- Round 1 · 27/48 · tuning 21/36 · validation 6/12 · accepted
- Round 2 · 27/48 · tuning 21/36 · validation 6/12 · rejected

Released round 1. Frozen test scored once after selection.

## Judge controls

- Always refuses · rejected
- Always answers · rejected
- Fabricated number · rejected
- Wrong source · rejected

## Results by class

- paraphrase · 12/30
- cross-source · 0/3
- grounded · 4/4
- scope gap · 1/1
- missing attribute · 2/2
- out of scope · 3/3
- near-domain refusal · 2/2
- ambiguous · 2/2
- instruction boundary · 1/1

## Refusal quality

- Precision · 11/42
- Recall · 11/11

## Remaining failures

- E06 · wrong refusal · Explain Bookbinding pickup and also R12 bookbinding kit?
- E07 · wrong refusal · Explain Press release and also R12 bookbinding kit?
- E33 · wrong refusal · Give the details for Approval owner?
- E35 · wrong refusal · Give the details for Bookbinding pickup?
- E36 · wrong refusal · Give the details for Press release?
- E34 · wrong refusal · Give the details for R12 bookbinding kit?
- E49 · wrong refusal · Tell me about Approval owner?
- E51 · wrong refusal · Tell me about Bookbinding pickup?
- E52 · wrong refusal · Tell me about Press release?
- E50 · wrong refusal · Tell me about R12 bookbinding kit?
- E37 · wrong refusal · What does the source say about Approval owner?
- E39 · wrong refusal · What does the source say about Bookbinding pickup?
- E40 · wrong refusal · What does the source say about Press release?
- E38 · wrong refusal · What does the source say about R12 bookbinding kit?
- E53 · wrong refusal · What information covers Approval owner?
- E05 · wrong refusal · Explain Approval owner and also R12 bookbinding kit?
- E58 · wrong refusal · What should I know about R12 bookbinding kit?
- E41 · wrong refusal · Which passage explains Approval owner?
- E43 · wrong refusal · Which passage explains Bookbinding pickup?
- E44 · wrong refusal · Which passage explains Press release?
- E42 · wrong refusal · Which passage explains R12 bookbinding kit?
- E55 · wrong refusal · What information covers Bookbinding pickup?
- E56 · wrong refusal · What information covers Press release?
- E54 · wrong refusal · What information covers R12 bookbinding kit?
- E45 · wrong refusal · What is documented about Approval owner?
- E47 · wrong refusal · What is documented about Bookbinding pickup?
- E48 · wrong refusal · What is documented about Press release?
- E46 · wrong refusal · What is documented about R12 bookbinding kit?
- E57 · wrong refusal · What should I know about Approval owner?
- E59 · wrong refusal · What should I know about Bookbinding pickup?
- E60 · wrong refusal · What should I know about Press release?

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 21/36 (95% Wilson 42.2% to 72.9%)
validate 6/12 (95% Wilson 25.4% to 74.6%)
test 2/12 (95% Wilson 4.7% to 44.8%)

Test slice SHA-256 bcc5542b922c495a8c44e33f1cdd09cf60e28afef68006c5486f24c8c3ef9429

## Release verdict

DO NOT SHIP for autonomous answering.

Easy tier 29/60. Hard model paraphrases unmeasured.

Evidence-first forecast for overall case pass 46.8%, retrospective pilot n=5. Includes correct refusals and clarifications.
