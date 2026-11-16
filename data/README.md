# Published artifacts

This directory contains versioned result bundles, with one card and manifest per
run and an `index.json` linking them. Published artifacts are immutable records:
use a new run ID and release directory for a rerun.

The current bundle, [`pilots/2026-11-16/`](pilots/2026-11-16/), is a **two-request
integration smoke run** on one model. It is real provider output, but not a
comprehensive calibration or safety benchmark. The other five dimensions are
unmeasured. Its README and the site make that scope explicit.

Before adding results, validate them through the pipeline, review the retained
evidence and methodology, and export the reviewed bundle to `web/public/results/`.
Sample fixtures stay under tests or ignored local output, not this directory.
Raw response journals and credentials must not be committed.

Data is CC BY 4.0. Cite a result with its run ID and manifest. Scores are research
artifacts, not certifications or deployment recommendations.
