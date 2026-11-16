# Repository architecture

The public repository owns the website, artifact contracts, Python reader, and
local artifact pipeline. The website is a standalone static app using illustrative
fixtures from `web/src/lib/data.ts`; it does not call the SDK or a backend yet.

## Component boundaries

- `harness/` will execute suites, call model adapters, and record run manifests.
- `suites/` will own probes, threat models, and per-dimension scoring.
- `pipelines/` currently validates and stages result bundles. Model discovery,
  scheduling, and publication are future jobs.
- `schemas/` documents the draft artifact contracts. Their canonical JSON files
  ship inside `sdk/python/src/osmsi/_schemas/` so installed readers can use them
  offline. Both the SDK and pipeline validate against these files.
- `data/` is reserved for reviewed real results. Local output belongs in ignored
  `runs/` or `out/` directories. Test fixtures remain under the SDK tests.
- `sdk/python/` exposes typed, validated local results to end users. It will later
  add remote reads and evaluation entry points.
- `internal-tests/` holds opt-in provider checks. These are separate from offline
  tests and from private scratch repositories.

The planned flow is:

```text
pipelines -> harness + suites -> artifact validation -> data -> website / SDK
```

The artifact validation and local SDK read are implemented. There is no automated
model discovery, evaluation harness, public API, or remote result publication.
Validation checks recorded provenance; it cannot establish that a claimed run
actually happened or that its scoring method is scientifically sound.

## Development and deployment

Each component owns its dependencies: `web/package.json` for the app and
`sdk/python/pyproject.toml` for the reader. Root npm commands delegate to `web/`.
The artifact pipeline uses the installed SDK rather than a second validator.

Website CI builds `web/dist/`, which a static host can serve at the domain root.
Python CI builds a source distribution and wheel, then tests the installed wheel
and stages a sample bundle. Neither workflow deploys or publishes a release.

Provider keys belong in the environment of a local check or a future harness
worker. Never place them in browser code or a `VITE_*` variable. The SDK and
artifact pipeline need no credentials.
