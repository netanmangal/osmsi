# harness

**Status: not yet implemented.**

The evaluation runner core. This is what turns "a new open-weight model was released" into
a published Safety Card without anyone hand-running anything.

Intended responsibilities:

- **Model adapters** — load and serve open weights for evaluation, and talk to hosted
  endpoints where local execution is impractical.
- **Suite orchestration** — discover suites under `../suites/`, run them against a model,
  and enforce per-suite budgets.
- **Run manifests** — record harness version, suite versions, model revision, seeds, and
  sampling parameters for every run. A score without a manifest is not publishable
  (see `../CONTRIBUTING.md`).
- **Scoring and intervals** — per-dimension aggregation with confidence intervals. Never
  a single cross-dimension score.
- **Emitting artifacts** — Safety Cards and index rows validated against `../schemas/`,
  written into `../data/`.

Language: Python. Will carry its own `pyproject.toml`.
