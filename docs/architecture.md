# Architecture

The repository contains a runnable evaluation and publication path:

```text
registry discovery → candidate review → harness + suites
                                      ↓
                              card + run manifest
                                      ↓
                          validation + publication review
                                      ↓
                              static results bundle
                                ↙             ↘
                             website       Python SDK
```

`harness/` owns provider adapters, sequential execution, budgets, journaling, and
scoring. It packages the built-in descriptors so installed users do not need a
checkout. Contributed descriptors are ordinary JSON files, not executable plugins.

`sdk/python/` owns the artifact reader, shared validation, downloads, comparisons,
and CLI. Its bundled JSON Schemas are the single source used by Python and by the
website's Ajv validators. `schemas/` documents those contracts.

`pipelines/` discovers candidates, stages validated bundles, and exports reviewed
results to `web/public/results/`. Discovery does not automatically spend provider
credits. The manually triggered benchmark workflow runs at most eight requests
and uploads only a result bundle for review.

`web/` is a static React app. It fetches the index and its linked cards/manifests,
validates them, and renders measured dimensions and their limitations. Empty,
loading, and failed loads are explicit. Sample specimens are separate from real
measurements; incomplete radars do not fill missing dimensions with zero.

`data/` stores versioned published results. `runs/` and `out/` are ignored local
working directories. Response journals and provider credentials are never browser
assets. `internal-tests/` contains opt-in connectivity checks; automated tests use
fake provider responses.

The research scope remains experimental: four pilot suites cover narrow behaviors,
and two dimensions require specialist contributions. The software supports those
extensions, but does not claim that the current probes measure general safety.
