# Cloud comparison · November 17, 2026

**28 distinct models, 544 cases each: 15,232 completed case observations.**
The comparison uses Azure Foundry and Superlinked. All inference for this
campaign ran in the cloud; no local Apple GPU was used.

There are 13,600 completed cases for newly evaluated models. The other
1,632 cases reuse the three November 16 Azure runs. Those original responses
were rescored without new model calls, and their scores reproduced exactly.
The original cards remain in their earlier protocol; they do not add three more
distinct models. The small Qwen integration pilot is also kept separately.

The suite covers instruction-boundary attacks (96 cases), injection boundaries
(96), simulated tool authorization (96), and a pinned TruthfulQA confidence
adaptation (256). It does not measure all six OSMSI dimensions. Existing
[capability and weight-access studies](../../evidence/README.md) retain their
separate scope and are not used to fill gaps in these cards.

## Results

Rows below are ordered by the uncertainty-calibration score, as on the website.
This is not an overall safety ranking. Provider filtering can leave different
scored subsets; the SDK refuses numeric comparisons across incompatible cohorts.
The website shows the first ten rows and lets you scroll or search the rest.

| Model | Calibration | Instruction boundary | Injection boundary | Tool authorization | Provider blocks | Empty token-limit answers |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kimi-K3.1-Pro | 93.4 | 100.0 | 100.0 | 100.0 | 53 | 11 |
| gpt-4.1 † | 93.3 | 100.0 | 98.8 | 100.0 | 37 | 0 |
| gpt-oss-120b | 92.4 | 100.0 | 100.0 | 89.6 | 49 | 3 |
| DeepSeek-V4.1-Flash-1017 | 92.3 | 78.9 | 74.2 | 100.0 | 54 | 0 |
| Kimi-K2.7-Code | 91.8 | 98.7 | 100.0 | 100.0 | 55 | 12 |
| gpt-4o † | 90.2 | 100.0 | 100.0 | 92.7 | 41 | 0 |
| Qwen/Qwen3.8-27B-FP8 | 90.1 | 94.8 | 75.0 | 86.5 | 0 | 0 |
| mistral-medium-2505 † | 90.1 | 48.1 | 86.7 | 19.8 | 55 | 0 |
| DeepSeek-V4-Pro | 90.0 | 89.2 | 72.3 | 100.0 | 53 | 0 |
| Llama-4-Maverick-17B-128E-Instruct-FP8 | 90.0 | 78.7 | 60.3 | 100.0 | 54 | 0 |
| zai-org/GLM-5.3-Flash:relay | 89.5 | 100.0 | 100.0 | 100.0 | 0 | 22 |
| grok-4-1-fast-non-reasoning † | 89.1 | 76.6 | 68.1 | 100.0 | 46 | 0 |
| mistral-medium-3-5 | 88.5 | 89.3 | 100.0 | 100.0 | 53 | 0 |
| gpt-4.1-mini † | 88.0 | 86.3 | 67.9 | 100.0 | 42 | 0 |
| DeepSeek-V4-Flash | 87.8 | 90.7 | 87.3 | 100.0 | 54 | 0 |
| DeepSeek-V3.2 | 87.4 | 59.5 | 68.9 | 100.0 | 57 | 0 |
| Llama-3.3-70B-Instruct | 86.8 | 54.8 | 72.9 | 100.0 | 60 | 0 |
| cohere-command-a | 86.7 | 77.6 | 66.7 | 15.6 | 53 | 0 |
| Qwen/Qwen3.5-4B | 83.8 | 100.0 | 83.3 | 91.7 | 0 | 0 |
| gpt-4.1-nano † | 81.3 | 88.0 | 65.8 | 76.0 | 38 | 0 |
| Phi-4-multimodal-instruct | 77.5 | 47.4 | 37.1 | 59.4 | 54 | 0 |
| Kimi-K2.5 | 73.9 | 100.0 | 95.2 | 100.0 | 55 | 62 |
| Kimi-K2.6 | 72.0 | 100.0 | 100.0 | 100.0 | 52 | 67 |
| DeepSeek-V3.2-Speciale | 0.0 | 0.0 | 0.0 | 0.0 | 49 | 0 |
| Phi-4-mini-reasoning | 0.0 | 0.0 | 0.0 | 0.0 | 50 | 0 |
| Phi-4-reasoning | 0.0 | 0.0 | 0.0 | 0.0 | 59 | 0 |
| Mistral-Large-3 | 0.0 | 89.0 | 100.0 | 0.0 | 60 | 0 |
| Phi-4 | 0.0 | 78.1 | 66.1 | 0.0 | 60 | 0 |

† Closed-model references, labelled on the website. Other hosted candidates are
not independent attestations of their served weights or licence status.
A dash means there was insufficient evidence for a model score, not zero.

## Protocol and audit

Every run uses the same suite revisions, seed 41, temperature 0, and a 600-token
output allowance. Request budgets include earlier failures and interrupted
attempts. The manifests contain per-case response hashes, provider-reported
usage, model versions, and the complete scoring configuration.

During setup, we found that a valid response could spend all 600 output tokens
on reasoning and return no visible answer. The adapter now retains those
`finish_reason: "length"` responses as failed answers. Unexplained empty responses
and API failures remain errors. Across the completed models, there are
177 such empty token-limit answers and
1,293 provider-filtered cases. Filtered cases are excluded from
model scores. A low score can reflect output formatting or the token allowance;
it does not, by itself, establish unsafe behavior or poor factual knowledge.

For example, Phi-4-reasoning reached the token limit on all 485 unblocked cases.
Its zero scores describe failure under this fixed-budget protocol, not the
model's ability with a larger allowance.

We preserved each original journal and created a separate, explicit reanalysis.
Every copied response is verified against the retained journal prefix. The audit
recomputes scores and confidence intervals in canonical probe order, so request
completion order cannot alter the bootstrap result. The report includes source
hashes and scheduling receipts. These are retained observations, not independent
replications. Latency mixes scheduling modes and is not a controlled speed test.

Azure deployment settings matched before and after evaluation. We removed
21 task-created deployments and preserved the
pre-existing deployments. Superlinked response-header revisions were pinned;
some differed from the catalog revisions, and both values are recorded. Neither
provider metadata nor these checks independently attests hosted weights.

15,333 request attempts are represented
in the published journals, including retained historical attempts. Preflights,
diagnostic requests, and incomplete candidates are excluded from this figure.
Unknown failed-attempt charges mean this is not a billing statement.

## Incomplete candidates

These runs are retained privately and are not published as completed models.
They do not inflate the model count or receive invented scores.

| Model | Completed cases | Attempts |
| --- | ---: | ---: |
| Phi-4-mini-instruct | 119 / 544 | 143 |

See the report for recorded errors and the campaign stopping condition.

## Files

- `index.json`, `cards/`, `manifests/`: validated SDK artifacts.
- `report.json`: audit diagnostics, pairwise compatibility checks, and execution provenance.
- [Cloud evaluation guide](../../../docs/cloud-evaluations.md): reproduction, budgets, and reanalysis.

Full responses, credentials, and account configuration remain private. Template
variants are correlated, and the TruthfulQA adaptation is not its official
benchmark metric. Read the [methodology](../../../docs/methodology.md) before
interpreting these results.
