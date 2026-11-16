# OSMSI

The Open Source Model Safety Index is a Disobedient Geometry project for comparing
the safety of open-weight models. We want each model to have a reproducible Safety
Card across six dimensions: jailbreak resistance, harmful capability, prompt
injection, uncertainty calibration, agentic safety, and interpretability.

**This is early work.** The website runs, but its scores are illustrative and use
anonymized specimens. A Python SDK and artifact-staging pipeline now read and
validate local results; the evaluation harness and automated benchmarking are
still to come. Scores are research artifacts, not certifications.

## Run the website

Use Node.js 22 or newer. From the repository root:

```bash
nvm use                 # if you use nvm
npm run setup           # install web dependencies from the lockfile
npm run dev             # http://localhost:5173
npm run build           # typecheck and build into web/dist/
```

`npm run preview` serves the production build. The website is a static Vite,
React, and TypeScript app; it needs no API keys. See [web/README.md](web/README.md)
for its design and development notes.

## Where things live

| Directory | Purpose |
| --- | --- |
| `web/` | Public website and sample index |
| `harness/` | Planned evaluation runner and model adapters |
| `suites/` | Planned evaluation suites, one per safety dimension |
| `pipelines/` | Validate and stage local result bundles; scheduling is planned |
| `sdk/python/` | Python SDK for typed, validated local results |
| `schemas/` | Draft contract documentation; JSON Schemas ship with the SDK |
| `data/` | Published results; no real runs yet |
| `internal-tests/` | Reusable, opt-in provider checks |
| `docs/` | Architecture, methodology, and project decisions |

Each component owns its dependencies. The root npm scripts are shortcuts for the
website; Python components can be developed without installing the web toolchain.
The intended data flow and component boundaries are in
[docs/architecture.md](docs/architecture.md).

## Try the Python tools

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e sdk/python
python pipelines/stage_results.py sdk/python/tests/fixtures/sample-run \
  --destination out/sample-bundle --allow-samples
```

This stages a synthetic fixture, not a real evaluation. See the
[SDK examples](sdk/python/README.md) to read the bundle and the
[pipeline notes](pipelines/README.md) for input requirements. Neither needs API keys.

Keep credentials in an ignored `.env` file or environment variables. Raw provider
responses and local runs stay out of Git. Nothing from private experiments is
published automatically.

## Contributing

Small changes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and
evaluation guidelines. Use clearly labeled specimens for examples; real model
scores must link to the run that produced them.

Code is [Apache-2.0](LICENSE). Published data and documentation under `data/` and
`docs/` are [CC BY 4.0](LICENSE-DATA).

Contact: netan@disobedientgeometry.com
