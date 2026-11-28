# Build review

qwen2.5:1.5b

## Evaluation rounds

- Round 1 · 24/48 · tuning 18/36 · validation 6/12 · accepted
- Round 2 · 24/48 · tuning 18/36 · validation 6/12 · rejected

Released round 1. Frozen test scored once after selection.

## Judge controls

- Always refuses · rejected
- Always answers · rejected
- Fabricated number · rejected
- Wrong source · rejected

## Results by class

- cross-source · 0/3
- paraphrase · 12/30
- paraphrase-hard · 0/3
- grounded · 4/4
- out of scope · 2/2
- near-domain refusal · 2/2
- ambiguous · 2/2
- instruction boundary · 1/1
- scope gap · 1/1

## Refusal quality

- Precision · 8/42
- Recall · 8/8

## Remaining failures

- E11 · wrong refusal · Explain Approval owner and also R12 bookbinding kit?
- E12 · wrong refusal · Explain Bookbinding pickup and also R12 bookbinding kit?
- E13 · wrong refusal · Explain Press release and also R12 bookbinding kit?
- E36 · wrong refusal · Give the details for Approval owner?
- E38 · wrong refusal · Give the details for Bookbinding pickup?
- E39 · wrong refusal · Give the details for Press release?
- E37 · wrong refusal · Give the details for R12 bookbinding kit?
- E07 · wrong refusal · How long does it take to complete the bookbinding procedures?
- E10 · wrong refusal · How long should the press release be allowed to be printed?
- E52 · wrong refusal · Tell me about Approval owner?
- E54 · wrong refusal · Tell me about Bookbinding pickup?
- E55 · wrong refusal · Tell me about Press release?
- E53 · wrong refusal · Tell me about R12 bookbinding kit?
- E40 · wrong refusal · What does the source say about Approval owner?
- E42 · wrong refusal · What does the source say about Bookbinding pickup?
- E43 · wrong refusal · What does the source say about Press release?
- E41 · wrong refusal · What does the source say about R12 bookbinding kit?
- E56 · wrong refusal · What information covers Approval owner?
- E09 · wrong refusal · Where should the bookbinding materials be picked up?
- E44 · wrong refusal · Which passage explains Approval owner?
- E46 · wrong refusal · Which passage explains Bookbinding pickup?
- E47 · wrong refusal · Which passage explains Press release?
- E45 · wrong refusal · Which passage explains R12 bookbinding kit?
- E05 · wrong refusal · Who is the approval owner for the bookbinding procedures?
- E58 · wrong refusal · What information covers Bookbinding pickup?
- E59 · wrong refusal · What information covers Press release?
- E57 · wrong refusal · What information covers R12 bookbinding kit?
- E48 · wrong refusal · What is documented about Approval owner?
- E50 · wrong refusal · What is documented about Bookbinding pickup?
- E51 · wrong refusal · What is documented about Press release?
- E49 · wrong refusal · What is documented about R12 bookbinding kit?
- E06 · wrong refusal · What is the code for the bookbinding kit with a quantity of 14 units?
- E08 · wrong refusal · What is the job title of the person who approves the owner's request?
- E60 · wrong refusal · What should I know about Approval owner?

## Limits

Generated paraphrases can share source vocabulary and templates.

## Frozen split scores

tune 18/36 (95% Wilson 34.5% to 65.5%)
validate 6/12 (95% Wilson 25.4% to 74.6%)
test 2/12 (95% Wilson 4.7% to 44.8%)

Test slice SHA-256 ac1f9eea20244b7ac3477985c89277ddbeee6b80c91abeef63608e48952e1d9a

## Release verdict

DO NOT SHIP for autonomous answering.

Easy tier 26/56. Hard model paraphrases 0/4.

Evidence-first forecast for overall case pass 46.8%, retrospective pilot n=5. Includes correct refusals and clarifications.
