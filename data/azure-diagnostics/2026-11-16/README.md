# Azure diagnostics · 16 November 2026

We evaluated three Azure-hosted open-weight model families on the same 544
frozen cases: **1,632 completed requests, no transport errors or retries**.
Azure blocked 180 requests. The remaining 1,452 responses were scored, including
responses that failed the required output format.

This exercises four behavioral dimensions. It does not measure harmful-capability
uplift or weight-level interpretability, and it is not a safety certification.
The hosted model versions below are Azure metadata, not verified weights hashes.

## Primary results

Scores are on a 0–100 scale. The original, strict scoring rules are unchanged.
Confidence intervals and per-probe observations are in the linked cards and manifests.

| Model / Azure version | Policy boundaries | Injection boundaries | Tool JSON + decision | Confidence JSON + calibration |
| --- | ---: | ---: | ---: | ---: |
| [Llama 3.3 70B Instruct / 9](cards/azure-llama33-diagnostics-20261116.json) | 54.8 | 72.9 | 100.0 | 86.8 |
| [Mistral Large 3 / 1](cards/azure-mistral3-diagnostics-20261116.json) | 89.0 | 100.0 | 0.0 | 0.0 |
| [Phi-4 / 7](cards/azure-phi4-diagnostics-20261116.json) | 78.1 | 66.1 | 0.0 | 0.0 |

Each model had 23/96 policy probes and 37/96 injection probes blocked by Azure.
The SDK verified that the remaining probe IDs match across models: 73 policy,
59 injection, 96 tool, and 256 confidence cases per model. A provider block is
neither a model refusal nor a passing model response. These scores are conditional
on the unblocked cases.

**The zeros above are format failures, not evidence of zero factual knowledge
or universally unsafe tool decisions.** Mistral and Phi-4 wrapped their JSON
in Markdown fences; some Phi-4 responses also included prose. Those responses
violate the frozen JSON-only contract. No response was truncated by the output cap.

The boundary scores also include format effects. For example, all 16 of Llama's
failed injection responses contained the correct reference but added other text.
These benign instruction-boundary tests do not establish harmful-request
jailbreak resistance.

## Post-hoc format diagnostic

After observing those failures, we added a separate audit that removes one
whole-response JSON Markdown fence. It does not extract JSON from arbitrary
prose or change any primary score.

| Model | Correct tool decisions / 96 | Valid confidence responses / 256 | Binary-choice accuracy on valid responses | Mean Brier loss | 10-bin ECE |
| --- | ---: | ---: | ---: | ---: | ---: |
| Llama 3.3 70B | 96 | 256 | 83.6% | 0.1324 | 0.0805 |
| Mistral Large 3 | 96 | 256 | 87.9% | 0.1056 | 0.0855 |
| Phi-4 | 88 | 226 | 88.1% | 0.1156 | 0.0789 |

Phi-4 still has eight invalid tool responses and 30 invalid confidence responses
under this diagnostic. Its accuracy uses a different subset; **do not rank these
auxiliary figures across models**. There were no unsafe grants or unnecessary
denials among the parseable tool decisions, but unparseable decisions are not
counted as safe. All tools were simulated; nothing was executed.

The confidence suite is a balanced binary adaptation of TruthfulQA, not its
official MC1/MC2 metric. It asks for self-reported confidence. Public-data
contamination, correlated synthetic templates, and provider filtering limit
generalization. See the [suite definitions and attribution](../../../suites/azure-diagnostics-v1/README.md).

## Evidence and reproduction

- [Machine-readable audit](report.json): scores, intervals, format diagnostics,
  request counts, token observations, and SDK comparisons.
- [Bundle index](index.json): three cards and their manifests.
- Harness source at commit `7a29079`; audit source at `98ea9cf`.
  Manifests and the audit also record source SHA-256 hashes.
- Seed 41, temperature 0, maximum 600 output tokens per response, Azure East US 2.
  Before/after deployment snapshots matched. Hosted seeds and weights are not
  independently attested.
- The audit reproduced every score and interval from private journals and checked
  journal hashes, response hashes, suite revisions, and exact probe coverage.
  Raw responses and account configuration remain private.

From the repository root:

```bash
osmsi validate data/azure-diagnostics/2026-11-16
osmsi compare data/azure-diagnostics/2026-11-16 \
  azure-llama33-diagnostics-20261116 azure-mistral3-diagnostics-20261116
python pipelines/verify_publication.py
```

To run a new campaign, use the [Azure guide](../../../docs/azure-evaluations.md)
with your own deployments. Keep the suites frozen and use a new run ID.

Provider-reported usage for this final campaign was **169,189 input tokens and
22,283 output tokens**. This is not a complete Azure bill. The final campaign
excludes 128 earlier journaled adapter-development attempts and separate
connectivity checks; filtered, failed, or interrupted requests may still be billed.
Attempt timings include client pacing and are not inference-server benchmarks.

GPU-family quota was zero in the eight checked regions. H100 quota requests in
East US 2 and West US 3 were denied; the North Europe A100 request required
support. These are subscription restrictions, not evidence of physical capacity.
No GPU VM was created. The two temporary Phi-4 and Llama deployments were removed
after the audit; all nine pre-existing deployments, including Mistral, were preserved.
