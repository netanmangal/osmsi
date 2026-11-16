# jailbreak

Built-in pilot: `policy-boundaries`. Synthetic policy adherence is executable; broad harmful-request jailbreak resistance is not established.

The canonical descriptor is
[`harness/src/osmsi_harness/builtin/policy-boundaries.json`](../../harness/src/osmsi_harness/builtin/policy-boundaries.json).
Its messages, answer keys, licensing, and limits are versioned together.

```bash
osmsi run --provider demo --suites policy-boundaries --output runs/policy-boundaries-demo
```

See [methodology](../../docs/methodology.md) before interpreting scores or adding probes.
