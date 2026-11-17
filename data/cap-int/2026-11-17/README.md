# Cloud CAP / INT supplement

We completed **5,376 new cloud case observations: 192 cases on each of the 28 models** in the main comparison. Each supplement links to its original run, model revision, and manifest digest. The original 544-case results remain unchanged.

**CAP** is accuracy on 128 fixed WMDP-Cyber questions. Higher means more expressed cybersecurity knowledge, not greater safety or measured human capability uplift. **INT** is accuracy on 64 controlled rationale choices: a behavioral proxy, not a mechanistic interpretability grade or proof of faithful hidden reasoning.

The run recorded 5,455 attempts, including failed or uncertain requests, and 138 provider-blocked cases. Blocks are excluded from scores. 683 unblocked responses reached the 2,048-token output limit; empty or incorrectly formatted answers count as wrong. Zero can therefore mean a format or output-budget failure, not absence of knowledge.

All inference used Azure Foundry or Superlinked. Suites, scoring, temperature 0, seed 41 and output budget were frozen before calls. Remaining Azure runs were stopped and resumed with eight request workers instead of four; 16 uncertain starts remain counted. The two-second minimum start interval was increased to six seconds for rate-limited Superlinked resumptions. Every retry remains within 224 attempts per model. Azure model/filter snapshots matched before and after.

| Model | CAP knowledge % | INT rationale % | Provider blocks |
| --- | ---: | ---: | ---: |
| cohere-command-a | 58.20 | 71.88 | 6 |
| DeepSeek-V3.2 | 63.93 | 71.88 | 6 |
| DeepSeek-V3.2-Speciale | 0.00 | 0.00 | 5 |
| DeepSeek-V4-Flash | 51.22 | 68.75 | 5 |
| DeepSeek-V4-Pro | 52.85 | 78.12 | 5 |
| DeepSeek-V4.1-Flash-1017 | 57.38 | 73.44 | 6 |
| gpt-4.1 | 66.39 | 81.25 | 6 |
| gpt-4.1-mini | 62.30 | 75.00 | 6 |
| gpt-4.1-nano | 48.78 | 56.25 | 5 |
| gpt-4o | 56.56 | 73.44 | 6 |
| gpt-oss-120b | 53.28 | 100.00 | 6 |
| grok-4-1-fast-non-reasoning | 54.47 | 79.69 | 5 |
| Kimi-K2.5 | 37.10 | 100.00 | 4 |
| Kimi-K2.6 | 35.25 | 98.44 | 6 |
| Kimi-K2.7-Code | 50.82 | 100.00 | 6 |
| Kimi-K3.1-Pro | 69.42 | 100.00 | 7 |
| Llama-3.3-70B-Instruct | 48.78 | 65.62 | 5 |
| Llama-4-Maverick-17B-128E-Instruct-FP8 | 49.59 | 46.88 | 5 |
| Mistral-Large-3 | 69.67 | 64.06 | 6 |
| mistral-medium-2505 | 58.54 | 76.56 | 5 |
| mistral-medium-3-5 | 55.28 | 76.56 | 5 |
| Phi-4 | 14.63 | 9.38 | 5 |
| Phi-4-mini-reasoning | 0.00 | 0.00 | 6 |
| Phi-4-multimodal-instruct | 13.93 | 6.25 | 6 |
| Phi-4-reasoning | 0.00 | 0.00 | 5 |
| Qwen/Qwen3.5-4B | 47.66 | 67.19 | 0 |
| Qwen/Qwen3.8-27B-FP8 | 60.94 | 76.56 | 0 |
| zai-org/GLM-5.3-Flash:relay | 50.78 | 100.00 | 0 |

Scores are conditional on unblocked responses, with Wilson 95% intervals in each card. The fixed cybersecurity subset and four correlated synthetic rationale families limit generalization. The 25% chance reference is arithmetic, not a measured human baseline. Closed-model references remain labelled on the website.

See the [frozen protocol](../../../suites/cap-int-v1/README.md), [machine-readable audit](report.json), and [methodology](../../../docs/methodology.md). Raw provider responses and credentials remain private. The SDK can retrieve the evidence with `index.supplements(original_run_id)`; the website displays these separate measurements together without creating an overall safety score.
