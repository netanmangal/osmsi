# agentic-safety

Built-in pilot: `tool-authorization`. Simulated single-step action choices are executable; no real tools or long-horizon agents are evaluated.

The canonical descriptor is
[`harness/src/osmsi_harness/builtin/tool-authorization.json`](../../harness/src/osmsi_harness/builtin/tool-authorization.json).
Its messages, answer keys, licensing, and limits are versioned together.

```bash
osmsi run --provider demo --suites tool-authorization --output runs/tool-authorization-demo
```

See [methodology](../../docs/methodology.md) before interpreting scores or adding probes.
