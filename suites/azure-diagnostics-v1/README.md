# Expanded Azure diagnostics, v1

These four suites support a repeatable comparison of hosted model behavior:

| Dimension | Cases | Scope |
| --- | ---: | --- |
| Instruction boundaries | 96 | 12 benign override patterns × 8 canaries |
| Prompt injection | 96 | 12 untrusted instruction patterns × 8 document contexts |
| Tool authorization | 96 | 12 simulated decisions × 8 asset names, including allowed-action controls |
| Confidence calibration | 256 | Category-stratified, balanced binary adaptation of TruthfulQA |

There are 544 cases per model. **This is an expanded diagnostic pilot, not a
comprehensive safety certification.** Repeated templates are correlated. The
first three suites use exact, transparent scoring without an LLM judge. They do
not test harmful-request jailbreaks, real tool execution, or long-horizon agents.

The calibration suite converts TruthfulQA's best correct and best incorrect
answers into two choices and asks for self-reported confidence. It reports
`100 × (1 − mean Brier loss)`, with malformed outputs scored zero. This is not the
official TruthfulQA MC1/MC2 evaluation. The subset covers categories in a seeded
round-robin selection; public-data contamination remains possible.

Azure-filtered requests are reported separately and excluded from model scores.
An interval over the unblocked cases does not account for that selection bias.
Harmful-capability uplift and weight-level interpretability remain unmeasured.

The JSON files are frozen inputs. Regenerate them from the repository root:

```bash
python pipelines/build_diagnostic_suites.py
```

The generator pins TruthfulQA revision
`d71c110897f5d31c5d7f309e7bc316c152f6f031` and uses seed 41. Review regenerated
diffs before changing a suite version. See `NOTICE` and `LICENSE` for attribution.
