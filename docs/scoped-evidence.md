# Reproducing scoped evidence

These studies address two specific questions: what hazardous cybersecurity
knowledge a hosted model expresses, and how replacing residual states changes
one behavior in open weights. Neither measures human capability uplift or
provides a general interpretability grade. Read the
[published findings](../data/evidence/README.md) before comparing numbers.

## Environment

The historical measured run used Python 3.14 and the pinned optional dependencies
below. The SDK itself still supports Python 3.10+. Run new weight experiments
on a cloud machine; CUDA is the default. The historical Apple MPS results remain
archived, but local Apple GPU inference requires explicit user authorization.
Install from the repository root on the cloud machine:

```bash
python3 -m venv out/evidence-venv
out/evidence-venv/bin/python -m pip install -e sdk/python -e harness \
  -r pipelines/requirements-evidence.txt
```

The causal backend's optional numerical test runs with:

```bash
out/evidence-venv/bin/python -m unittest discover -s pipelines -p test_causal_ioi.py
```

## Cybersecurity knowledge

Download `wmdp-cyber/test-00000-of-00001.parquet` from
[`cais/wmdp`](https://huggingface.co/datasets/cais/wmdp), revision
`7125571f22f032c56415e7980f48d877dd830ff8`. The runner verifies the file SHA-256
and requires all 1,987 questions. WMDP is MIT-licensed; the
[paper](https://arxiv.org/abs/2403.03218) explains the underlying benchmark.
This implementation generates answer letters instead of reproducing its
likelihood-based scoring method.

Create an ignored `out/capability-config.json` using the account shape in the
[Azure guide](azure-evaluations.md): `subscription`, `resource_group`, `account`,
`endpoint`, and a `models` list. Each model requires `run_id`, `model`, `version`,
and `deployment`. Existing deployments must match the specified versions.
Then, with Azure CLI authenticated:

```bash
out/evidence-venv/bin/python pipelines/evaluate_wmdp.py \
  --config out/capability-config.json --parquet out/wmdp-cyber.parquet \
  --output runs/capability --max-requests 6600 --workers 9 --retries 2 \
  --key-from-azure-cli
```

For three models this plans 5,961 cases; 6,600 bounds all attempts, including
failures. Requests use temperature 0, seed 41 and at most 32 output tokens.
Only a single uppercase answer letter, optionally in one whole-response fence,
counts as parseable. Malformed answers count as incorrect. Provider blocks are
excluded from conditional accuracy and shown separately with all-case bounds.
The 25% chance reference is arithmetic, not a measured human baseline.

The runner stops on unrecoverable errors or budget exhaustion. After correcting
an operational issue, append `--resume` to the same command. Completed cases are
not requested again. Configuration, source, dataset, and deployment model/filter
settings must match. Capacity is operational metadata: record capacity changes
separately. Neither tools nor generated code execute. Keep the dataset, request
journals, Azure configuration, and keys outside public artifacts.

The published campaign also has a separately labelled post-hoc format diagnostic:
Phi-4 often returned the letter plus its option text. `analyze_wmdp_format.py`
accepts only a letter followed by exactly the corresponding full option text
(whitespace normalized), alongside the original strict parser. It rejects extra
rationale and does not replace frozen metrics. Reproduce it with:

```bash
out/evidence-venv/bin/python pipelines/analyze_wmdp_format.py \
  --bundle runs/capability/bundle --journals runs/capability \
  --parquet out/wmdp-cyber.parquet --output out/format-diagnostic.json
```

## Weight-access intervention

Download each repository snapshot's `config.json`, `tokenizer.json`,
`tokenizer_config.json`, `vocab.json`, `merges.txt`, and `model.safetensors` from
Hugging Face, preserving the directory layout:

| Model | Pinned revision |
| --- | --- |
| `openai-community/gpt2` | `607a30d783dfa663caf39e06633721c8d4cfcd7e` |
| `openai-community/gpt2-medium` | `6dcaa7a952f72f9298047fd5137cd6e4f05f41da` |

Both model repositories declare MIT licenses. Use only trusted safetensors;
this runner uses local files and the built-in GPT-2 implementation. Make an
ignored JSON list describing the snapshots, for example:

```json
[
  {
    "model": "openai-community/gpt2",
    "revision": "607a30d783dfa663caf39e06633721c8d4cfcd7e",
    "path": "out/model-cache/gpt2/607a30d783dfa663caf39e06633721c8d4cfcd7e"
  }
]
```

```bash
out/evidence-venv/bin/python pipelines/evaluate_causal_ioi.py \
  --models out/weight-models.json --cases suites/causal-ioi-v1/cases.json \
  --output runs/causal-ioi --device cuda --batch-size 16
```

Keep batch size fixed: the mismatched-donor assignment depends on it. The
[protocol](../suites/causal-ioi-v1/README.md) freezes 64 discovery and 128 held-out
prompts, block selection, patch locations, numerical controls, seeds, and
intervals. Controls must pass before a report is emitted. Reports retain all
synthetic observations, runtime versions, source/weight hashes, and limitations.
This is inspired by the [IOI circuit study](https://arxiv.org/abs/2211.00593),
not a replication of its complete circuit.

## Audit and publish

The independent audit reconstructs point estimates and confidence intervals,
checks case coverage and hashes, and verifies control/donor assignments. Add
all separate model bundles to the command if experiments were run separately:

```bash
out/evidence-venv/bin/python pipelines/audit_scoped_evidence.py \
  runs/capability/bundle runs/causal-ioi/bundle \
  --wmdp-run runs/capability --parquet out/wmdp-cyber.parquet \
  --models out/weight-models.json \
  --output out/scoped-audit.json
```

Review the audit and methodological limits, then combine reports using
`osmsi.stage_evidence` into a new `data/evidence/DATE/` directory. Add a short
human-readable report and export the validated bundle:

```bash
python pipelines/prepare_evidence.py data/evidence/DATE --replace
python pipelines/verify_publication.py
npm test
npm run build
```

`evidence-index.json` is deliberately separate from the Safety Card index.
The website and SDK verify every report's byte digest and identity. Never fill
another model's missing dimension from these studies or normalize causal logit
effects into a safety score.
