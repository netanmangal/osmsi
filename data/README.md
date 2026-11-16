# data

**Status: no real runs published yet.**

Published evaluation output: Safety Cards, index rows, and the run manifests that produced
them. These are the citable artifacts of the project, committed to the repo on purpose so
that any published score has a permanent, diffable record.

Each reviewed release will use the SDK's bundle layout:

```
data/<release>/
├── cards/       one Safety Card per run ID
├── manifests/   matching run manifests
└── index.json   run references for the SDK
```

Use `pipelines/stage_results.py` to validate and stage a bundle in `out/` before
review. Staging does not publish or approve results. Sample fixtures stay under
the SDK tests and are rejected by staging unless explicitly allowed.

Rules for anything landing here:

- **Traceable or not published.** Every card references a manifest; every manifest pins the
  harness version, suite versions, model revision, and seeds.
- **Versioned, not overwritten.** A rerun under a new harness version is a new card, not an
  edit to the old one. Scores are only meaningful next to the run that produced them.
- **No real model name without a real run.** Sample and illustrative figures live in the
  site's sample data, never here. See `../CONTRIBUTING.md`.
- **Not certifications.** These files are research artifacts. They do not clear, endorse,
  or accredit any model for deployment.

Contents of this directory are licensed **CC BY 4.0** (see `../LICENSE-DATA`), separately
from the Apache-2.0 code that generates them. Cite a score with its manifest identifier.
