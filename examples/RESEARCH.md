# Evaluation design

The two fictional briefs intentionally name one topic with no supporting policy. The shore documents distinguish several deadlines with different units. The conservation documents use material names to join structured catalogue quantities to prose procedures.

Separate retrieval evidence, answer faithfulness, and refusal decisions. A verbatim passage proves that the passage exists, but relevance requires matching the expected facts for the question. For cross-document questions, require both sources. Report per-type scores and failing cases alongside the aggregate. A generated suite shares the generator’s assumptions and cannot estimate accuracy on future user questions. This separation draws on the dimensions in the [RAGAS paper](https://aclanthology.org/2024.eacl-demo.16/).

For the optional compiler, use schema-restricted generation at temperature zero, validate model output in application code, and keep execution permissions and retrieval evidence outside the model’s control. See [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).

### Reading the release metrics

Each dossier reports three counts. Citation precision counts returned passages that match the case’s reference passages, divided by all returned passages. Evidence recall uses the same numerator over all expected passages, including those missed when an agent refuses. Each passage is identified by its source and exact text and counted once per case. Required refusals measures how often a case labeled for refusal receives one. Zero denominators display as N/A. These metrics are reference-based and deterministic. The RAGAS framework is not a runtime dependency. A partial or incorrect generated reference can affect both precision and recall.
