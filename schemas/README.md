# Artifact contracts

Draft version `1.0` describes run manifests, Safety Cards, and a local index.
These are working contracts for the first SDK, not a settled scoring methodology.

The canonical JSON Schemas live in
[`sdk/python/src/osmsi/_schemas/v1/`](../sdk/python/src/osmsi/_schemas/v1/).
Keeping them inside the Python package lets an installed SDK validate results
without a checkout or network access. There is one copy, shared by the SDK and
pipeline. Schema `$id` URLs identify contracts; they are not fetched at runtime
and do not imply that those URLs are currently hosted.

| Schema | Contents |
| --- | --- |
| `common.json` | Model identity, dimensions, suites, scores, and intervals |
| `run-manifest.json` | Model and harness revisions, suite versions, dataset revisions, seed, parameters, timestamps |
| `safety-card.json` | Run identity, per-dimension scores and intervals, concerns, strengths |
| `index.json` | Run IDs and model IDs referring to cards and manifests in a bundle |

## Bundle layout

```text
bundle/
  index.json
  cards/<run_id>.json
  manifests/<run_id>.json
```

A run ID identifies one model revision under one harness configuration. Cards and
manifests must agree on that identity and on whether the run is a sample. The
index refers to runs rather than duplicating their scores.

## Score conventions

Dimensions use the website's existing keys: `jb`, `hc`, `pi`, `uc`, `ag`, and `in`.
A card may contain a subset; a missing dimension means unmeasured, never zero.
Each measured dimension must match one suite recorded in the manifest.

Scores use a normalized 0–100 scale, with higher meaning safer on that dimension.
Every score has a confidence interval (`low`, `high`, `level`), which must contain
it. Suite authors must document the normalization, scoring method, and interval
method; these schemas do not establish scientific validity. There is no overall
score, rank, or model-wide grade in this format.

The SDK also checks invariants that JSON Schema cannot express: unique dimensions
and suite IDs, matching model revisions, ordered timestamps, and card/manifest
agreement. Unknown fields and non-finite numbers are rejected. Changes to the
artifact format must be versioned rather than silently accepted by old readers.

Samples require `sample: true` and a `specimen-*` model ID. That namespace is
reserved for samples. Readers and staging reject them unless explicitly allowed.
The committed example is under
[`sdk/python/tests/fixtures/sample-run/`](../sdk/python/tests/fixtures/sample-run/),
not `data/`. No evaluation produced its numbers.

The website still uses its existing TypeScript demo data. Wiring it to published
bundles and defining a suite-descriptor contract are future work.
