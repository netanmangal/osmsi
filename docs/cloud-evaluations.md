# Cloud model campaigns

`pipelines/evaluate_cloud.py` runs the same SDK-backed harness against Azure
Foundry and Superlinked. Inference stays in the cloud. Credentials, account
configuration, and raw response journals belong under ignored `out/` or `runs/`.

Use the account fields from [the Azure guide](azure-evaluations.md), and add a
`provider` to each model entry:

```json
{
  "models": [
    {
      "provider": "azure",
      "model": "MODEL_NAME",
      "deployment": "DEPLOYMENT_NAME",
      "version": "CONTROL_PLANE_VERSION",
      "run_id": "azure-example"
    },
    {
      "provider": "superlinked",
      "model": "MODEL_NAME",
      "revision": "OBSERVED_RESPONSE_HEADER_REVISION",
      "catalog_revision": "CATALOG_REVISION",
      "run_id": "superlinked-example"
    }
  ]
}
```

Azure entries also require the top-level subscription, resource group, account,
region, and endpoint fields. A Superlinked-only config needs only `models`.
Set `SUPERLINKED_API_KEY` for Superlinked; use `AZURE_AI_API_KEY` or the CLI flag
below for Azure. Never put a key in the config.

```bash
python pipelines/evaluate_cloud.py \
  --config out/cloud-config.json --output runs/cloud-campaign \
  --suites suites/azure-diagnostics-v1/*.json \
  --max-requests-per-model 600 --max-total-requests 1200 \
  --workers 2 --retries 3 --key-from-azure-cli
```

The example budget covers two models with 544 cases each and room for failed
attempts. Increase the total explicitly for more models. Up to twelve models can
run concurrently, with request starts spaced by at least two seconds per model.
Completed responses are reused on `--resume`. Incomplete runs emit no card.

Check a benign preflight before committing to a campaign. A catalog entry is not
proof that an endpoint is available or supports the required response format.
Pin the revision actually reported by Superlinked and record any disagreement
with its catalog. Neither a provider header nor an Azure deployment version
independently verifies the served weights. Model aliases and serving profiles
must not inflate the distinct-model count.

## Resuming slower runs

For a stopped run, `resume_cloud_parallel.py` allows up to eight in-flight
requests while retaining the two-second minimum between starts. Stop the
original process first: a journal must have only one writer.

```bash
python pipelines/resume_cloud_parallel.py \
  --run runs/cloud-campaign/azure-example \
  --suites suites/azure-diagnostics-v1/*.json \
  --max-requests 600 --workers 4 \
  --azure-endpoint https://YOUR_ACCOUNT.cognitiveservices.azure.com
```

The parallel executor verifies the original protocol fingerprint before making
requests. It appends to the original journal, counts earlier failures against
the budget, and stores a receipt with its source hash, concurrency, and journal
digests. It makes no automatic retries. Explicit resumption can retry a failed
or uncertain request and may incur another charge.

The ordinary harness replays the finished journal to build the card. Scheduling
changes do not alter prompts, model parameters, scoring, or the harness revision.
Keep the scheduling receipts with the audit report. Concurrent execution can
affect service load and latency; timings are not controlled speed comparisons.
For Azure, verify the deployment model/version, upgrade policy, and filtering
policy against the initial snapshot again before publication.

Use `analyze_azure_campaign.py` for either provider. It recomputes scores and
intervals, verifies every response hash and selected case, and reports provider
blocks and formatting failures separately. The SDK rejects numeric comparisons
when filtering leaves different scored cohorts. These four behavioral suites
do not measure every dimension described by OSMSI.
