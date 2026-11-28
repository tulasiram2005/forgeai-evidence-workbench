# ForgeAI · Inspection bench

## Review in 5 minutes

ForgeAI is a local workbench for inspecting document evidence, checking citations and measuring when a document agent should withhold an answer. The submission verdict is **DO NOT SHIP for autonomous answering**. New builds use evidence-first review. The live main-branch demo predates this draft.

1. Open the workbench on this branch with `npm start`. Read the fresh-suite trust panel and ask a source question.
2. Choose **Remove a source**. See how the response changes when its cited document is unavailable.
3. Choose **Change a policy**. Inspect the before-and-after answers. In the evidence ledger, open **Development case diagnostics** for the frozen rank and judge traces.

### Try your own records on the pilot branch

Run `node scripts/repair-desk.mjs` from the repository root. The script builds an agent from a repair desk CSV and a Markdown handover, questions it through the CLI, checks the browser answer handler against the same responses, moves a part to another drawer, then removes the stock register and rebuilds. The full responses and citations are in [the functional receipt](evidence/repair-desk/receipt.json).

For a hands-on review, start the workbench, choose **New build**, enter a brief authorizing inventory lookup, and attach your own CSV with an **asset ID** and a **drawer** column. In **Test the agent**, ask “What is the drawer for BX-017?” using an ID from your file. Try a partial ID and a column your file omits. After a refusal, **Search passages by meaning** loads the bundled model and displays original excerpts for manual inspection. The first search downloads the model from the workbench host. This branch is a post-submission pilot.

### Findings

The exact-passage oracle passed 123/123 answerable questions across development holdouts 1 to 4. In 82 failed cases the required evidence was within the hybrid top three and the agent withheld the answer. In 11 it fell outside the top three. Holdout 4 contextual passed 22/60 overall and gave false answers on 9/24 near misses. The SQuAD2 reader increased supported recall on the first three suites from 29/93 to 36/93, but near-miss false answers rose from 9/57 to 25/57. The experiment stopped. [Per-case funnel and signal intervals](evidence/funnel/summary.json) · [Reader experiment](evidence/funnel/qa-study.json)

On prospective holdout 5, contextual passed 25/60, with 37.9% balanced accuracy. Evidence-first passed 30/60, with 50.0% balanced accuracy, 0/30 supported answers and 0/24 near-miss false answers. Always refusing also achieved 50.0% balanced accuracy. Neither candidate qualified. Related passages are navigation aids and do not earn answer credit. [Preregistration](evidence/prereg/holdout5.md) · [Fresh results including Wilson intervals](evidence/holdout5/summary.json) · [Forecast versus actual, pilot n=5](evidence/holdout5/forecast.md)

### Offline build

After installing the PDF parser, use `node cli.mjs forge --brief B --docs D --out O` with a fresh output directory. The evidence-first runtime needs no remote model. Generation tries local Ollama with a 20-second request timeout, then a local llama.cpp CPU service on loopback port 18435 if available, then deterministic templates. Use `--no-llm` to skip generation services entirely. Model-authored hard paraphrases must pass the content-word overlap filter. Builds without qualifying paraphrases explicitly report missing hard-tier evidence. [macOS rehearsal](evidence/submission/macos-FINAL.md)


Turn a brief and a document folder into an agent you can question, an evaluation suite you can replay, and an evidence trail you can inspect.

