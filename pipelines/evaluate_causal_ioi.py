"""Run an explicit, controlled residual-state intervention on pinned GPT-2 weights."""

import argparse
from datetime import datetime, timezone
import gc
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform

from osmsi import stage_evidence


def file_hash(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024*1024), b""):
            h.update(block)
    return h.hexdigest()


def interval(values, seed=41):
    import numpy as np
    values = np.asarray(values, dtype=np.float64)
    mean = float(values.mean())
    rng = np.random.default_rng(seed)
    means = values[rng.integers(0, len(values), size=(2000, len(values)))].mean(axis=1)
    return {"low": min(mean, float(np.quantile(means, .025))),
            "high": max(mean, float(np.quantile(means, .975))), "level": .95,
            "method": "Seeded paired prompt bootstrap, 2000 resamples; templates/names are correlated"}


def metric(name, label, values, unit="logit difference", direction="higher_more_recovery"):
    import numpy as np
    return {"id": name, "label": label, "value": float(np.mean(values)),
            "unit": unit, "direction": direction, "n": len(values), "interval": interval(values)}


def batch_inputs(tokenizer, records, device):
    import torch
    clean = tokenizer([r["clean"] for r in records], padding=True, return_tensors="pt")
    corrupt = tokenizer([r["corrupt"] for r in records], padding=True, return_tensors="pt")
    if clean["input_ids"].shape != corrupt["input_ids"].shape:
        raise ValueError("Clean/corrupt token lengths differ.")
    positions = []
    io_ids, subject_ids = [], []
    for i, row in enumerate(records):
        changed = (clean["input_ids"][i] != corrupt["input_ids"][i]).nonzero().flatten()
        if len(changed) != 1:
            raise ValueError("Each intervention must change exactly one subject token.")
        positions.append(int(changed[0]))
        for name, target in ((row["io"], io_ids), (row["subject"], subject_ids)):
            ids = tokenizer.encode(" " + name, add_special_tokens=False)
            if len(ids) != 1:
                raise ValueError("Candidate names must be single tokens.")
            target.append(ids[0])
    clean, corrupt = clean.to(device), corrupt.to(device)
    return (clean, corrupt, torch.tensor(positions, device=device),
            clean["attention_mask"].sum(dim=1)-1,
            torch.tensor(io_ids, device=device), torch.tensor(subject_ids, device=device))


def forward(model, inputs, positions, final, io_ids, subject_ids, *, cache=False, patch=None):
    import torch
    handles, stored = [], {}
    arange = torch.arange(len(positions), device=positions.device)
    def hidden(output):
        return output[0] if isinstance(output, tuple) else output
    if cache:
        for layer, block in enumerate(model.transformer.h):
            def capture(module, args, output, layer=layer):
                value = hidden(output)
                stored[layer] = {
                    "subject": value[arange, positions].detach().clone(),
                    "final": value[arange, final].detach().clone(),
                    "prefix": value[:, 0].detach().clone(),
                }
            handles.append(block.register_forward_hook(capture))
    if patch is not None:
        layer, location, donor = patch
        def replace(module, args, output):
            value = hidden(output).clone()
            value[arange, location] = donor
            return (value,) + output[1:] if isinstance(output, tuple) else value
        handles.append(model.transformer.h[layer].register_forward_hook(replace))
    try:
        with torch.inference_mode():
            logits = model(**inputs, use_cache=False).logits
            gap = logits[arange, final, io_ids] - logits[arange, final, subject_ids]
            return gap.detach().cpu().tolist(), stored
    finally:
        for handle in handles:
            handle.remove()


