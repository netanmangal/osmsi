# Scoped studies · November 16, 2026

Two controlled weight-access experiments measure a narrow indirect-object
identification task. They do not establish model-wide interpretability, safety,
or deception detection. All values below come from the indexed JSON reports.

## Controlled activation interventions

Both models ran locally on Apple MPS in float32 evaluation mode. The protocol
was committed before execution. Each model used 64 discovery prompts to select
a block, then 128 evaluation prompts with disjoint names. There are two shared
templates; these are correlated task variants, not 192 independent behaviors.

| Model | Selected block (zero-based) | Matched patch effect, logits (95% interval) | Mismatched effect, logits | Matched minus mismatched (95% interval) |
| --- | --- | --- | --- | --- |
| GPT-2 | 1 | 6.828 (6.485–7.184) | 3.365 | 3.462 (3.132–3.799) |
| GPT-2 Medium | 7 | 6.728 (6.498–6.979) | 3.556 | 3.172 (2.848–3.508) |

An effect is the change in the final-token logit difference between the correct
indirect-object name and the subject name after replacing one block's residual
state at the changed subject position. The table's intervals use 2,000 paired
prompt bootstrap samples (seed 41); template/name correlation limits inference.

Both trained models preferred the correct name over the subject on all 128
clean evaluation prompts. Untrained matching architectures did so on 59/128
(GPT-2) and 66/128 (Medium). This compares two candidate logits; it is not
full-vocabulary generation accuracy. The untrained result is one seed, not a
population estimate over random initializations.

Matched patches restored more preference than disjoint-name donor controls in
both models. Recovery ratios were 1.001 and 1.005 and remain unclipped. The early
patch can restore token identity; these effects do not isolate a semantic
feature, a minimal circuit, or the full published IOI circuit. The mismatched
control also has a substantial positive effect and must be read alongside
matched recovery.

Positive final-state, unchanged-prefix, and self-patch controls all had zero
observed numerical discrepancy, below the predeclared 0.0001 tolerance. Those
controls verify implementation behavior, not general model interpretability.

The reports embed all discovery/held-out measurements, donor assignments,
source and weight hashes, runtime versions, and fixed seed settings.
[causal-audit.json](causal-audit.json) independently reproduces all point
estimates and intervals and checks controls and donor assignment.
[weight-provenance-audit.json](weight-provenance-audit.json) records verification
against the retained local weight, measurement, and frozen source bytes.
Hashes support auditing retained evidence; they are not third-party attestation.

See the [frozen protocol](../../../suites/causal-ioi-v1/README.md),
[reproduction guide](../../../docs/scoped-evidence.md), and
[original IOI paper](https://arxiv.org/abs/2211.00593). GPT-2 snapshots are
MIT-licensed; this repository's synthetic cases are Apache-2.0.
