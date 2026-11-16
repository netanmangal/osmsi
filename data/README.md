# Published artifacts

This directory contains versioned result bundles, with one card and manifest per
run and an `index.json` linking them. Published artifacts are immutable records:
use a new run ID and release directory for a rerun.

Published bundles:

- [`azure-diagnostics/2026-11-16/`](azure-diagnostics/2026-11-16/README.md):
  1,632 requests across Phi-4, Llama 3.3 70B, and Mistral Large 3, covering four
  behavioral dimensions. The report separates provider blocks and format failures.
- [`pilots/2026-11-16/`](pilots/2026-11-16/): a two-request integration smoke run
  on one model. The other five dimensions are unmeasured.

The website keeps these different evaluation protocols separate.

Before adding results, validate them through the pipeline, review the retained
evidence and methodology, and export the reviewed bundle to `web/public/results/`.
Sample fixtures stay under tests or ignored local output, not this directory.
Raw response journals and credentials must not be committed.

Data is CC BY 4.0. Cite a result with its run ID and manifest. Scores are research
artifacts, not certifications or deployment recommendations.
