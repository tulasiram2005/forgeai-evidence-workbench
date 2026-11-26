# ForgeAI · Inspection bench

Turn a brief and a document folder into an agent you can question, an evaluation suite you can replay, and an evidence trail you can inspect.

**[Open the live workbench](https://tulasiram2005.github.io/forgeai-evidence-workbench/) · [Watch the captioned walkthrough (3 min 41 sec)](https://tulasiram2005.github.io/forgeai-evidence-workbench/demo/forgeai-walkthrough.mp4)**

Start with **Test the agent** and ask “How much notice is needed for a shift swap?” Open its source passage. Switch to **Conservation operations** and ask “What is the pack quantity for MAT102?” The second question executes a catalogue lookup. Choose **New build** to try your own sources. Files and answers for custom builds stay in the browser tab. Export the dossier before closing the tab.

## Release evidence

| Compiled agent | Generated checks, by round | Released | Attached tools | Unsupported request |
| --- | --- | --- | --- | --- |
| [North Pier shore desk](evidence/shore/) | 27 → 31 → 32 of 36 | Round 3 | None | Payroll appeals |
| [Museum conservation dispatch](evidence/conservation/) | 30 → 34 → 34 of 37 | Round 2 | CSV lookup | Insurance valuation |

Both releases used local Qwen 2.5 1.5B inference on CPU. Each evidence directory contains requirements, agent definition, frozen cases, every evaluated answer, configuration changes, the final report, and a receipt with source hashes and model output. The [eight separate review probes](evidence/independent-review.json) passed on the released definitions. They were authored during development and offer a small reproducible spot check.

**A case worth opening.** In the shore suite a model-written question asks about both filing leave and approving it. The released agent returns passages about both. The generated expectation identifies only one passage, so the exact judge marks a retrieval miss. In the museum suite some natural paraphrases trigger a refusal. The ledger keeps both kinds of failure visible. The displayed score measures agreement with this suite.

## Run a new brief

Requires Node.js 22+. The website, CLI and tests use built-in APIs. Only PDF input needs Python and pypdf. For text PDFs, install the optional pinned reader with `python3 -m pip install -r requirements-pdf.txt` in a virtual environment. Scanned images require a text transcript or OCR before intake.

```sh
npm test
npm start
# Open http://127.0.0.1:8417
node cli.mjs build --brief examples/shore/brief.txt --docs examples/shore/docs --out runs/my-shore
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

The public site uses GitHub Pages branch publishing. The `gh-pages` branch contains the contents of `public/`, `demo/` and an empty `.nojekyll` file. The runtime needs no hosted model, API key, paid account feature or paid plugin.

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
