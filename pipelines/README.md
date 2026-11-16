# Pipelines

Not implemented yet. This directory is for jobs that connect model discovery,
evaluation, and publication:

1. Discover a candidate model and pin its revision.
2. Invoke the harness with explicit suites, seeds, and call budgets.
3. Validate its artifacts against `schemas/`.
4. Publish reviewed cards, manifests, and index rows under `data/`.

Keep orchestration here, model execution in `harness/`, and scoring in `suites/`.
Jobs should record failures and charged attempts, and be safe to resume without
publishing duplicate results. Provider checks in `internal-tests/` are development
tools, not evaluation pipelines.

The website build runs separately in `.github/workflows/web.yml`.
