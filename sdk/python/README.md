# osmsi (Python SDK)

**Status: not yet implemented.**

The client library for people who want OSMSI results, or want to run OSMSI evaluations on
a model that is not in the public index — an internal fine-tune, a candidate checkpoint, a
model under embargo.

Intended surface:

- **Read the index** — fetch Safety Cards, index rows, and run manifests from `../../data/`
  or the published index, as typed objects validated against `../../schemas/`.
- **Run a suite locally** — point the harness at your own model and get a Safety Card back
  without publishing it anywhere.
- **Compare** — diff two cards (two models, or one model across two harness versions),
  since a score only means something next to the run that produced it.

No package has been released from this repository. The SDK will carry its own
`pyproject.toml`; its package name and public API are not settled yet.
