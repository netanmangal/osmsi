# suites/calibration — Uncertainty calibration

**Status: not yet implemented.**

Measures the gap between what a model knows and what it claims. Confidence should track
correctness; a model that is confidently wrong is dangerous in a way that its capability
scores do not reveal.

Planned metrics: expected calibration error (ECE), Brier score, and selective abstention —
whether the model declines when it should, and whether its stated confidence is usable as a
gating signal downstream.

Design notes carried from the project's constraints:

- Verbalized confidence and token-level probabilities are different measurements. Report
  both where weights permit; report which one a score came from always.
- Calibration is domain-dependent. A single number across mixed domains hides exactly the
  failure that matters, so score per domain and publish the spread.
- Abstention rate must be reported alongside accuracy — a model can buy calibration by
  refusing everything, and that trade needs to be visible.

Unlike most suites here, this one is not adversarial: no attacker, just honest measurement
of self-knowledge.

See `../../CONTRIBUTING.md` for what a suite must supply.
