"""Run explicitly linked cloud supplements with bounded concurrent requests.

Private config: accounts (Azure connection metadata), models (provider, model,
revision or version/deployment/account, base_run_id), and base_bundle. Keys stay
in environment variables. This runner never changes deployments or calls local models.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import re
import time

from osmsi import ArtifactError, Index
from osmsi_harness.providers import AzureProvider, ChatProvider, ProviderError
from osmsi_harness.runner import harness_revision, now
from osmsi_harness.suites import load_suite
from evaluate_cloud import azure_json
from resume_cloud_parallel import resume_parallel
from prepare_web import prepare_web
from analyze_azure_campaign import analyze


def initialize(provider, suites, output, run_id, max_tokens):
    if provider.sample or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,127}", run_id):
        raise ValueError("A real provider and valid run ID are required.")
    identity = {
        "model": provider.model, "sample": False, "configured_revision": provider.revision,
        "provider_origin": provider.base_url, "provider_metadata": provider.metadata,
        "harness_revision": harness_revision(), "seed": 41, "max_tokens": max_tokens,
        "suites": [{"id": suite.id, "revision": suite.revision,
                    "probe_ids": [p["id"] for p in suite.probes]} for suite in suites],
    }
    output.mkdir(parents=True, exist_ok=False)
    (output / "run-state.json").write_text(json.dumps({
        "run_id": run_id, "started_at": now(), "configuration": identity,
        "fingerprint": hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest(),
    }, indent=2) + "\n")
    (output / "journal.jsonl").write_text("")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--suites", nargs="+", required=True)
    parser.add_argument("--max-requests-per-model", type=int, default=224)
    parser.add_argument("--max-total-requests", type=int, default=6272)
    parser.add_argument("--max-tokens", type=int, default=2048)
    parser.add_argument("--model-workers", type=int, default=12)
    parser.add_argument("--request-workers", type=int, default=4)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    config = json.loads(args.config.read_text())
    suites = [load_suite(s) for s in args.suites]
    if (not 1 <= args.model_workers <= 28 or not 1 <= args.request_workers <= 8
            or not 0 <= args.retries <= 5 or not 16 <= args.max_tokens <= 8192):
        raise ValueError("Invalid concurrency, retry count, or output budget.")
    if (sum(len(s.probes) for s in suites) > args.max_requests_per_model
            or len(config["models"]) * args.max_requests_per_model > args.max_total_requests
            or len({s.document["dimension"] for s in suites}) != len(suites)):
        raise ValueError("Invalid suite selection or insufficient request budget.")
    if len({m["run_id"] for m in config["models"]}) != len(config["models"]):
        raise ValueError("Duplicate run IDs.")
    if args.output.exists() and not args.resume:
        raise ValueError("Output exists; resume explicitly.")
    args.output.mkdir(parents=True, exist_ok=True)
    base = Index(config["base_bundle"])
    accounts = {a["account"]: a for a in config["accounts"]}
    for number, account in enumerate(accounts.values()):
        key_env = f"OSMSI_SUPPLEMENT_KEY_{number}"
        keys = azure_json(["cognitiveservices", "account", "keys", "list",
            "--subscription", account["subscription"], "-g", account["resource_group"],
            "-n", account["account"]])
        os.environ[key_env] = keys["key1"]
        account["key_env"] = key_env
        del keys

    def snapshot():
        result = {}
        for name, account in accounts.items():
            ds = azure_json(["cognitiveservices", "account", "deployment", "list",
                "--subscription", account["subscription"], "-g", account["resource_group"], "-n", name])
            selected = {m["deployment"] for m in config["models"] if m.get("account") == name}
            result[name] = {d["name"]: {k: d["properties"].get(k) for k in
                ("model", "versionUpgradeOption", "raiPolicyName", "provisioningState")}
                for d in ds if d["name"] in selected}
            if result[name].keys() != selected:
                raise ValueError("Requested deployments are missing.")
        return result

    before = snapshot()
    path = args.output / "deployment-before.json"
    if path.exists() and json.loads(path.read_text()) != before:
        raise ValueError("Deployment settings changed since the initial campaign.")
    path.write_text(json.dumps(before, indent=2) + "\n")
    pairs = []
    for model in config["models"]:
        original = base.get(model["base_run_id"])
        if model["provider"] == "azure":
            account = accounts[model["account"]]
            deployment = before[model["account"]][model["deployment"]]
            if (deployment["model"]["name"] != model["model"]
                    or deployment["model"]["version"] != model["version"]
                    or deployment["provisioningState"] != "Succeeded"):
                raise ValueError("Deployed model/version differs from the plan.")
            provider = AzureProvider(model["model"], endpoint=account["endpoint"],
                deployment=model["deployment"], model_version=model["version"],
                key_env=account["key_env"], timeout=300)
            provider.metadata.update({
                "region": account["region"], "rai_policy": deployment["raiPolicyName"],
                "deployment_configuration_sha256": hashlib.sha256(
                    json.dumps(deployment, sort_keys=True).encode()).hexdigest()})
        elif model["provider"] == "superlinked":
            provider = ChatProvider(model["model"], revision=model["revision"], timeout=300)
            provider.metadata = {"backend": "superlinked-chat",
                "revision_kind": "Provider response header; not independently verified weights"}
        else:
            raise ValueError("Only Azure and Superlinked are supported.")
        if original.card.model.id != provider.model or original.card.model.revision != provider.revision:
            raise ValueError("Supplement model/revision does not match its original run.")
        provider.metadata.update({
            "supplement_for_run_id": original.card.run_id,
            "supplement_base_manifest_sha256": hashlib.sha256(
                (Path(config["base_bundle"]) / "manifests" / f"{original.card.run_id}.json").read_bytes()).hexdigest(),
            "campaign_source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "scope": "CAP knowledge accuracy; INT behavioral rationale-check proxy, not model internals",
            "minimum_start_interval_seconds": 2, "request_workers": args.request_workers})
        pairs.append((model, provider))

    def work(pair):
        model, provider = pair
        output = args.output / model["run_id"]
        if not output.exists():
            initialize(provider, suites, output, model["run_id"], args.max_tokens)
        else:
            recorded = json.loads((output / "run-state.json").read_text())["configuration"]
            if recorded["max_tokens"] != args.max_tokens or recorded["provider_metadata"] != provider.metadata:
                raise ValueError("Resume parameters changed.")
        for attempt in range(args.retries + 1):
            try:
                bundle = output / "bundle"
                if not bundle.exists():
                    bundle = resume_parallel(provider, suites, output,
                        max_requests=args.max_requests_per_model, workers=args.request_workers)
                report = analyze(bundle, args.output, suites)
                (output / "audit.json").write_text(json.dumps(report, indent=2) + "\n")
                run = Index(bundle).get(model["run_id"])
                return {"run_id": model["run_id"], "status": "complete",
                    "scores": {s.dimension: s.value for s in run.card.scores},
                    "attempts": run.manifest.parameters["requests_attempted"],
                    "blocked": run.manifest.parameters["provider_blocked_requests"]}
            except ProviderError as error:
                print(json.dumps({"run_id": model["run_id"], "attempt": attempt+1,
                    "error": str(error)}), flush=True)
                if attempt == args.retries or "revision" in str(error).lower():
                    return {"run_id": model["run_id"], "status": "failed", "error": str(error)}
                time.sleep(10)
        raise AssertionError("Unreachable")

    results = []
    with ThreadPoolExecutor(max_workers=args.model_workers) as pool:
        for future in as_completed([pool.submit(work, pair) for pair in pairs]):
            result = future.result()
            results.append(result)
            print(json.dumps(result), flush=True)
            (args.output / "progress.json").write_text(json.dumps(results, indent=2) + "\n")
    after = snapshot()
    (args.output / "deployment-after.json").write_text(json.dumps(after, indent=2) + "\n")
    if before != after:
        raise ValueError("Deployment settings changed; do not publish.")
    if any(r["status"] != "complete" for r in results):
        raise ValueError("Campaign incomplete; journals retained.")
    prepare_web([args.output / m["run_id"] / "bundle" for m in config["models"]], args.output / "bundle")
    print(f"Completed and independently audited {len(results)} cloud supplements.", flush=True)


if __name__ == "__main__":
    main()
