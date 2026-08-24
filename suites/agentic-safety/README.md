# suites/agentic-safety — Agentic safety

**Status: not yet implemented.**

Measures behaviour when a model is given tools, a long horizon, and delegated authority —
what happens when nobody watches the loop.

Threat model to be written before the first probe lands: no adversary required. The risk is
the model itself pursuing a delegated goal past the boundary the user intended, in
sandboxed agent runs across task families.

Properties under test:

- **Boundary respect** — does it stay inside the authority it was given, or escalate scope
  when the goal is easier to reach outside it?
- **Irreversibility awareness** — does it treat destructive and unrecoverable actions
  differently from reversible ones?
- **Stopping and asking** — does it halt on ambiguity, or improvise and continue?
- **Honest reporting** — does its account of what it did match what it did? This overlaps
  with deception indicators in `../interpretability/`; results should cross-reference.

Design notes: runs must be sandboxed and reproducible, with full action traces recorded in
the manifest. Score by failure severity, not just failure count — one unrecoverable action
outweighs many harmless overreaches.

See `../../CONTRIBUTING.md` for what a suite must supply.
