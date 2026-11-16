# Scoped studies · November 16, 2026

Three full WMDP-Cyber evaluations and two controlled weight-access experiments
add scoped capability and causal evidence. They do not establish human capability
uplift, model-wide interpretability, safety, or deception detection. All values
below come from the indexed JSON reports.

## WMDP-Cyber knowledge proxy

All 1,987 questions in the pinned WMDP-Cyber test split were attempted for each
of Phi-4, Llama 3.3 70B, and Mistral Large 3: **5,961 completed cases**.
This generated-answer adaptation measures hazard-related knowledge expressed
through Azure endpoints. Higher accuracy means more capability, not more safety.
It is neither the official likelihood-based WMDP score nor human capability uplift.

| Model | Correct / unblocked | Conditional accuracy (95% Wilson interval) | Provider blocks | Malformed answers |
| --- | --- | --- | --- | --- |
| Llama-3.3-70B-Instruct | 998 / 1829 | 54.57% (52.28–56.84) | 158 | 4 |
| Mistral-Large-3 | 1137 / 1830 | 62.13% (59.89–64.33) | 157 | 1 |
| Phi-4 | 279 / 1829 | 15.25% (13.68–16.97) | 158 | 1313 |

Phi-4's strict score is strongly affected by format: 1,313 of 1,829 unblocked
responses were not single letters (31 ended at the token limit). A separately
labelled [post-hoc diagnostic](format-diagnostic.json) accepts a letter followed
by the **exact corresponding option text**, after whitespace normalization.
It recovers 1,251 responses, including 647 additional correct answers. Under
that relaxed rule, Phi-4 has 926/1,829 correct (50.63%), rather than the frozen
279/1,829 (15.25%). This rule was developed after inspecting the outputs; it
does not replace the predeclared result. Llama and Mistral are unchanged.
No arbitrary explanations or prefix-only answer extraction are accepted, and
no additional model requests were made. See the
[diagnostic implementation](../../../pipelines/analyze_wmdp_format.py).

Provider blocks are missing model observations, not refusals or incorrect answers.
The cohorts can differ across models, so these conditional scores are not a
controlled ranking. Counting every blocked case as wrong or as correct gives:

| Model | All-case accuracy bounds |
| --- | --- |
| Llama-3.3-70B-Instruct | 50.23–58.18% |
| Mistral-Large-3 | 57.22–65.12% |
| Phi-4 | 14.04–21.99% |

These are censoring bounds, not confidence intervals. The uniform-guess reference
is 25%; it is arithmetic chance, not a human baseline. Unparseable unblocked
answers count as incorrect. No tools or submitted code executed.

The campaign used **6,066 attempts**, including 105 failed attempts, within its
6,600-attempt budget. One explicit resumption preserved every completed case.
To address rate limiting, capacity on the two task-owned Phi/Llama deployments
was increased from 50 to 200 GlobalStandard units. Model versions, upgrade
policies, and filters were unchanged. The pre-existing Mistral deployment was
used without configuration changes. Both temporary deployments were removed
after the audit; all nine original deployments and their configurations were preserved.

Completed responses reported 2,275,377 input and 24,849 output tokens.
This is not a bill: failures and interruptions can incur additional usage.
Three benign preflight requests are separate from benchmark counts.

The [independent audit](audit.json) checks all case IDs, retained journal and
response hashes, point estimates, intervals, usage totals, and deployment
snapshots. [Operational metadata](operations.json) records capacity changes
and cleanup. Raw benchmark questions, responses, keys, and account configuration
remain in ignored local files. Reports expose answer letters and hashes, not
question text or generated explanations.

The dataset is [`cais/wmdp`](https://huggingface.co/datasets/cais/wmdp), MIT-licensed,
revision `7125571f22f032c56415e7980f48d877dd830ff8`;
the file SHA-256 is
`ec65f7ba4a9cd1ef368618ebd2b90b6d930f9b9f053f67a926b82fd71d87b4fe`.
Read the [WMDP paper](https://arxiv.org/abs/2403.03218) for benchmark design.
Public-data contamination, provider censorship, and hosted-version uncertainty
limit interpretation. Biological, chemical, fraud, and human-assistance effects
were not evaluated. These results do not fill the hosted models’ missing
interpretability dimension.

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
