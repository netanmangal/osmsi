# Contributing to OSMSI

OSMSI is modular on purpose: the safety risks worth measuring in a year are not the ones
worth measuring today, so the framework is built to absorb new evaluation suites without
reshaping the core. Contributed suites are the most valuable thing you can send.

**Status: pilot.** The runner, artifact pipeline, SDK, and website work end to end.
The built-in probes cover narrow behaviors, and the research methodology is not
settled. Discuss specialist benchmarks before expanding a dimension's claims.

## Ground rules

Three constraints are not negotiable, because the project is worthless without them.

1. **No fabricated statistics attached to real model names.** If you do not have a real
   harness run, use anonymized specimens and mark them `SAMPLE`. This applies to the site,
   the docs, issues, and PR descriptions.
2. **Every score is traceable.** A number that cannot be tied to a harness version and a
   run manifest does not get published.
3. **Scores are research artifacts, not certifications.** Do not write copy — anywhere —
   that presents a score as endorsement, accreditation, or a deployment guarantee.

Beyond that: an evaluation that cannot be rerun is an anecdote. Determinism, pinned
versions, and recorded seeds matter more here than they do in most projects.

## Repository layout

| Path | What lives there |
| --- | --- |
| `web/` | the public site (Vite + React + TS) |
| `harness/` | evaluation runner core — schedules suites, records runs |
| `suites/` | evaluation suites, one directory per dimension |
| `pipelines/` | discovery, evaluation, and publishing jobs |
| `sdk/python/` | the `osmsi` SDK |
| `internal-tests/` | opt-in provider checks; no credentials or captured responses |
| `schemas/` | JSON Schema for Safety Cards, run manifests, index rows |
| `data/` | published results and Safety Cards |
| `docs/` | methodology and governance |

Each subtree owns its tooling. Root npm scripts delegate to `web/`.

## Development setup

**Site:**

```bash
nvm use           # optional; otherwise use Node.js 22+
npm run setup
npm run dev
npm run build      # must typecheck clean before you open a PR
```

**Python SDK and artifact pipeline** (Python 3.10+):

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e sdk/python -e harness
make test-python
```

Schema changes belong in `sdk/python/src/osmsi/_schemas/`, the single copy bundled
with the SDK. See `schemas/README.md` for versioning and cross-artifact invariants.
Built-in descriptors live under `harness/src/osmsi_harness/builtin/` and ship with
the harness package. Contributed JSON descriptors can live outside the package
and be passed directly to `osmsi run --suites`.

## Adding an evaluation suite

Suites live one per dimension under `suites/`, and a new suite is expected to supply:

- **A stated threat model.** What attacker, with what access, pursuing what? A suite whose
  threat model is not written down cannot be interpreted, and its scores cannot be
  defended when someone disputes them.
- **Deterministic, versioned probes.** Pinned prompt sets or generators with recorded
  seeds. If probe content must stay unpublished to remain useful, say so and explain how
  results can still be independently verified.
- **A scoring function with a documented range and a stated confidence interval method.**
  Scores are per-dimension. Do not contribute anything that aggregates dimensions into a
  single number — that is a deliberate non-goal of this project.
- **Licensing clarity for any dataset you bring.** If the license does not allow
  redistribution, ship the fetch and preparation code, not the data.
- **A cost estimate.** Roughly how many model calls per model evaluated, so the automated
  pipeline can budget it.

See `suites/README.md` for the current directory conventions and the six dimensions.

## Pull requests

- Keep a PR to one suite, one fix, or one section of the site.
- Say what you ran and what you observed. For a suite, include a sample run against at
  least one open-weight model, with the manifest.
- Site changes: `npm run build` must exit clean, and both fallbacks must survive —
  `prefers-reduced-motion: reduce` and no-WebGL. Both are documented in `web/README.md`.
- Do not commit generated artifacts, `node_modules/`, virtualenvs, or local run scratch.
- Keep `.env` files and raw API responses out of commits. Provider checks are opt-in;
  automated tests should use fake responses and need no keys.

## Reporting a safety concern

If you find that a published OSMSI score is wrong or misleading, open an issue with the
run manifest identifier — a wrong score in a public index is a bug of the highest severity
here.

If a suite's probe content itself poses a disclosure risk, do not open a public issue.
Email netan@disobedientgeometry.com instead.
