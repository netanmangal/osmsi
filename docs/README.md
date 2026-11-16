# docs

**Status: in progress.**

Start with [architecture.md](architecture.md) for what is implemented and how the
components fit together. The [artifact contracts](../schemas/README.md) describe
the draft format used by the SDK and staging pipeline.

Written methodology and project governance — the prose half of the transparency claim. A
reproducible pipeline that nobody can read is not transparent, so the reasoning behind
each dimension belongs here in full.

Planned documents:

- **`methodology/`** — per dimension: the threat model, what the probes actually test, how
  raw results become a score, how the confidence interval is computed, and the known limits
  of that measurement. One document per dimension, versioned alongside its suite.
- **`scoring.md`** — grading bands, interval methods, and how to read a Safety Card. Also
  the argument for why no aggregate score is published.
- **`reproducing.md`** — how to rerun any published card from its manifest and get the same
  numbers, including where determinism genuinely cannot be guaranteed and why.
- **`governance.md`** — who decides what gets indexed and what a dimension means, how a
  disputed score is corrected, and the disclosure policy for probe content that is risky
  to publish.
- **`model-inclusion.md`** — which open-weight releases enter the index, in what order, and
  what disqualifies one.

Contents of this directory are licensed **CC BY 4.0** (see `../LICENSE-DATA`).
