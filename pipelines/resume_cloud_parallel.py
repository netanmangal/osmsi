"""Resume a stopped cloud run with bounded concurrency and the original protocol.

The original run state is required. Never run this alongside another writer.
Scheduling provenance is stored separately; the harness replays the complete
journal to validate and score it without making further inference requests.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
import hashlib
import json
import os
from pathlib import Path
import threading
import time

from osmsi import ArtifactError
from osmsi_harness.providers import AzureProvider, ChatProvider, ProviderError
from osmsi_harness.runner import _append, evaluate, harness_revision, now
from osmsi_harness.suites import load_suite


def resume_parallel(provider, suites, output, *, max_requests, workers=4, interval=2):
    output = Path(output)
    state = json.loads((output / "run-state.json").read_text())
    identity = state["configuration"]
    expected = {
        "model": provider.model, "sample": provider.sample,
        "configured_revision": provider.revision,
        "provider_origin": provider.base_url,
        "provider_metadata": provider.metadata,
        "harness_revision": harness_revision(), "seed": identity["seed"],
        "max_tokens": identity["max_tokens"],
        "suites": [{"id": suite.id, "revision": suite.revision,
                    "probe_ids": [probe["id"] for probe in suite.probes]} for suite in suites],
    }
    digest = hashlib.sha256(json.dumps(expected, sort_keys=True).encode()).hexdigest()
    if expected != identity or digest != state["fingerprint"]:
        raise ArtifactError("Protocol changed; no requests were made.")
    if not 1 <= workers <= 8 or interval < 2:
        raise ValueError("Use 1–8 workers and at least two seconds between starts.")
    if (output / "bundle").exists():
        raise ArtifactError("This run is already complete.")
    journal = output / "journal.jsonl"
    events = [json.loads(line) for line in journal.read_text().splitlines()]
    latest = {event["key"]: event for event in events}
    attempted = sum(event["type"] == "start" for event in events)
    pending = [(f'{suite.id}/{probe["id"]}', probe) for suite in suites for probe in suite.probes
               if latest.get(f'{suite.id}/{probe["id"]}', {}).get("type") != "complete"]
    if attempted + len(pending) > max_requests:
        raise ArtifactError("Remaining budget cannot finish this run.")
    receipt = {"started_at": now(), "executor_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               "journal_before_sha256": hashlib.sha256(journal.read_bytes()).hexdigest(),
               "workers": workers, "minimum_start_interval_seconds": interval,
               "max_requests_including_previous_attempts": max_requests,
               "pending_cases": len(pending), "previous_attempts": attempted}
    receipt_path = output / f'parallel-resume-{time.time_ns()}.json'
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    lock, stopped = threading.Lock(), threading.Event()
    next_start = 0.0
    errors = []

    def request(item):
        nonlocal attempted, next_start
        key, probe = item
        # A failed/uncertain earlier attempt is retried only by this explicit
        # resume invocation. This executor itself performs no hidden retries.
        with lock:
            if stopped.is_set():
                return
            delay = next_start - time.monotonic()
            if delay > 0:
                time.sleep(delay)
            if attempted >= max_requests:
                stopped.set()
                errors.append("Request budget exhausted.")
                return
            attempted += 1
            attempt = attempted
            next_start = time.monotonic() + interval
            _append(journal, {"type": "start", "key": key, "attempt": attempt, "at": now()})
        started = time.monotonic()
        try:
            completion = provider.complete(probe["messages"], seed=identity["seed"],
                                           max_tokens=identity["max_tokens"])
            event = {"type": "complete", "key": key, "attempt": attempt, "at": now(),
                     "latency_seconds": round(time.monotonic() - started, 6),
                     "completion": asdict(completion)}
        except ProviderError as error:
            event = {"type": "error", "key": key, "attempt": attempt, "at": now(),
                     "error": str(error), "credits": error.credits}
            stopped.set()
        with lock:
            _append(journal, event)
            if event["type"] == "error":
                errors.append(event["error"])

    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(request, pending))
    receipt.update({"finished_at": now(), "requests_attempted": attempted, "errors": errors,
                    "journal_after_sha256": hashlib.sha256(journal.read_bytes()).hexdigest()})
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    if errors:
        raise ProviderError("; ".join(errors))
    return evaluate(provider, suites, output, run_id=state["run_id"], seed=identity["seed"],
                    max_tokens=identity["max_tokens"], max_requests=max_requests,
                    resume=True, retry_failed=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--suites", nargs="+", required=True)
    parser.add_argument("--max-requests", type=int, required=True)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--azure-endpoint", help="Required for Azure; account origin is private.")
    args = parser.parse_args()
    state = json.loads((args.run / "run-state.json").read_text())
    identity = state["configuration"]
    metadata = identity["provider_metadata"]
    if metadata.get("backend") == "azure-ai-v1":
        provider = AzureProvider(identity["model"], endpoint=args.azure_endpoint,
                                 deployment=metadata["deployment"], model_version=metadata["model_version"],
                                 timeout=300)
    elif metadata.get("backend") == "superlinked-chat":
        provider = ChatProvider(identity["model"], revision=identity["configured_revision"], timeout=300)
    else:
        raise ValueError("Only recorded Azure and Superlinked runs are supported.")
    provider.metadata = metadata
    print(resume_parallel(provider, [load_suite(p) for p in args.suites], args.run,
                          max_requests=args.max_requests, workers=args.workers), flush=True)


if __name__ == "__main__":
    main()
