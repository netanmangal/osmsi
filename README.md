# OSMSI · Open Source Model Safety Index

An open, continuously updated safety index for open-weight foundation models.

Open-weight models are improving at an unprecedented rate, and there is still no trusted,
continuously updated resource that lets researchers, developers, and policymakers compare
their **safety** characteristics. Existing evaluations largely measure downstream
capability or a single isolated benchmark, and skip the properties that decide whether a
model is safe to deploy: robustness under attack, controllability, calibration,
interpretability, and behaviour when given tools and a long horizon.

OSMSI is an evaluation framework that benchmarks newly released open-weight models and
publishes the results as a transparent public index — reproducible pipelines, a Safety
Card per model, and a leaderboard whose methodology you can read and rerun.

**Status: early.** The public site is live in this repo; the harness, suites, and SDK are
in progress. Nothing here is a certification of any model.

## No single score

A model does not have "a safety number". OSMSI publishes a profile across six dimensions
and never collapses them into one aggregate rank:

| # | Dimension | What it measures |
| --- | --- | --- |
| 01 | **Jailbreak resistance** | Roleplay traps, many-shot escalation, encoded payloads. How long do refusals hold under siege? |
| 02 | **Harmful capability** | Uplift probes across cyber, bio, chem, fraud. What could a motivated actor actually extract? |
| 03 | **Prompt injection** | Poisoned documents, hostile tool output, indirect orders. Does the model serve its user or its attacker? |
| 04 | **Uncertainty calibration** | Whether confidence tracks correctness — ECE, Brier, selective abstention. |
| 05 | **Agentic safety** | Tool access, long horizons, delegated authority. What happens when nobody watches the loop? |
| 06 | **Interpretability** | Features, circuits, and deception indicators, where the weights allow it. |

Each evaluated model gets a **Safety Card**: the per-dimension scores with confidence
intervals, the harness version and run manifest that produced them, and an explicit list
of concerns — so a reader can see *why* a model scored as it did, not just where it ranks.

## Deliverables

1. **The evaluation framework** — modular, so new suites can be contributed as new risks
   emerge.
2. **An automated benchmarking pipeline** that picks up newly released open-weight models.
3. **A public Safety Index leaderboard.**
4. **Per-model Safety Cards**, versioned to the run that produced them.

## Repository map

```
web/         the public site (Vite + React + TypeScript)
harness/     evaluation runner core — schedules suites, records runs
suites/      the evaluation suites, one directory per dimension
sdk/python/  the osmsi SDK for running evaluations and reading results
schemas/     JSON Schema for Safety Cards, run manifests, index rows
data/        published results and Safety Cards
docs/        methodology and governance
```

Each subtree owns its own tooling: `web/` has its `package.json`, the Python subtrees will
carry their own `pyproject.toml`. There is no workspace layer to configure.

`schemas/` is the contract between the harness that produces results and the site that
renders them. Anything that writes or reads a score goes through it.

## Running the site

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into web/dist/
```

See [web/README.md](web/README.md) for the design system, motion, and accessibility notes.

## Honesty constraints

These are project rules, not stylistic preferences. They apply to the site, the docs, and
anything published under `data/`:

- **No fabricated statistics attached to real model names.** Until real harness runs
  publish, every figure on the site belongs to anonymized specimens ("Specimen A…H") and
  carries a visible `SAMPLE` stamp. Real model families appear only as factual scope —
  what OSMSI intends to index — never beside a score.
- **Every published score is traceable** to a harness version and run manifest.
- **Scores are research artifacts, not certifications.** OSMSI does not accredit,
  endorse, or clear any model for deployment.

## Contributing

New evaluation suites are the point of the modular design — see
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

Split, deliberately:

- **Code** — Apache-2.0. See [LICENSE](LICENSE).
- **Data and documentation** — CC BY 4.0, covering `data/` and `docs/`, including
  evaluation results and Safety Cards. See [LICENSE-DATA](LICENSE-DATA).

Published results are meant to be cited and rebuilt; the attribution requirement is how
a score stays traceable to the run that produced it.

## Contact

netan@disobedientgeometry.com

A Disobedient Geometry project.
