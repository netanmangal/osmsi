# OSMSI Python SDK

An early local-results reader. It loads typed Safety Cards and run manifests,
validates them against the bundled draft schemas, and checks their provenance
matches. It does not call model providers or run evaluations yet.

## Install from source

From the repository root, with Python 3.10 or newer:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e sdk/python
```

The distribution is named `osmsi-sdk`; the import is `osmsi`. This repository has
not published a package release to PyPI.

## Read a bundle

```python
from osmsi import Index

# Explicit opt-in: this fixture is synthetic, not an evaluation result.
index = Index("sdk/python/tests/fixtures/sample-run", allow_samples=True)
run = index.get("sample-a-001")

print(run.card.model.id, run.card.model.revision)
print(run.manifest.seed)
for score in run.card.scores:
    print(score.dimension, score.value, score.confidence_interval)
```

For real results, use `Index("path/to/bundle")`; samples are rejected by default.
`index.runs` contains every validated run. `index.get(run_id)` raises `KeyError`
when a run is absent. `load_run(directory, run_id)` reads a card and manifest
without requiring an index. Invalid or inconsistent artifacts raise `ArtifactError`.

`read_artifact(path, kind)` and `validate_artifact(kind, document)` check one
artifact at a time. Use `Index` or `load_run` when cross-artifact checks matter.
See [the contract notes](../../schemas/README.md) for the bundle format and limits.

## Test and build

```bash
python -m unittest discover -s sdk/python/tests
python -m pip install build
python -m build sdk/python --outdir out/packages
```

Both the source distribution and wheel include the JSON Schemas. Validation never
fetches schemas from the network. The API is experimental; remote result fetching,
comparisons, and harness entry points are still to come.
