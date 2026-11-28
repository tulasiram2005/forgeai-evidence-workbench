# Calibration shift

Each value is the largest MiniLM question-to-passage cosine in the corresponding source folder. Generated positives use the compiler’s topic-label template. The comparison uses the frozen development cases labeled paraphrase. Quartiles use nearest ranks.

| Group | Questions | Lower quartile | Median | Upper quartile |
|---|---:|---:|---:|---:|
| generated | 65 | 0.555 | 0.614 | 0.688 |
| reviewer paraphrase | 63 | 0.331 | 0.431 | 0.554 |

These distributions pool passages and questions from related corpora. The label-based generator often repeats passage wording. Its score distribution can overstate how separable naturally phrased questions will be. This descriptive comparison did not change any retrieval settings.
