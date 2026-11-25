# Evaluation design

The two fictional briefs intentionally name one topic with no supporting policy. The shore documents distinguish several deadlines with different units. The conservation documents use material names to join structured catalogue quantities to prose procedures.

Separate retrieval evidence, answer faithfulness, and refusal decisions. A verbatim passage proves that the passage exists, but relevance requires matching the expected facts for the question. For cross-document questions, require both sources. Report per-type scores and failing cases alongside the aggregate. A generated suite shares the generator’s assumptions and cannot estimate accuracy on future user questions. This separation draws on the dimensions in the [RAGAS paper](https://aclanthology.org/2024.eacl-demo.16/).

For the optional compiler, use schema-restricted generation at temperature zero, validate model output in application code, and keep execution permissions and retrieval evidence outside the model’s control. See [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs).
