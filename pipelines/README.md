# Artifact pipeline

`stage_results.py` validates completed card/manifest pairs and stages a local
bundle for review. It uses the same schemas and cross-artifact checks as the SDK.
It does not run evaluations, publish files to a service, or update the website.

Install the [Python SDK](../sdk/python/README.md), then try the synthetic fixture:

```bash
python pipelines/stage_results.py sdk/python/tests/fixtures/sample-run \
  --destination out/sample-bundle --allow-samples
```

For real run output, omit `--allow-samples`:

```bash
python pipelines/stage_results.py runs/completed \
  --destination out/review-bundle
```

The source needs `cards/<run_id>.json` and `manifests/<run_id>.json` for every run.
The pipeline validates all pairs, orders runs by ID, and builds a fresh
`index.json`. It serializes only validated artifact fields; environment files,
provider response logs, and unrelated source files are not copied.

The destination must be new. Invalid input leaves no partial bundle, and a rerun
cannot overwrite a previous bundle. Successful staging is a format and consistency
check, not approval of a score or proof that an evaluation was performed. Review
provenance and methodology before committing real results under `data/`.

```bash
python -m unittest discover -s pipelines -p 'test_*.py'
```

Model discovery, budgeted harness execution, scheduling, and remote publication
are still unimplemented. They belong here as orchestration jobs; model adapters
belong in `harness/` and scoring belongs in `suites/`.
