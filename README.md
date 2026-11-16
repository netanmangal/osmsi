# OSMSI

The Open Source Model Safety Index is an experimental evaluation framework for
open-weight models. It connects versioned probes, budgeted model calls, run
manifests, Safety Cards, a Python SDK, and a public website.

**This is an experimental release.** Four diagnostic suites test instruction
boundaries, simulated tool authorization, and factual confidence. Separate
studies measure a cybersecurity knowledge proxy and controlled activation
patching on open weights. These are scoped measurements, not comprehensive
safety benchmarks.

For larger hosted comparisons, the [Azure evaluation guide](docs/azure-evaluations.md)
uses 544 diagnostic cases per model, including a pinned TruthfulQA adaptation.
Provider-filtered cases are counted separately from model scores.

The [Azure results](data/azure-diagnostics/2026-11-16/README.md) cover Phi-4,
Llama 3.3 70B, and Mistral Large 3: 1,632 requests with audited evidence and
separate format diagnostics. The earlier two-question integration run remains
under its own protocol. See [scoped evidence](data/evidence/README.md) for the
capability and weight-access studies. A measured result is not a certification.

## Run the website

Use Node.js 22 or newer (`nvm install` reads `.nvmrc`):

```bash
npm run setup
npm run dev             # http://localhost:5173
npm test
npm run build           # web/dist/
```

The website needs no keys or running backend. It reads static, validated result
bundles from `web/public/results/` and `web/public/evidence/`, and keeps illustrative
specimens behind a sample-preview option in the index.

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
