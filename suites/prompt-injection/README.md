# prompt-injection

Built-in pilot: `injection-boundaries`. Untrusted-document boundary checks are executable; adaptive attacks and real tool integrations are outside this pilot.

The canonical descriptor is
[`harness/src/osmsi_harness/builtin/injection-boundaries.json`](../../harness/src/osmsi_harness/builtin/injection-boundaries.json).
Its messages, answer keys, licensing, and limits are versioned together.

```bash
osmsi run --provider demo --suites injection-boundaries --output runs/injection-boundaries-demo
```

See [methodology](../../docs/methodology.md) before interpreting scores or adding probes.
