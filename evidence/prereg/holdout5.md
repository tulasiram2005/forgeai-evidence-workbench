# Fifth suite decision protocol

Earlier suites are development data. Freeze this file, the runner and the strict routing code before committing new fixtures. Run each candidate once after fixture commitment and overlap validation. The rejected SQuAD2 reader exceeded the development false-answer cap and is excluded.

Use extractive-fact-source-v2. Candidates are the frozen contextual runner and a strict evidence-first runner that releases only a uniquely named source topic and otherwise offers labeled pointers. Compare always refusing and always returning the top lexical passage. Overall pass includes ambiguity. Balanced accuracy averages answerable and refusal recall. Compute pooled near-miss false answers and question-level Wilson 95% intervals before choosing the default.

To qualify for automated answering, near-miss false answers must be at most 10% and balanced accuracy at least 60%. Among qualifiers choose highest balanced accuracy, breaking ties by lower false-answer rate and then strict mode. If neither qualifies use strict evidence-first review and narrow the claim. No repeat scoring or fixture revisions.

For subsequent factory verdicts SHIP requires a qualifying prospective candidate, easy and eligible hard recall at least 80% and no failed judge controls. SHIP WITH LIMITS means a qualifying candidate but insufficient evidence on either generated tier. DO NOT SHIP means prospective failure or breached judge controls. The saturation flag means easy accuracy at least 95% and hard recall below 60%; missing hard cases are explicitly unmeasured. Forecast overall natural-question case pass using past suite mean, each suite weighted equally. Retrospective coverage uses leave-one-suite-out, separate from the prospective claim.
863cb5e735578329ec94d0983354b1dd5eeef1865ebd5abc8f77d72b84ba752d  public/contextual.mjs
9aa012fb1cc9eb4e590c5db4679409cd382b8dec3a71e955c5be1c6a778d9416  public/evidence-first.mjs
2c5ec2f6f3c190e626e589f8a9ea623a6b4593481a8e17aaa335db3835247be4  public/engine.mjs
1a8f51431eca1ca53ba085c4705df0e9eb3a0e2b9de8e83975d39d176fff041a  public/identifiers.mjs
cc188d8de5355452907a15cf96ee2b1006cad7e832c65994c6119cd65d9b7276  retrieval/release-runner.mjs
9d8e4d3962b730675f8299b1992207c3c5e0d511a729ce4b5d7f22bdc7725e74  retrieval/stress-judge.mjs
28b24001f00ef03db43e1e5db19e2200d30e9e720e5a133179213c81ab87ce8b  scripts/holdout-five.mjs
