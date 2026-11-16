# OSMSI

The Open Source Model Safety Index is an experimental evaluation framework for
open-weight models. It connects versioned probes, budgeted model calls, run
manifests, Safety Cards, a Python SDK, and a public website.

**This is a pilot release.** Four small suites are executable today. They test
synthetic instruction boundaries, simulated tool authorization, and factual
confidence. They are not comprehensive safety benchmarks. Harmful-capability and
weight-access interpretability evaluations need specialist contributions.

For larger hosted comparisons, the [Azure evaluation guide](docs/azure-evaluations.md)
uses 544 diagnostic cases per model, including a pinned TruthfulQA adaptation.
Provider-filtered cases are counted separately from model scores.

The included live example is a **two-question integration run**, clearly labeled
on the site. A measured result is not a certification or a deployment recommendation.

## Run the website

Use Node.js 22 or newer (`nvm install` reads `.nvmrc`):

```bash
npm run setup
npm run dev             # http://localhost:5173
npm test
npm run build           # web/dist/
```

The website needs no keys or running backend. It reads static, validated result
bundles from `web/public/results/` and keeps illustrative specimens behind a
sample-preview option in the index.

## Run an evaluation

Use Python 3.10 or newer:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e sdk/python -e harness
osmsi run --provider demo --output runs/demo --limit 2
osmsi validate runs/demo/bundle --allow-samples
```

Demo runs are deterministic and always marked as samples. For a hosted model,
set `SUPERLINKED_API_KEY` in your environment, then use `--provider superlinked
--model MODEL_ID`. See [harness/README.md](harness/README.md) for budgets, pinned
revisions, local endpoints, and safe resumption. Never put keys in browser code.

## Repository map

| Directory | Purpose |
| --- | --- |
| `web/` | React website, public results, and browser-side artifact validation |
| `harness/` | Model adapters, journaled runner, and packaged pilot suites |
| `suites/` | Suite authoring notes and per-dimension scope |
| `pipelines/` | Candidate discovery, bundle staging, and website export |
| `sdk/python/` | Typed results, validation, downloads, comparisons, and CLI |
| `schemas/` | Contract notes; canonical JSON Schemas ship inside the SDK |
| `data/` | Versioned published artifacts, including the limited pilot example |
| `internal-tests/` | Opt-in provider checks, separate from offline tests |
| `docs/` | Methodology, architecture, reproduction, and deployment |

Run `make test-python` after installing the Python packages. CI tests packaged
SDK/harness wheels, the website, and provider mocks. Model discovery is scheduled;
paid evaluation is manual and bounded. Nothing deploys or publishes results
without an explicit release step.

Start with [the methodology](docs/methodology.md),
[SDK examples](sdk/python/README.md), or [the pipeline guide](pipelines/README.md).
Contributions should be small and reproducible; see [CONTRIBUTING.md](CONTRIBUTING.md).

Code is [Apache-2.0](LICENSE). Data and documentation under `data/` and `docs/`
are [CC BY 4.0](LICENSE-DATA). Contact: netan@disobedientgeometry.com.
