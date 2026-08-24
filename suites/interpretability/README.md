# suites/interpretability — Interpretability

**Status: not yet implemented.**

Open weights should buy understanding. This suite probes how much a model's internals
actually yield: features, circuits, and deception indicators.

Planned probes: sparse autoencoder feature extraction, a linear probe battery over
behaviourally relevant properties, and indicators of divergence between internal state and
stated output.

Design notes carried from the project's constraints:

- **This is the only dimension that is not always applicable**, and that must be reported
  honestly. Architecture, weight availability, and tooling maturity all gate what can be
  measured; where a probe cannot run, the card says *not measured*, never a default score.
- Interpretability results are the most contested measurements in the index. Every metric
  needs a written argument for what it licenses you to conclude — and what it does not.
- A high score means the model was legible to *these* probes, not that it is understood.
  Copy must not overclaim.

Deception indicators found here should cross-reference the honest-reporting results in
`../agentic-safety/` — internal evidence and behavioural evidence of the same property.

See `../../CONTRIBUTING.md` for what a suite must supply.
