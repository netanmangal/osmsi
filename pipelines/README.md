# Pipelines

Install the SDK and harness first. Publication and deployment are explicit steps.
The Azure campaign makes paid model requests
only when invoked with a configured account and explicit request limits.

## Azure comparisons

See [the Azure evaluation guide](../docs/azure-evaluations.md) for
`evaluate_azure.py`. It snapshots deployments, runs the harness, validates results
through the SDK, and compares compatible runs. `analyze_azure_campaign.py` checks
journal hashes and separates provider blocks, malformed formats, tool-decision
errors, and confidence calibration. Raw responses remain private.

`evaluate_cloud.py` extends this workflow to mixed Azure and Superlinked
campaigns. `resume_cloud_parallel.py` resumes a stopped run with bounded
concurrency and an unchanged evaluation protocol. See
[cloud evaluations](../docs/cloud-evaluations.md) for configuration and budgets.

`evaluate_wmdp.py` runs the full pinned cybersecurity knowledge split.
`evaluate_causal_ioi.py` performs controlled interventions on local GPT-2 weights.
`audit_scoped_evidence.py` independently recomputes their published statistics;
`prepare_evidence.py` exports their separate evidence bundles. See
[the reproduction guide](../docs/scoped-evidence.md).

## Discover candidates

```bash
python pipelines/discover_models.py --limit 20 --output out/candidates.json
```

This reads the public Hugging Face registry and records model revisions and
license tags for review. It makes no inference calls. Review licensing, model
scope, and provider availability before evaluating a candidate. The discovery
workflow runs weekly and keeps its output as a GitHub Actions artifact.

## Evaluate and stage

```bash
osmsi run --provider demo --output runs/demo --limit 2
python pipelines/stage_results.py runs/demo/bundle \
  --destination out/review-bundle --allow-samples
```

For real runs, omit `--allow-samples`. The source needs a card and manifest for
every run. Staging validates all pairs before writing a new destination and
builds a deterministic index. Existing bundles are never overwritten. Raw provider
responses, environment files, and unrelated files are not copied.

Staging verifies format and consistency, not scientific validity or whether a
claimed evaluation happened. Review scope, methodology, and retained evidence
before committing real results under `data/`.

## Export reviewed results to the site

```bash
python pipelines/prepare_web.py data/pilots/2026-11-16 --replace
npm run build
```

You can pass multiple bundles; duplicate run IDs fail. The default destination is
`web/public/results/`. Replacement requires `--replace`, validates the existing
directory, and refuses unrelated files. Invalid inputs leave previous results
intact. Sample exports require an additional explicit flag.

`web/public/results/` is a generated, committed snapshot so the site can be built
with Node alone. Keep it in sync with the reviewed source bundles in the same PR.
`python pipelines/verify_publication.py` validates every indexed bundle under
`data/` and checks the website snapshot byte for byte. CI runs this check too.
This includes the independently indexed `web/public/evidence/` reports.

`deploy_azure_site.py` builds a pinned public commit on an existing Azure VM,
switches an immutable release, and checks HTTPS before declaring success.
It restores the previous release if health checks fail. See
[deployment](../docs/deployment.md) for the explicit command and rollback.

## Hosted automation

The manual `benchmark.yml` workflow runs the four pilot suites with two probes
each: at most eight attempts and 600 requested output tokens per response. Set
the repository's `SUPERLINKED_API_KEY` Actions secret before using it. No secret
was copied from the private workspace automatically. Its output is a bundle for
review; it does not update `data/`, the website, or model rankings automatically.

```bash
python -m unittest discover -s pipelines -p 'test_*.py'
```
