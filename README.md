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