def run_model(config, document, output, device, batch_size):
    import numpy as np
    import torch
    from transformers import AutoConfig, AutoTokenizer, GPT2LMHeadModel
    if output.exists():
        raise ValueError("Model output exists; retain evidence and choose a new run directory.")
    output.mkdir(parents=True)
    torch.manual_seed(41)
    tokenizer = AutoTokenizer.from_pretrained(config["path"], local_files_only=True)
    tokenizer.pad_token = tokenizer.eos_token
    model = GPT2LMHeadModel.from_pretrained(config["path"], local_files_only=True,
                                          use_safetensors=True, attn_implementation="eager")
    model.eval().to(device)
    layers = len(model.transformer.h)
    discovery = [r for r in document["cases"] if r["split"] == "discovery"]
    evaluation = [r for r in document["cases"] if r["split"] == "evaluation"]
    if len(discovery) != 64 or len(evaluation) != 128:
        raise ValueError("Use the frozen 64/128 split.")
    discovery_names = {r[k] for r in discovery for k in ("io", "subject")}
    evaluation_names = {r[k] for r in evaluation for k in ("io", "subject")}
    if discovery_names & evaluation_names:
        raise ValueError("Discovery and evaluation name pools must be disjoint.")
    discovery_rows = []
    for offset in range(0, len(discovery), batch_size):
        records = discovery[offset:offset+batch_size]
        clean, corrupt, pos, final, io, subject = batch_inputs(tokenizer, records, device)
        clean_gap, clean_cache = forward(model, clean, pos, final, io, subject, cache=True)
        corrupt_gap, _ = forward(model, corrupt, pos, final, io, subject)
        patch_gaps = {}
        for layer in range(layers):
            patch_gaps[layer], _ = forward(model, corrupt, pos, final, io, subject,
                                           patch=(layer, pos, clean_cache[layer]["subject"]))
        for i, record in enumerate(records):
            discovery_rows.append({"id": record["id"], "clean_gap": clean_gap[i], "corrupt_gap": corrupt_gap[i],
                                   "patched_gaps": [patch_gaps[layer][i] for layer in range(layers)]})
    effects = [float(np.mean([r["patched_gaps"][layer]-r["corrupt_gap"] for r in discovery_rows]))
               for layer in range(layers)]
    selected = max(range(layers), key=lambda layer: (effects[layer], -layer))
    print(json.dumps({"model": config["model"], "discovery_complete": 64,
                      "selected_block": selected, "mean_patch_effect": effects[selected]}), flush=True)
    heldout = []
    for offset in range(0, len(evaluation), batch_size):
        records = evaluation[offset:offset+batch_size]
        clean, corrupt, pos, final, io, subject = batch_inputs(tokenizer, records, device)
        clean_gap, clean_cache = forward(model, clean, pos, final, io, subject, cache=True)
        corrupt_gap, corrupt_cache = forward(model, corrupt, pos, final, io, subject, cache=True)
        donors = []
        for i, row in enumerate(records):
            candidates = [j for j, other in enumerate(records)
                          if {row["io"], row["subject"]}.isdisjoint({other["io"], other["subject"]})]
            if not candidates:
                raise ValueError("No disjoint-name control donor in the predeclared batch.")
            donors.append(candidates[0])
        patches = {
            "matched": (selected, pos, clean_cache[selected]["subject"]),
            "mismatched": (selected, pos, clean_cache[selected]["subject"][donors]),
            "unchanged_prefix": (selected, torch.zeros_like(pos), clean_cache[selected]["prefix"]),
            "self_patch": (selected, pos, corrupt_cache[selected]["subject"]),
            "positive_final": (layers-1, final, clean_cache[layers-1]["final"]),
        }
        measured = {name: forward(model, corrupt, pos, final, io, subject, patch=patch)[0]
                    for name, patch in patches.items()}
        for i, record in enumerate(records):
            heldout.append({"id": record["id"], "clean_gap": clean_gap[i], "corrupt_gap": corrupt_gap[i],
                            "mismatched_donor": records[donors[i]]["id"],
                            **{name: values[i] for name, values in measured.items()}})
    controls = {
        "unchanged_prefix_max_error": max(abs(r["unchanged_prefix"]-r["corrupt_gap"]) for r in heldout),
        "self_patch_max_error": max(abs(r["self_patch"]-r["corrupt_gap"]) for r in heldout),
        "positive_final_max_error": max(abs(r["positive_final"]-r["clean_gap"]) for r in heldout),
    }
    if any(value > 1e-4 for value in controls.values()):
        (output / "failed-controls.json").write_text(json.dumps(controls, indent=2))
        raise ValueError("Intervention numerical controls failed; no evidence report emitted.")
    model_config = AutoConfig.from_pretrained(config["path"], local_files_only=True)
    model_config._attn_implementation = "eager"
    del model, clean_cache, corrupt_cache, patches
    gc.collect()
    if device == "mps":
        torch.mps.empty_cache()
    torch.manual_seed(1729)
    untrained = GPT2LMHeadModel(model_config).eval().to(device)
    random_gaps = []
    for offset in range(0, len(evaluation), batch_size):
        records = evaluation[offset:offset+batch_size]
        clean, _, pos, final, io, subject = batch_inputs(tokenizer, records, device)
        gap, _ = forward(untrained, clean, pos, final, io, subject)
        random_gaps.extend(gap)
    del untrained
    gc.collect()
    if device == "mps":
        torch.mps.empty_cache()
    raw = {"discovery": discovery_rows, "evaluation": heldout, "random_weight_clean_gaps": random_gaps}
    raw_path = output / "measurements.json"
    raw_path.write_text(json.dumps(raw, indent=2, allow_nan=False) + "\n")
    metric_rows = [
        metric("clean_preference_accuracy", "Clean IO-over-subject preference", [100*float(r["clean_gap"] > 0) for r in heldout], "percent", "descriptive"),
        metric("corruption_effect", "Clean minus corrupted answer preference", [r["clean_gap"]-r["corrupt_gap"] for r in heldout]),
        metric("heldout_patch_effect", "Matched subject-state patch effect", [r["matched"]-r["corrupt_gap"] for r in heldout]),
        metric("mismatched_patch_effect", "Mismatched-donor patch effect", [r["mismatched"]-r["corrupt_gap"] for r in heldout]),
        metric("matched_minus_mismatched", "Matched minus mismatched-donor effect", [r["matched"]-r["mismatched"] for r in heldout]),
        metric("random_weight_preference", "Untrained matching architecture: clean preference", [100*float(gap > 0) for gap in random_gaps], "percent", "descriptive"),
    ]
    denom = metric_rows[1]["value"]
    metric_rows.append({"id": "recovery_fraction", "label": "Aggregate recovery / clean-corrupt gap",
                        "value": metric_rows[2]["value"]/denom if denom > 0.1 else None,
                        "unit": "ratio (unclipped)", "direction": "descriptive",
                        "note": "Undefined if mean corruption effect is at most 0.1 logit; not a safety grade."})
    metric_rows += [{"id": key, "label": key.replace("_", " "), "value": value,
                    "unit": "absolute logit difference", "direction": "descriptive"} for key, value in controls.items()]
    report = {
        "schema_version": "1.0", "report_id": config["model"].split("/")[-1] + "-causal-ioi-20261116",
        "dimension": "in", "sample": False,
        "model": {"id": config["model"], "revision": config["revision"]},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "methodology": {
            "id": "causal-ioi-residual-patching-v1", "version": "1.0.0",
            "description": "Residual-state patching for indirect-object identification: block selection on 64 discovery prompts, effects and controls on 128 held-out prompts with disjoint names.",
            "references": ["https://arxiv.org/abs/2211.00593", "https://github.com/huggingface/transformers"],
        },
        "metrics": metric_rows,
        "provenance": {
            "model_weights_sha256": file_hash(Path(config["path"]) / "model.safetensors"),
            "source_sha256": file_hash(__file__), "measurements_sha256": file_hash(raw_path),
            "cases_sha256": hashlib.sha256(json.dumps(document, sort_keys=True).encode()).hexdigest(),
            "selected_block_zero_based": selected, "selection": "Maximum mean matched-patch logit effect on discovery only; lower block wins ties.",
            "discovery_cases": 64, "evaluation_cases": 128, "discovery_effect_by_block": effects,
            "patch_site": "Block output residual state at the single changed subject token",
            "control_donor_rule": "First case in each fixed batch with both names disjoint from the target case",
            "batch_size": batch_size, "precision": "float32", "device": device,
            "runtime": {name: importlib.metadata.version(name) for name in ("torch", "transformers", "numpy", "safetensors")},
            "python": platform.python_version(), "machine": platform.machine(),
            "model_eval_mode": True, "trained_seed": 41, "random_weight_seed": 1729, "bootstrap_seed": 41,
            "controls": controls, "observations": raw,
        },
        "findings": [
            f"Discovery selected block {selected} (zero-based); the held-out matched patch changed the answer logit gap by {metric_rows[2]['value']:.4f}.",
            "Numerical positive, unchanged-prefix, and self-patch controls all passed at absolute tolerance 0.0001.",
            ("Matched donors outperform the mismatched-donor control on the held-out prompts."
             if metric_rows[4]["interval"]["low"] > 0 else
             "The held-out matched-minus-mismatched interval does not establish positive donor specificity."),
        ],
        "limitations": [
            "This is a narrow causal intervention study, not a model-wide interpretability or safety grade.",
            "It does not reproduce the complete published IOI circuit and does not measure deception.",
            "Two prompt templates and reused names induce correlation; bootstrap intervals do not establish population generalization.",
            "Early residual-state replacement can restore token identity without isolating a semantic feature or minimal circuit.",
            "The final-state positive control verifies intervention plumbing; it is not a scientific discovery.",
            "Results apply only to these exact locally loaded GPT-2 weights, not the Azure-hosted models.",
            "Held-out block effects and the mismatched-donor control must be read together; recovery alone is insufficient evidence of a specific mechanism.",
        ],
    }
    (output / "report.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--models", type=Path, required=True)
    p.add_argument("--cases", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--device", choices=["cpu", "mps"], default="mps")
    p.add_argument("--batch-size", type=int, choices=[8, 16, 32], default=16)
    args = p.parse_args()
    models, document = json.loads(args.models.read_text()), json.loads(args.cases.read_text())
    reports = []
    for config in models:
        report = run_model(config, document, args.output / config["model"].split("/")[-1], args.device, args.batch_size)
        reports.append(report)
        print(json.dumps({"model": config["model"], "completed": True, "report_id": report["report_id"]}), flush=True)
    result = stage_evidence(reports, args.output / "bundle")
    print(f"Validated {len(reports)} causal evidence reports: {result}", flush=True)


if __name__ == "__main__":
    main()
