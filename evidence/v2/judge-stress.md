# Judge stress tests

The stricter extractive judge verifies original passage identity and text, accepts normalized facts, and rejects unsupported additions. Historical scores retain their original judge. The perturbation denominator counts applicable transformations on passing oracle and recorded contextual responses. Formatting trials measure only the listed equivalent forms. No eligible suite answer contained a calendar date. Equivalent and changed calendar dates were checked on a separate dated fixture.

## holdout

| Agent | Correct cases |
|---|---:|
| alwaysRefuse | 30/75 |
| alwaysAnswerTop1 | 9/75 |
| fabricateNumber | 0/75 |
| citeWrongSource | 0/75 |
| copyQuestion | 0/75 |
| oracle | 75/75 |

| Perturbation | Verdict flips / eligible |
|---|---:|
| oracle number change | 30/30 |
| oracle appended claim | 30/30 |
| oracle triple padding | 30/30 |
| oracle case | 0/30 |
| oracle whitespace | 0/30 |
| oracle punctuation | 0/30 |
| oracle number words | 0/29 |
| oracle unit variants | 0/18 |
| oracle source swap | 30/30 |
| contextual number change | 15/15 |
| contextual appended claim | 15/15 |
| contextual triple padding | 15/15 |
| contextual case | 0/15 |
| contextual whitespace | 0/15 |
| contextual punctuation | 0/15 |
| contextual number words | 0/14 |
| contextual unit variants | 0/5 |
| contextual source swap | 15/15 |
| date formats | 0/0 |

Correct paraphrase false failures: 0/201.

## holdout2

| Agent | Correct cases |
|---|---:|
| alwaysRefuse | 18/60 |
| alwaysAnswerTop1 | 9/60 |
| fabricateNumber | 0/60 |
| citeWrongSource | 0/60 |
| copyQuestion | 0/60 |
| oracle | 60/60 |

| Perturbation | Verdict flips / eligible |
|---|---:|
| oracle appended claim | 33/33 |
| oracle triple padding | 33/33 |
| oracle case | 0/31 |
| oracle whitespace | 0/33 |
| oracle punctuation | 0/33 |
| oracle source swap | 33/33 |
| oracle number change | 11/11 |
| oracle number words | 0/9 |
| contextual appended claim | 7/7 |
| contextual triple padding | 7/7 |
| contextual case | 0/7 |
| contextual whitespace | 0/7 |
| contextual punctuation | 0/7 |
| contextual source swap | 7/7 |
| contextual number change | 2/2 |
| contextual number words | 0/2 |
| date formats | 0/0 |

Correct paraphrase false failures: 0/129.

## holdout3

| Agent | Correct cases |
|---|---:|
| alwaysRefuse | 24/60 |
| alwaysAnswerTop1 | 7/60 |
| fabricateNumber | 0/60 |
| citeWrongSource | 0/60 |
| copyQuestion | 0/60 |
| oracle | 60/60 |

| Perturbation | Verdict flips / eligible |
|---|---:|
| oracle number change | 11/11 |
| oracle appended claim | 30/30 |
| oracle triple padding | 30/30 |
| oracle case | 0/29 |
| oracle whitespace | 0/30 |
| oracle punctuation | 0/30 |
| oracle number words | 0/11 |
| oracle unit variants | 0/7 |
| oracle source swap | 30/30 |
| contextual number change | 4/4 |
| contextual appended claim | 7/7 |
| contextual triple padding | 7/7 |
| contextual case | 0/7 |
| contextual whitespace | 0/7 |
| contextual punctuation | 0/7 |
| contextual number words | 0/4 |
| contextual unit variants | 0/3 |
| contextual source swap | 7/7 |
| date formats | 0/0 |

Correct paraphrase false failures: 0/135.
