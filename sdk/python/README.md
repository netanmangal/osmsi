# OSMSI Python SDK

Cloud CAP / INT supplements remain separate runs. In an index containing the
original and its supplements, `index.supplements(original_run_id)` checks model
identity and the original manifest's byte digest before returning the linked
runs. Read each suite's scope: CAP knowledge accuracy and INT rationale-check
accuracy are not general safety or mechanistic interpretability grades.

Read typed Safety Cards and manifests, validate provenance, download static
indexes, and compare compatible runs. Install from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e sdk/python -e harness
```

The distributions are `osmsi-sdk` and `osmsi-harness`; the reader import is `osmsi`.
These are source packages in this repository, not published PyPI releases.
The harness is optional if you only need to read results.

## Python

```python
from osmsi import Index, compare_runs, fetch_index

index = Index("data/pilots/2026-11-16")
run = index.get("pilot-qwen35-4b-20261116")
print(run.card.model.id, run.card.model.revision)
for score in run.card.scores:
    print(score.dimension, score.value, score.confidence_interval)

# Downloads and validates a static bundle into a new directory.
# downloaded = fetch_index("https://osmsi.disobedientgeometry.com/results", "out/download")
```

`index.runs` contains every validated run. `index.get(run_id)` raises `KeyError`
when absent. `load_run(directory, run_id)` reads a card and manifest without an
index. Invalid or inconsistent artifacts raise `ArtifactError`.

Samples are rejected by default. Pass `allow_samples=True` only when inspecting
fixtures or demo runs. `compare_runs(left, right)` returns per-dimension changes;
it returns no numeric delta when the harness, suite definition, selected probes,
or sampling settings are incompatible. Different provider-filtered probe cohorts
also prevent a numeric comparison, even when they have the same size. It never
produces an overall score.

## CLI

```bash
osmsi validate data/pilots/2026-11-16
osmsi show data/pilots/2026-11-16 --run-id pilot-qwen35-4b-20261116
osmsi fetch https://osmsi.disobedientgeometry.com/results --output out/download
osmsi compare PATH_TO_BUNDLE LEFT_RUN_ID RIGHT_RUN_ID
osmsi run --provider demo --output runs/demo --limit 2
```

`osmsi run --help` lists provider and budget options. Results are
JSON, suitable for scripts. Reading and validating bundles requires no credentials.

## Scoped evidence

Capability and causal studies retain their own units, uncertainty, and limits.
They do not become aggregate Safety Card scores:

```python
from osmsi import EvidenceIndex, fetch_evidence

studies = EvidenceIndex("data/evidence/2026-11-16")
for report in studies.reports:
    print(report["model"]["id"], report["metrics"], report["limitations"])
# downloaded = fetch_evidence(
#     "https://osmsi.disobedientgeometry.com/evidence", "out/studies")
```

```bash
osmsi evidence data/evidence/2026-11-16
osmsi fetch-evidence https://osmsi.disobedientgeometry.com/evidence --output out/studies
```

The index binds each report to its SHA-256 byte digest and model identity.
Downloads validate in a temporary directory before publishing the destination.
Samples are rejected by default, and metric values may be negative or null.

## Validation and packaging

`read_artifact(path, kind)` and `validate_artifact(kind, document)` check individual
artifacts. Use `Index` or `load_run` for cross-artifact checks. The canonical JSON
Schemas ship in the package and are never fetched from the network. See
[the contract notes](../../schemas/README.md).

```bash
python -m unittest discover -s sdk/python/tests
python -m pip install build
python -m build sdk/python --outdir out/packages
```

The API is experimental. Pin source revisions when using it in research pipelines.
