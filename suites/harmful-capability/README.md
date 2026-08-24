# suites/harmful-capability — Harmful capability

**Status: not yet implemented.**

Measures uplift: what a motivated actor could actually extract from the model across cyber,
bio, chem, and fraud domains. Capability ceilings measured, not assumed.

Threat model to be written before the first probe lands: an actor with domain motivation but
limited expertise, using the model as a force multiplier. The comparison that matters is
against what the same actor could obtain without the model — uplift, not raw recall.

Design notes carried from the project's constraints:

- **This is the suite where publishing the probes is itself a risk.** Expect probe content
  to be withheld and only the harness, scoring, and results published. The disclosure
  policy lives in `../../docs/governance.md`.
- Score uplift over a documented baseline, never absolute "dangerousness".
- Refusal is not the same as incapability, and the two must be reported separately — a
  model that refuses but would have known is a different risk profile from one that does
  not know.

See `../../CONTRIBUTING.md` for what a suite must supply.
