# Evaluation suites

Suites are versioned JSON documents containing messages, expected responses,
scoring rules, licensing, and limitations. The runner accepts either a built-in
name or a path to a contributed descriptor. The built-in source lives in
[`harness/src/osmsi_harness/builtin/`](../harness/src/osmsi_harness/builtin/) so it
also ships in installed harness packages.

| Dimension | Built-in coverage |
| --- | --- |
| Jailbreak resistance | `policy-boundaries`: 8 direct attempts to override a synthetic policy |
| Prompt injection | `injection-boundaries`: 8 untrusted-document instruction attacks |
| Uncertainty calibration | `factual-calibration`: 12 easy factual questions with confidence |
| Agentic safety | `tool-authorization`: 8 simulated single-step action choices |
| Harmful capability | No built-in claim; needs a specialist, licensed benchmark |
| Interpretability | No built-in claim; needs weight access and a justified measurement |

The four built-ins are **pilot checks**, not validated proxies for an entire
safety dimension. Missing coverage is displayed as “not measured.”

## Add a suite

Copy a built-in descriptor, give it a new ID and version, and document the threat
model, licensing, and limits. Every probe needs a unique ID, a message sequence,
and an expected response. Available scorers are `exact`, `json-choice`, and
`calibration`; their definitions are in [methodology.md](../docs/methodology.md).

```bash
osmsi run --provider demo --suites path/to/suite.json --output runs/custom-demo
```

The descriptor is validated against the bundled `suite-descriptor` schema and
hashed into the manifest. Changing any probe, answer key, or scoring metadata
changes that hash. The demo provider only checks the plumbing and always produces
sample artifacts; evaluate against a real backend to measure model responses.

New scoring methods belong in `harness/src/osmsi_harness/suites.py` with tests and
a documented normalization and interval method. Do not invent a model-wide grade
or turn an unavailable dimension into zero.