**[Open the live workbench](https://forgeai-evidence-workbench.onrender.com/) · [Watch the captioned walkthrough (3 min 41 sec)](https://forgeai-evidence-workbench.onrender.com/demo/forgeai-walkthrough.mp4)**

Start with **Test the agent** and ask “How much notice is needed for a shift swap?” Open its source passage. Switch to **Conservation operations** and ask “What is the pack quantity for MAT102?” The second question executes a catalogue lookup. Choose **New build** to try your own sources. Files and answers for custom builds stay in the browser tab. Export the dossier before closing the tab.

## Earlier contextual release review

Fresh-suite contextual retrieval passed 22/60 cases, including 1/30 supported questions and 15/24 correct refusals. It missed both preregistered effectiveness criteria. Review the raw responses before using this build for decisions. [Prospective results](evidence/v2/holdout4/REPORT.md) · [All-suite comparison](evidence/v2/release-results.md) · [Judge controls](evidence/v2/judge-stress.md) · [Linux rehearsals](evidence/v2/rehearsal-linux/)

## Release evidence

| Compiled agent | Generated checks, by round | Released | Attached tools | Unsupported request |
| --- | --- | --- | --- | --- |
| [North Pier shore desk](evidence/shore/) | 27 → 31 → 32 of 36 | Round 3 | None | Payroll appeals |
| [Museum conservation dispatch](evidence/conservation/) | 30 → 34 → 34 of 37 | Round 2 | CSV lookup | Insurance valuation |

Both releases used local Qwen 2.5 1.5B inference on CPU. Each evidence directory contains requirements, agent definition, frozen cases, every evaluated answer, configuration changes, the final report, and a receipt with source hashes and model output. The [eight separate review probes](evidence/independent-review.json) passed on the released definitions. They were authored during development and offer a small reproducible spot check.

**A case worth opening.** In the shore suite a model-written question asks about both filing leave and approving it. The released agent returns passages about both. The generated expectation identifies only one passage, so the exact judge marks a retrieval miss. In the museum suite some natural paraphrases trigger a refusal. The ledger keeps both kinds of failure visible. The displayed score measures agreement with this suite.

## Run a new brief

The release CLI uses Node.js 22+, Git, Python, the pinned PDF reader and local MiniLM weights. Browser inference fetches the bundled model from the workbench origin on first use. Ollama is optional for question and brief generation. The CLI announces deterministic fallback if automatic detection or generation fails. From a Python virtual environment, run the following setup once.

```sh
python3 -m pip install -r requirements-pdf.txt -r retrieval/requirements.txt
python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', revision='c9745ed1d9f207416be6d2e6f8de32d1f16199bf')"
```

```sh
npm test
npm start
# Open http://127.0.0.1:8417
node cli.mjs forge --brief examples/shore/brief.txt --docs examples/shore/docs --out runs/my-shore
node cli.mjs ask runs/my-shore/definition.json 'How much notice is needed for a shift swap?'
node cli.mjs regression runs/my-shore/definition.json runs/my-shore/evals.json
```

Use a fresh output directory for each build. The CLI walks nested TXT, Markdown, CSV and text-PDF folders. Pass `--interview` for optional audience and tone questions. With no interaction it records its assumptions and flags requested topics that appear unsupported. The browser supports TXT, Markdown and CSV, plus pasted text.

**Model-assisted mode.** Start Ollama locally, run `ollama pull qwen2.5:1.5b`, then append `--model` to the build command. As an alternative, serve compatible Qwen GGUF weights through llama.cpp on loopback port 18435, with a 4096-token context, and prefix the command with `FORGE_BACKEND=llama.cpp`. The model creates the audience, tone, scope candidates, prompt and paraphrased test questions. A schema binds question labels to actual corpus topics. Model or schema failure stops the requested model run. The browser’s custom-build path uses the deterministic compiler. Opening a bundled release loads its previously recorded model-assisted build.

## Architecture and trust boundaries

1. **Intake.** Read bounded inputs, preserve source names, normalize prose and parse quoted CSV records. Map requested subjects to evidence and record gaps. This lexical checkpoint can miss implicit relationships.
2. **Compile.** Emit a portable definition containing the system prompt, requirements, passages, retrieval policy, capability list and JSON output contract. The bundled runtime executes the retrieval policy and returns excerpts. The generated prompt is also available for integration with another model runtime.
3. **Generate and freeze.** Build source-backed answerable cases, cross-source cases when possible, unsupported fields, ambiguous questions and refusal cases. The model adds paraphrases. Both the [generation prompt](model.mjs) and the [deterministic case constructors](public/engine.mjs) are versioned. A small or repetitive corpus naturally limits test diversity.
4. **Judge and repair.** Check the expected status, exact cited source text and complete evidence set. Classify failures, adjust conjunction handling or the retrieval threshold, and rerun the same suite for at most three rounds. Retain the best observed definition, including when a later attempt ties or regresses. Deterministic judging removes answer-order and prose-length preferences; exact expectations can still be wrong.
5. **Serve.** GitHub Pages distributes static assets. A Web Worker compiles each visitor’s custom agent. Local queries use the same runtime as the CLI. There is no central inference queue, database or upload service. The query cost still grows with the local corpus. This design targets bounded evaluation folders.

The CLI caps intake at 32 files and 16 MB, with a 400,000-character and 1,500-passage compiler limit. The browser applies tighter upload limits. Source text is rendered with DOM text nodes. Browser CSP restricts script and connection origins. Model calls stay on fixed loopback addresses, use timeouts, and return validated data. The runtime owns four capabilities. Catalogue queries return cited rows, arithmetic accepts one bounded binary operation, current date returns UTC, and live weather uses a fixed Open-Meteo endpoint with validated coordinates in the connected CLI. The latter requires an explicitly weather-enabled brief and a query such as `weather 12.97,77.59`. A document cannot select a tool. Lexical safeguards and exact quotations do not establish semantic correctness or resistance to every malicious document.

## Reproduce and challenge a release

```sh
node pack.mjs                 # recompute both dossiers using captured model proposals
node independent-check.mjs    # run the eight separate probes
npm test                      # runtime and regression checks
```

To reproduce the video’s regression experiment, copy the shore corpus, change the shift-swap notice from 36 hours to 48, compile the edited folder to a new output directory, then run the new definition against the original evals. Regression exits with code 2 when a check fails. Review the old fact, new response and source before accepting the revision.

The [original synthetic corpora and design notes](examples/) are included. The [evaluation research notes](examples/RESEARCH.md) explain the choice of separate grounding and correctness checks. The captioned video captures real command outputs and the policy-revision experiment. Its portable builds are distinct from the recorded model-assisted releases.

## Hosting

Render publishes the live workbench from main after the test suite passes. Its build copies the public assets and demo into dist. A [GitHub Pages mirror](https://tulasiram2005.github.io/forgeai-evidence-workbench/) uses branch publishing. The `gh-pages` branch contains the contents of `public/`, `demo/` and an empty `.nojekyll` file. The runtime needs no hosted model, API key, paid account feature or paid plugin.

### Archive challenge

A fresh archive-desk corpus exposed two defects. A weather prohibition suppressed permitted catalogue and arithmetic tools in the same sentence. Two notices with the same locker-hours label and different closing times produced a confident answer determined by file order. Run `node archive-review.mjs` to replay the ten questions and the separate tool-permissions check. Compare the [original results](evidence/archive-review-before.json) with the [corrected results](evidence/archive-review-after.json). The score moved from 7/11 to 11/11. These cases became regression checks once used for repairs.

On equally ranked passages with the same topic and different wording, the runner now shows the alternative citations. Specify the intended notice with a question such as “According to notice.txt, what are the locker hours?” This only resolves the source choice. Deciding which notice has legal or organizational precedence requires metadata or a human decision.

### Bring your own blind review

Open **Blind review** on a released or custom agent. Queue your questions, choose the expected outcome, and supply required answer phrases for answerable questions. An optional exact filename checks citation provenance. Run the suite to reveal answers and mismatches. The original build score stays independent. Expectations use case-insensitive token sequences, so “8 hours” and “18 hours” differ. Equivalent paraphrases can still require human judgment.

Download the receipt to retain the expected cases, observed answers, citations, mismatch reasons and a SHA-256 fingerprint of the evaluated definition. Replay the same cases on any exported definition with `node cli.mjs review definition.json forgeai-review.json`. The command prints a fresh receipt and returns exit code 2 for failures. Compare fingerprints to distinguish a replay of the same definition from a comparison against a changed agent. The browser keeps reviewer questions in memory until the tab is closed or refreshed.

### Optional local hybrid retrieval

The CLI can rank source passages with a second signal from a 384-dimensional transformer encoder. It embeds queries and passages with the same pinned MiniLM weights, computes cosine similarity on normalized vectors, and combines dense and lexical ranks with reciprocal rank fusion (constant 60). The answer runner chooses among passages eligible under the released lexical threshold. Low vocabulary overlap can therefore still produce refusals. The connected weather tool runs through the regular CLI path.

Install the optional Python dependencies in a virtual environment and download the pinned model once. Inference runs offline on CPU. Each CLI invocation encodes the corpus in memory, which suits experiments with small folders. The benchmark batches queries for each corpus.

```sh
python3 -m pip install -r retrieval/requirements.txt
hf download sentence-transformers/all-MiniLM-L6-v2 --revision c9745ed1d9f207416be6d2e6f8de32d1f16199bf
node cli.mjs ask evidence/shore/definition.json --semantic 'What is the shift swap notice?'
node retrieval/compare.mjs
```

In the [frozen comparison](evidence/retrieval-comparison.json), lexical, dense and fused retrieval each recovered 60 of 60 expected passage occurrences across 52 answerable questions at rank three. The hybrid and lexical answer runners each passed 66 of 73 total checks. The two synthetic corpora are small; these results support keeping lexical retrieval as the zero-download default. They do not measure latency or generalization to a different collection.

Prose chunks follow line and sentence boundaries. Long passages split at whitespace within a 750-character ceiling where possible; a longer unbroken token needs a hard split. CSV rows stay intact with their headers and identifiers. Generation of agent designs uses local Qwen at temperature zero. Dense encoding and rank fusion have no sampling temperature.

The factory’s evaluation and bounded repair loop is agentic. A knowledge graph could help with repeated multi-hop relationships across many documents; these suites supply no evidence of that bottleneck. Google’s Open Knowledge Format is a candidate for exchanging curated knowledge bundles. General Markdown ingestion does not implement OKF schema validation or graph traversal. See [Google’s description of OKF](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing), the [encoder model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), and the [rank fusion paper](https://cormack.uwaterloo.ca/cormack/cormacksigir09-rrf.pdf).

## Review against the OceanAI assignment

| Core deliverable | Evidence and qualification |
| --- | --- |
| Intake interviewer | CLI reads the brief and folder. Optional audience and tone interview; unattended builds record defaults. |
| Groundability guard | Requirements list unsupported topics. Lexical matching can miss an implicit gap. |
| Declarative agent generator | Exported prompt, retrieval controls, permitted tools and output contract in each definition. |
| Generated eval suite | Source-linked cases, model paraphrases, refusal and ambiguity cases. Cross-document cases require at least two suitable sources. |
| Automated judge | Checks expected outcome, cited source text and required evidence. Strict references can penalize a reasonable extra passage. |
| Critic and optimizer | Up to three rounds on frozen cases, with failure categories, targeted changes, before/after scores and retained best configuration. |
| Honest reporting | Every release includes its remaining failures and the actual responses. |
| Generic runner | Browser runner and CLI. The local prompt-tournament definition uses its selected prompt at inference time. |
| Two complete demonstrations | [Shore](evidence/shore/) and [conservation](evidence/conservation/). An additional [print-studio trial](evidence/print-studio/) ran the local model unattended and scored 19/20. Its disputed question asks why a label is attached; the supplied policy only instructs staff to attach it. |

**Model scope.** The full CLI path uses a small local model for design and question generation. The optional tournament also uses it to select evidence. Grounding checks, scoring and repair decisions run in code. Hosted custom builds use the deterministic path. A literal reading that requires an LLM invocation at every stage is a qualification to this implementation.

### Bonus evidence

- **Prompt tournament.** Two locally proposed prompts compete on the same frozen cases. The local model sees each candidate prompt plus untrusted candidate passages and selects passage IDs. The answer is constructed from validated IDs. Capability checks and refusals precede model selection. Both candidates receive identical cases and the same deterministic scoring rule. A tie goes to the first proposal. In the [completed 36-case comparison](evidence/shore-prompt-tournament/comparison.json), the candidates scored 14 and 20. The existing 32/36 extractive release remains the default. The [winning candidate](evidence/shore-prompt-tournament/definition.json) is separately runnable.
- **Budget enforcement.** A CLI build runs model generation, compilation and optimization in a worker with a configurable wall-clock limit (default 180 seconds after intake). Expiry discards the unfinished build. The optimizer stops on a non-improving iteration. Browser compilation has a 45-second limit. The tournament has its own total latency limit; an interrupted comparison records partial progress without selecting a winner.
- **Human checkpoint.** Add `--checkpoint` to display the full requirements and explicitly approve them before local-model generation or compilation. Declining stops the build. Omit the flag for an unattended review.
- **Regression and hosted UI.** Replay a previous frozen suite against a revised definition. The public workbench and video links appear at the top of this README.
- **Human baseline.** A genuinely human-authored comparator has not been evaluated. The prompt comparison, developer probes and blind-review facility serve different purposes.

```sh
node cli.mjs build --brief examples/shore/brief.txt --docs examples/shore/docs --out runs/approved --checkpoint --budget-ms 180000
# Start the local model server first. Use FORGE_BACKEND=llama.cpp for that backend.
node cli.mjs tournament evidence/shore/definition.json evidence/shore/evals.json runs/tournament --budget-ms 180000
node cli.mjs ask runs/tournament/definition.json 'How much notice is needed for a shift swap?'
node cli.mjs verify evidence/shore/definition.json 'What is the travel reimbursement deadline, and what about payroll appeals?'
```

The explicit multi-part verifier reports a status and citations per question clause. A missing part yields exit code 2. Its rule recognizes explicitly worded interrogative clauses; complex references across clauses can require clarification.

### Source-removal audit

In **Test the agent**, ask a question and choose **Test source dependency** beneath a cited answer. ForgeAI withholds each cited document separately and repeats the original question using the same released configuration. Compare the text, status and remaining citations, or download the full receipt. The experiment is read-only and runs locally in the browser. A matching answer from another file may reflect duplicated material. A changed answer calls for inspection of the remaining passage.

CLI equivalent: `node cli.mjs audit evidence/shore/definition.json 'How much notice is needed for a shift swap?'`. The [recorded example](evidence/shore/source-removal.json) shows what happens when the shift handbook is unavailable. This tests the answer runner’s dependence on indexed passages; the generated requirements and prompt remain fixed.

### Which answers change after a document revision?

Open **Change impact** and supply a revised definition or dossier. The browser replays the active build’s original questions against both releases in a worker. Inspect changed responses with their original and revised citations, or download the complete report including unaffected cases and fingerprints of both definitions. Passage renumbering alone does not count as a citation change. Wording changes are literal; deciding whether a revision is correct needs a reviewer.

**Try the shore policy revision** compares the released shore definition with a controlled copy that changes the shift-swap deadline from 36 to 48 hours and drops the mileage-rate passage. Only the indexed passages differ. Six of 36 responses change: five quote the revised deadline and one loses its answer. The other 30 retain their status, text and cited source content. New topics outside the original questions require further review.

CLI equivalent: `node cli.mjs impact evidence/shore/definition.json public/runs/shore-revision.json evidence/shore/evals.json`. The [full example report](evidence/shore/change-impact.json) preserves both sides. When comparing independently generated releases, differences may also come from changed configuration or model behavior. Local-model definitions require the CLI and a running local model.

## V2 live review runbook

Use Node 22+ and install the pinned pypdf dependency for PDF folders. Build into a new directory. The local model is optional.

```sh
node cli.mjs forge --brief examples/holdout/spares/brief.txt --docs examples/holdout/spares/docs --out runs/review-spares --structured --split-validation --budget-ms 180000
node cli.mjs ask runs/review-spares/definition.json 'What is the return window?'
node cli.mjs holdout examples/holdout/spares --structured --split-validation
```

Read FINAL.md, inspect the failures and review the generated and reserved case counts. Forge probes the local Ollama model list. If the model is unavailable it reports deterministic mode. If a connected model stalls, rerun with a fresh output directory and `--deterministic`. An explicitly requested model failure remains visible. Structured intake adds page provenance for text PDFs and extracts DOCX paragraphs. A blank or scanned page requests a transcript. The browser continues to accept text, Markdown and CSV.

### Frozen reviewer questions

Each folder has 25 cases. The build reads its documents before the harness opens its questions. The same reviewer cases run in every column. Local dense mode combines a semantic confidence gate, clause handling and conservative refusal rules. Its score measures the combined experiment. Generated validation cases share a corpus with tuning cases and are a separate measurement.

| Folder | Original lexical | Structured lexical with split | Local dense experiment |
|---|---:|---:|---:|
| Staff | 9/25 | 13/25 | 16/25 |
| Ship spares | 13/25 | 13/25 | 17/25 |
| Technical bench | 13/25 | 13/25 | 14/25 |
| Total | 35/75 | 39/75 | 47/75 |

Across 30 answerable questions, refusals moved from 30 to 22 in the dense experiment. On 30 questions requiring refusal, incorrect answers moved from four to zero. All three files use synthetic examples, including shared question templates. The results guided development and need replication on another blind corpus. The dense path remains opt-in. With the pinned MiniLM model available locally, append `--experimental-dense` to the holdout command or use `ask DEFINITION --experimental-dense QUESTION`.

[Original receipts](evidence/holdout/) · [Structured intake](evidence/v2/holdout/) · [Dense experiment](evidence/v2/dense/) · [Procurement release](evidence/v2/spares/FINAL.md) · [Interface changes and limitations](docs/ui/CHANGES.md)

### Evidence controls and optional composition

`node cli.mjs rescore DEFINITION EVALS` compares the strict release judge against a fact-and-provenance rule. A required phrase must occur in the answer and in a verified passage from an acceptable source. Replaying the two original releases changed zero verdicts across 73 cases. Each version of the judge has limits, especially with equivalent paraphrases. [Verdict comparisons](evidence/v2/rescore/)

`node cli.mjs scope DEFINITION "topic one" "topic two" --semantic` displays the best lexical passage, its missing terms and its optional cosine score. Partial coverage warrants inspection. Token overlap alone cannot establish that a policy grants permission. [Recorded inspection](evidence/v2/shore-scope.json)

`node cli.mjs ask DEFINITION --compose "question"` uses the local model to compose a cited response from whole passages or their complete labelled values. Invalid references, changed quantities and dropped qualifiers trigger a retry followed by extractive fallback. Run `node compare-compose.mjs` with the local model running to replay the three-way comparison. The extractive runner and both local prompt variants each passed 32 of the same 36 questions, with zero degraded answers on this run. The tie retained the extractive runner. [All candidate answers](evidence/v2/compose/comparison.json)

### Contextual retrieval experiment

Add `--contextual` during a CLI build to preserve Markdown heading paths and CSV column names in the definition. Use `ask DEFINITION --contextual QUESTION` to encode passages with that context. The optional local encoder expands four common catalogue headers (SKU, pack, qty and UOM). Returned citations retain the indexed source text. Explicit mixed letter-and-number identifiers must match a whole token in the passage. This conservative rule can refuse questions that use an alternative spelling of an identifier.

Run `node cli.mjs holdout examples/holdout/spares --structured --split-validation --contextual` to reproduce a folder with the pinned encoder installed. The three original folders scored 16/25, 23/25 and 15/25 (staff, spares and bench). Compared with the previous dense experiment, seven previously failed cases passed and no previously passing case failed. Refusals on answerable questions fell from 22/30 to 15/30. Both configurations gave zero answers across the 30 cases requiring refusal. These fixtures share question structures and have been inspected during development.

A new dispatch folder exposed an erroneous response for an absent catalogue code. Its eight cases scored 7/8 before the identifier check and 8/8 after. It now serves as a regression fixture. [Contextual receipts](evidence/v2/contextual/) · [Dispatch source documents and questions](examples/holdout/dispatch/)

### Frozen comparison and ranking-only expansion

[Read the two-suite report](evidence/v2/RETRIEVAL-REPORT.md) for the refusal analysis, threshold curve and full comparison. The first run on the second suite used the previous v2 code. Its fixtures, extraction overlap check and first-run receipts are preserved in Git. Lexical and contextual settings reproduce the respective release workflows, so their difference includes PDF intake and optimization settings. The normalized and expanded runs use the same intake, split, model encoder and operating thresholds.

To reproduce expansion, start the supported local model server and install the pinned offline encoder. Build into a fresh folder. Only the contextual CLI ranker consumes generated metadata. The original text stays in the quoted passage. The holdout runner expands each corpus before opening its cases, and includes the actual generated metadata in its receipt.

```sh
python3 examples/holdout2/check.py
node cli.mjs forge --brief examples/holdout2/vendors/brief.txt --docs examples/holdout2/vendors/docs --out runs/vendors-expanded --structured --split-validation --deterministic --expand-index
node cli.mjs ask runs/vendors-expanded/definition.json --contextual 'What quantity does LK83 ship in?'
node cli.mjs holdout examples/holdout2/vendors --structured --split-validation --expand-index
node cli.mjs diagnose examples/holdout/staff --structured
node retrieval/report-holdouts.mjs
```

Here `--deterministic` selects the portable agent compiler. Explicit `--expand-index` still invokes the local model for search metadata. Use `FORGE_BACKEND=llama.cpp` when serving the specified model with llama.cpp.

### Answerability gate release decision

**Keep contextual V2 as the preferred CLI experiment.** A new gate trained only on generated queries reduced false answers but failed to return a correct supported answer on the new evaluation corpus. The [complete study](evidence/v2/gate-study/REPORT.md) reconciles the earlier lexical and dense scores, lists the judge and configuration commits, attributes every failed answerable case on the second suite, and reports question-level Wilson intervals. The first two suites are development data. The third suite was frozen before scoring.

In the browser, select **Calibrate answerability on these documents** in New build. The worker calibrates against the supplied corpus. The browser and CLI use the same self-hosted quantized word vectors, normalized identifiers, context construction, feature weights and cutoff selection. The portable encoder differs from the MiniLM transformer used by the earlier contextual CLI mode. The study includes a same-encoder control. Expansion is off by default.

```sh
node cli.mjs forge --brief examples/holdout3/optics/brief.txt --docs examples/holdout3/optics/docs --out runs/gate-review --deterministic --gate-v2
node cli.mjs ask runs/gate-review/definition.json 'How long should the lamp stabilize?'
node cli.mjs holdout examples/holdout3/optics --structured --split-validation --gate-v2
node retrieval/gate-study-report.mjs
```

The top candidates are scored using cosine, rank margin, inverse-document-frequency coverage, unmatched rare terms, expected answer type and heading overlap. The calibration log in report.json records the generated samples, candidate cutoffs and selected operating point. The reference label is the source passage ID. Selection maximizes generated positive hits under the requested false-answer cap and breaks ties by fewer false answers, then a higher cutoff. The development holdouts are excluded from selection.

For the optional CLI reranker, cache the pinned weights once, then add `--rerank` to the build or holdout command. The browser rejects reranker-dependent definitions. The CPU model is cross-encoder/ms-marco-TinyBERT-L-2-v2 at revision `81d1926f67cb8eee2c2be17ca9f793c7c3bd20cc`. Inference uses locally cached weights. Both development reranker receipts and the browser parity receipt are in the study folder.

## Development reference comparison

| Suite | Configuration | Overall | Answerable recall | Refusal recall | Near-miss false answers | Balanced accuracy |
|---|---|---:|---:|---:|---:|---:|
| pooled | V2 contextual, normalized IDs | 115/195 | 29/93 [22.7%, 41.2%] | 63/72 [77.9%, 93.3%] | 9/57 [8.5%, 27.4%] | 59.3% |
| pooled | Always refuse | 72/195 | 0/93 [0.0%, 4.0%] | 72/72 [94.9%, 100.0%] | 0/57 [0.0%, 6.3%] | 50.0% |
| pooled | Always answer with top-1 | 25/195 | 25/93 [18.9%, 36.7%] | 0/72 [0.0%, 5.1%] | 57/57 [93.7%, 100.0%] | 13.4% |

[Full suite comparisons, interval definitions and historical configurations](evidence/v2/reference-results.md)

The prospective release missed both effectiveness criteria. [Frozen fourth-suite results and reference agents](evidence/v2/holdout4/REPORT.md).
