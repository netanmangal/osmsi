# Evaluation harness

A sequential runner for versioned JSON probe suites. It supports Superlinked,
OpenAI-compatible hosted endpoints, loopback HTTP servers, and a deterministic
sample provider. Install it alongside the SDK from the repository root:

```bash
python -m pip install -e sdk/python -e harness
osmsi run --list-suites
osmsi run --provider demo --output runs/demo --limit 2
```

Azure deployments are supported with `--provider azure`, `--deployment`,
`--model-version`, and an HTTPS account origin in `--base-url`. See
[the Azure guide](../docs/azure-evaluations.md) for a bounded multi-model campaign.

The packaged suites live in `src/osmsi_harness/builtin/`. All four are pilots with
explicit limits; see [the methodology](../docs/methodology.md).

## Hosted or local models

```bash
# Credentials are read from the environment; .env is not loaded automatically.
osmsi run --provider superlinked --model MODEL_ID \
  --suites factual-calibration --limit 2 --max-requests 2 \
  --max-tokens 600 --output runs/first-live-run

osmsi run --provider openai-compatible --model LOCAL_MODEL \
  --base-url http://127.0.0.1:8080/v1 --revision PINNED_REVISION \
  --output runs/local-model
```

Superlinked uses `SUPERLINKED_API_KEY`; generic endpoints use `OSMSI_API_KEY`.
`--key-env` changes the variable name. Remote connections require HTTPS;
loopback HTTP supports local inference servers. Keys never enter manifests.

The adapter pins `X-Sie-Model-Revision` when available and rejects revision drift.
For a backend without that header, supply `--revision` only when its serving
configuration is pinned. A user-declared revision is not independently verified.
Seeds and temperature zero are recorded, but a hosted provider may ignore them.

## Budgets and failures

`--max-requests` caps attempts, including failures and retries. Preflight rejects
runs whose selected probes exceed the budget before making a call. `--max-tokens`
caps requested output per call; it is not a monetary cap. The default timeout is
60 seconds and there are no automatic retries.

`--max-credits` is an optional **soft limit** on reported Superlinked charges.
One response can cross it before the charge is known. Missing charge information
stops a credit-limited run. Failed or interrupted calls may still be billed.

Progress is stored in ignored `journal.jsonl` and `run-state.json` files. The
journal contains model responses and must remain private. A complete run emits:

```text
runs/my-run/
  journal.jsonl
  run-state.json
  bundle/index.json
  bundle/cards/<run_id>.json
  bundle/manifests/<run_id>.json
```

Resume with the same arguments plus `--resume`. Completed probes are reused;
configuration or harness-code changes are rejected. Add `--retry-failed` only to
authorize another possibly billable attempt after a failed or uncertain call.
Request and credit limits can be raised explicitly. Failed runs emit no card.

Custom suite files can be passed to `--suites`. Choose one suite per dimension.
No contributed probe can execute Python or shell commands through this runner.

Explicit Azure content-filter blocks are recorded separately and excluded from
model scores. A suite with fewer than two unblocked responses stays unmeasured;
other completed suites can still produce a card. Non-filter HTTP errors still
fail the run. Reported token usage may omit charges for filtered or failed calls.
