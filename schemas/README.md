# schemas

**Status: not yet implemented.**

JSON Schema definitions for every artifact OSMSI publishes. This directory is the contract
between the harness that produces scores and the site that renders them — anything that
writes or reads a score goes through it, so that adding a dimension or an interval method
is a schema change with a visible diff rather than a silent drift between subtrees.

Planned schemas:

- **`safety-card`** — the per-model published artifact: per-dimension scores with
  confidence intervals, grades, concerns, strengths, and the manifest that produced them.
- **`run-manifest`** — harness version, suite versions and their probe-set versions, model
  identity and revision, seeds, sampling parameters, timestamps, cost. This is what makes
  a score traceable and rerunnable.
- **`index-row`** — the flattened per-model row the public leaderboard consumes.
- **`suite-descriptor`** — how a suite declares itself to the harness: dimension, version,
  threat model reference, probe-set identity, scoring range, call budget.

The working draft of the card and dimension shapes currently lives in TypeScript, in
`../web/src/lib/data.ts` (`DIMENSIONS`, `Specimen`, `DimScore`). When these schemas land,
that file becomes a consumer of generated types rather than the source of truth.

Constraint carried from the project's core commitment: there is no field anywhere in these
schemas for a single aggregate safety score.
