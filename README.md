# OSMSI

The Open Source Model Safety Index is a Disobedient Geometry project for comparing
the safety of open-weight models. We want each model to have a reproducible Safety
Card across six dimensions: jailbreak resistance, harmful capability, prompt
injection, uncertainty calibration, agentic safety, and interpretability.

**This is early work.** The website runs, but its scores are illustrative and use
anonymized specimens. The evaluation harness, benchmarking pipeline, schemas, and
end-user SDK are not implemented yet. Scores are research artifacts, not certifications.

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
| `pipelines/` | Planned discovery, evaluation, and publishing jobs |
| `sdk/python/` | Planned Python SDK for end users |
| `schemas/` | Planned shared contracts for cards, manifests, and index rows |
| `data/` | Published results; no real runs yet |
| `internal-tests/` | Reusable, opt-in provider checks |
| `docs/` | Architecture, methodology, and project decisions |

Each component owns its dependencies. The root npm scripts are shortcuts for the
website; Python components can be developed without installing the web toolchain.
The intended data flow and component boundaries are in
[docs/architecture.md](docs/architecture.md).

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
