# Evaluating Azure-hosted models

The [published three-model campaign](../data/azure-diagnostics/2026-11-16/README.md)
includes 1,632 requests, audited cards, provider-filter counts, and a separate
diagnostic for JSON wrapped in Markdown.

The Azure adapter uses the account's `/openai/v1/chat/completions` endpoint.
It separates the deployment name used for routing from the model identity shown
in a Safety Card. Credentials come from `AZURE_AI_API_KEY` and never enter an
artifact. Only public-cloud Azure HTTPS account origins are accepted.

For an existing deployment:

```bash
osmsi run --provider azure --model Phi-4 \
  --deployment YOUR_DEPLOYMENT --model-version 7 \
  --base-url https://YOUR_ACCOUNT.cognitiveservices.azure.com \
  --suites suites/azure-diagnostics-v1/truthfulqa-confidence-subset.json \
  --max-requests 256 --output runs/azure-phi4
```

The recorded revision is an **Azure control-plane model version**, not a verified
weights commit. A hosted model can differ from its downloadable counterpart.
The adapter does not claim deterministic output or independent attestation of
which weights served a request.

## Repeatable multi-model campaign

The [expanded diagnostics](../suites/azure-diagnostics-v1/README.md) contain 544
cases across four behavioral dimensions. Create a private JSON config under
ignored `out/` with this shape:

```json
{
  "subscription": "YOUR_SUBSCRIPTION",
  "resource_group": "YOUR_GROUP",
  "account": "YOUR_ACCOUNT",
  "region": "eastus2",
  "endpoint": "https://YOUR_ACCOUNT.cognitiveservices.azure.com",
  "models": [
    {
      "model": "Phi-4",
      "deployment": "YOUR_DEPLOYMENT",
      "version": "7",
      "run_id": "azure-phi4-example"
    }
  ]
}
```

After `az login`, run:

```bash
python pipelines/evaluate_azure.py \
  --config out/azure-config.json --output runs/azure-campaign \
  --suites suites/azure-diagnostics-v1/*.json \
  --max-requests-per-model 550 --max-total-requests 1650 \
  --workers 3 --retries 3 --key-from-azure-cli
```

The command verifies deployment identities before inference and compares the
control-plane snapshots afterward. The optional key flag reads the account key
in memory through Azure CLI. Without it, set the key environment variable.
Use up to four model workers; each model starts at most one request every two
seconds. The request limits include failed attempts, and each response requests
at most 600 output tokens by default. These are request limits, not currency caps.
Only connection failures, HTTP 429, and HTTP 5xx are eligible for the explicitly
configured retries. Interrupted runs require `--resume`, which also authorizes
retrying uncertain attempts within the remaining request budget.

Outputs include private response journals, deployment snapshots, validated
per-model bundles, a combined bundle, and `report.json`. The report exercises the
SDK's reader and comparison functions. Raw journals and account configuration
stay under ignored `runs/` and `out/`. Public manifests withhold the account
endpoint and retain the model, deployment version, region, source hashes, token
counts, and per-probe observations.

Audit a completed campaign before staging it:

```bash
python pipelines/analyze_azure_campaign.py \
  --bundle runs/azure-campaign/bundle --journals runs/azure-campaign \
  --suites suites/azure-diagnostics-v1/*.json \
  --output out/azure-audit.json
```

The audit checks journal and response hashes, exact probe coverage, suite
revisions, scores, and intervals. It reports strict-format failures and a
separate post-hoc diagnostic for responses wrapped in a single Markdown fence.
The latter does not change the published scores. Attempt timings include client
pacing; they are not server-latency measurements.

## Provider filters are separate evidence

Azure Prompt Shields can block even benign instruction-boundary probes before a
model responds. Several Azure backends encode these blocks differently. The
adapter recognizes explicit content-filter responses, records the blocked case,
and excludes it from the model score. It does not turn other HTTP errors into
refusals or passing tests.

A suite needs at least two unblocked responses to produce a score. Fully filtered
suites remain unmeasured, with counts retained in the manifest. Scores are
conditional on the unblocked cases; confidence intervals do not correct for this
selection bias. Comparisons with different scored cohorts are rejected by the
SDK. This measures the observable Azure endpoint, including its filters, and
cannot establish the underlying model's unfiltered safety.

Harmful-capability uplift and weight-level interpretability are not measured by
these suites. The synthetic variants are correlated, and the TruthfulQA
adaptation is not the official MC1/MC2 metric. Review the suite limitations before
publishing or comparing results.
Separate [scoped evidence pipelines](scoped-evidence.md) evaluate a WMDP-Cyber
knowledge proxy and local GPT-2 activation interventions. Those reports do not
fill missing scores in this campaign's cards.

Deployment snapshots compare model identity/version, upgrade policy, and content
filter policy before and after a run. They do not attest weights or freeze
operational SKU capacity. Record any capacity changes separately; changing
model/filter settings invalidates resumption and publication.

## GPU workers

For self-hosting, check subscription-specific SKU restrictions and both regional
and GPU-family vCPU quota before attempting allocation. A price listing does not
prove capacity. Keep the inference listener on loopback behind an SSH tunnel,
pin model and container revisions, and record GPU/driver/CUDA configuration.
Use a dedicated temporary worker and remove only task-owned resources after
copying the evidence. Existing deployments and unrelated VMs should not be
modified by a campaign.
