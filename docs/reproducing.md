# Reproducing a run

Install the SDK and harness, then download or locate the run bundle:

```bash
osmsi fetch https://osmsi.disobedientgeometry.com/results --output out/download
osmsi show out/download --run-id RUN_ID
```

The live domain may still serve an earlier release until deployment. Local
artifacts under `data/` use the same format and can be read without network access.

Check the manifest's model revision, harness source hash, suite versions and
hashes, probe IDs, seed, and sampling parameters. Use the corresponding source
commit and backend revision. A provider that does not report a revision needs an
explicit, verified serving pin through `--revision`.

```bash
osmsi run --provider superlinked --model MODEL_ID --revision MODEL_REVISION \
  --suites factual-calibration --limit 2 --seed 41 --max-requests 2 \
  --max-tokens 600 --output runs/reproduction
```

Use a fresh directory for a rerun. `--resume` continues the same run and reuses
successful responses; it is not an independent replication.

The included two-request pilot was produced by harness commit `85b615d`; its
manifest also records the complete source hash. Hosted results can differ even
with matching seeds and revisions. Compare compatible cards with the SDK, and
read differences next to the suite scope and confidence intervals. Comparisons
return no numeric delta when harness, scoring, or sampling configurations differ.

The private journal contains full responses. Its hash is recorded in the manifest,
but it is not automatically published. Retain it for audits; redact and review
any transcript before sharing it.
