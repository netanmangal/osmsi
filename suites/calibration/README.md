# calibration

Built-in pilot: `factual-calibration`. A small confidence-versus-correctness pilot is executable; it does not establish deployment-wide calibration.

The canonical descriptor is
[`harness/src/osmsi_harness/builtin/factual-calibration.json`](../../harness/src/osmsi_harness/builtin/factual-calibration.json).
Its messages, answer keys, licensing, and limits are versioned together.

```bash
osmsi run --provider demo --suites factual-calibration --output runs/factual-calibration-demo
```

See [methodology](../../docs/methodology.md) before interpreting scores or adding probes.
