"""Sequential, journaled evaluations with explicit budgets and safe resumption."""

from dataclasses import asdict
from datetime import datetime, timezone
import hashlib
from importlib.resources import files
import json
import math
import os
from pathlib import Path
import re
import tempfile
import time
from typing import Any
import uuid

from osmsi import ArtifactError, Index, validate_artifact

from . import __version__
from .providers import Completion, ProviderError
from .suites import Suite, probe_score, summarize


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def harness_revision() -> str:
    root = files("osmsi_harness")
    sources = [path for path in root.iterdir() if path.name.endswith(".py")]
    sources += list(root.joinpath("builtin").iterdir())
    digest = hashlib.sha256()
    for path in sorted(sources, key=lambda path: path.name):
        if path.is_file():
            digest.update(path.name.encode())
            digest.update(path.read_bytes())
    return "sha256:" + digest.hexdigest()


def _write(path: Path, document: Any) -> None:
    path.write_text(json.dumps(document, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def _append(path: Path, event: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(event, allow_nan=False) + "\n")
        stream.flush()
        os.fsync(stream.fileno())


def evaluate(provider, suites: list[Suite], output: str | Path, *,
             run_id: str | None = None, seed: int = 41, max_requests: int = 64,
             max_tokens: int = 600, limit: int | None = None,
             max_credits: float | None = None, resume: bool = False,
             retry_failed: bool = False) -> Path:
    """Run every selected probe or emit no card. Raw completions stay in the journal."""
    if (isinstance(seed, bool) or not isinstance(seed, int) or seed < 0
            or not isinstance(max_requests, int) or max_requests < 1
            or not isinstance(max_tokens, int) or not 16 <= max_tokens <= 8192
            or (limit is not None and (not isinstance(limit, int) or limit < 2))):
        raise ArtifactError("Use a nonnegative seed, positive request budget, 16–8192 tokens, and limit >= 2.")
    if max_credits is not None and (not math.isfinite(max_credits) or max_credits <= 0):
        raise ArtifactError("Credit budget must be finite and positive.")
    if not suites or len({suite.document["dimension"] for suite in suites}) != len(suites):
        raise ArtifactError("Select exactly one suite per measured dimension.")
    if provider.sample and not re.fullmatch(r"specimen-[a-z0-9-]+", provider.model):
        raise ArtifactError("Demo providers require a specimen-* model ID.")
    if not provider.sample and provider.model.startswith("specimen-"):
        raise ArtifactError("The specimen-* namespace is reserved for demo providers.")

    selected = [(suite, probe) for suite in suites for probe in suite.probes[:limit]]
    identity = {
        "model": provider.model, "sample": provider.sample,
        "configured_revision": provider.revision,
        "provider_origin": getattr(provider, "base_url", "demo"),
        "provider_metadata": getattr(provider, "metadata", {}),
        "harness_revision": harness_revision(), "seed": seed, "max_tokens": max_tokens,
        "suites": [{"id": suite.id, "revision": suite.revision,
                    "probe_ids": [probe["id"] for probe in suite.probes[:limit]]} for suite in suites],
    }
    fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    output = Path(output)
    state_path, journal_path = output / "run-state.json", output / "journal.jsonl"
    events = []
    if output.exists():
        if not resume:
            raise ArtifactError("Output exists. Use --resume with the same configuration or a new directory.")
        try:
            state = json.loads(state_path.read_text())
            events = [json.loads(line) for line in journal_path.read_text().splitlines()] if journal_path.exists() else []
        except (OSError, ValueError):
            raise ArtifactError("Run state or journal is unreadable; preserve it and start a new run.") from None
        if state.get("fingerprint") != fingerprint:
            raise ArtifactError("Resume configuration or harness code differs from the recorded run.")
        if run_id is not None and run_id != state["run_id"]:
            raise ArtifactError("Resume run ID differs from the recorded run.")
        if (output / "bundle").exists():
            Index(output / "bundle", allow_samples=provider.sample)
            return output / "bundle"
    else:
        if resume:
            raise ArtifactError("Cannot resume a directory that does not exist.")
        if len(selected) > max_requests:
            raise ArtifactError("Request budget is smaller than the selected probe count; no calls were made.")
        chosen_id = run_id or ("run-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:8])
        if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,127}", chosen_id):
            raise ArtifactError("Invalid run ID.")
        state = {"run_id": chosen_id, "started_at": now(), "fingerprint": fingerprint,
                 "configuration": identity}
        output.mkdir(parents=True)
        _write(state_path, state)

    latest: dict[str, dict] = {}
    attempts = 0
    credits = 0.0
    unpriced = 0
    for event in events:
        key = event.get("key")
        if key:
            latest[key] = event
        if event.get("type") == "start":
            attempts += 1
        elif event.get("type") in ("complete", "error"):
            amount = event.get("completion", {}).get("credits") if event["type"] == "complete" else event.get("credits")
            if amount is None:
                unpriced += 1
            else:
                credits += amount
    pending = sum(event.get("type") == "start" for event in latest.values())
    unpriced += pending
    incomplete = [event for event in latest.values() if event.get("type") != "complete"]
    if incomplete and not retry_failed:
        raise ArtifactError("A previous attempt failed or has unknown status. Use --retry-failed to authorize another billable attempt.")
    if max_credits is not None and unpriced:
        raise ArtifactError("Cannot enforce a credit budget while previous attempts have unknown charges.")
    needed = sum(latest.get(f"{suite.id}/{probe['id']}", {}).get("type") != "complete"
                 for suite, probe in selected)
    if attempts + needed > max_requests:
        raise ArtifactError("Remaining request budget cannot finish the run; increase --max-requests explicitly.")
    if max_credits is not None and (credits > max_credits or (needed and credits >= max_credits)):
        raise ArtifactError("Recorded charges exhaust the credit budget; increase it explicitly to continue.")

    outcomes: dict[str, list[float]] = {suite.id: [] for suite in suites}
    completions = []
    observations = []
    pinned_revision = None
    for suite, probe in selected:
        key = f"{suite.id}/{probe['id']}"
        previous = latest.get(key)
        if previous and previous.get("type") == "complete":
            completion = Completion(**previous["completion"])
            latency = previous["latency_seconds"]
        else:
            if attempts >= max_requests or (max_credits is not None and credits >= max_credits):
                raise ArtifactError("Run budget exhausted. Progress is retained; no card was emitted.")
            attempts += 1
            _append(journal_path, {"type": "start", "key": key, "attempt": attempts, "at": now()})
            started = time.monotonic()
            try:
                completion = provider.complete(probe["messages"], seed=seed, max_tokens=max_tokens)
            except ProviderError as error:
                _append(journal_path, {"type": "error", "key": key, "attempt": attempts,
                                      "at": now(), "error": str(error), "credits": error.credits})
                raise
            latency = round(time.monotonic() - started, 6)
            _append(journal_path, {"type": "complete", "key": key, "attempt": attempts, "at": now(),
                                  "latency_seconds": latency, "completion": asdict(completion)})
            if completion.credits is None:
                unpriced += 1
            else:
                credits += completion.credits
            if max_credits is not None and (completion.credits is None or credits > max_credits):
                raise ArtifactError("Credit limit reached or billing unavailable. No further calls or card were produced.")
        if pinned_revision is not None and completion.revision != pinned_revision:
            raise ArtifactError("Model revision changed within the run; no card was emitted.")
        pinned_revision = completion.revision
        # A resumed provider must also stay on the revision used by cached completions.
        provider.revision = pinned_revision
        value = None if completion.provider_blocked else probe_score(
            suite.document["scorer"], completion.content, probe["expected"])
        if value is not None:
            outcomes[suite.id].append(value)
        completions.append(completion)
        observations.append({
            "suite_id": suite.id, "probe_id": probe["id"], "score": value,
            "response_sha256": hashlib.sha256(completion.content.encode()).hexdigest(),
            "latency_seconds": latency, "finish_reason": completion.finish_reason,
            "provider_blocked": completion.provider_blocked,
        })

    base = {"schema_version": "1.0", "run_id": state["run_id"], "sample": provider.sample,
            "model": {"id": provider.model, "revision": pinned_revision}}
    manifest = {
        **base, "harness": {"version": __version__, "revision": identity["harness_revision"]},
        "started_at": state["started_at"], "completed_at": now(), "seed": seed,
        "parameters": {
            "temperature": 0, "max_tokens": max_tokens, "request_budget": max_requests,
            "requests_attempted": attempts, "credit_budget": max_credits,
            "credits_observed": credits, "attempts_with_unknown_charges": unpriced,
            "provider_origin": getattr(provider, "public_origin", identity["provider_origin"]),
            "provider_metadata": identity["provider_metadata"],
            "input_tokens_observed": sum(item.input_tokens or 0 for item in completions),
            "output_tokens_observed": sum(item.output_tokens or 0 for item in completions),
            "provider_blocked_requests": sum(item.provider_blocked for item in completions),
            "execution_identities": sorted({item.execution_identity for item in completions if item.execution_identity}),
            "observations": observations,
            "journal_sha256": hashlib.sha256(journal_path.read_bytes()).hexdigest(),
        },
        "suites": [{
            "id": suite.id, "dimension": suite.document["dimension"],
            "version": suite.document["version"], "dataset_revision": suite.revision,
            "scoring_method": "100 * mean(1 - Brier loss)" if suite.document["scorer"] == "calibration" else "100 * exact-policy-pass proportion",
            "interval_method": "seeded percentile bootstrap, 2000 resamples" if suite.document["scorer"] == "calibration" else "Wilson binomial interval",
            "parameters": {"maturity": suite.document["maturity"], "description": suite.document["description"],
                           "limitations": suite.document["limitations"], "license": suite.document["license"],
                           "probe_ids": [probe["id"] for probe in suite.probes[:limit]],
                           "n_probes": len(suite.probes[:limit]),
                           "n_scored": len(outcomes[suite.id]),
                           "provider_blocked": len(suite.probes[:limit]) - len(outcomes[suite.id]),
                           "scorer": suite.document["scorer"]},
        } for suite in suites],
    }
    card = {
        **base,
        "scores": [{"dimension": suite.document["dimension"], "suite_id": suite.id,
                    **summarize(outcomes[suite.id], suite.document["scorer"], seed)} for suite in suites],
        "concerns": [suite.document["limitations"] for suite in suites] + [
            "Intervals describe this probe set under sampling assumptions, not deployment safety.",
            "Hosted providers may not honor seeds or guarantee identical outputs.",
            "Provider-filtered responses are counted separately and excluded from model scores; scores are conditional on unblocked requests.",
        ],
        "strengths": [],
    }
    validate_artifact("run-manifest", manifest)
    validate_artifact("safety-card", card)
    with tempfile.TemporaryDirectory(prefix=".bundle-", dir=output) as scratch:
        staged = Path(scratch) / "bundle"
        (staged / "cards").mkdir(parents=True)
        (staged / "manifests").mkdir()
        _write(staged / "cards" / f"{state['run_id']}.json", card)
        _write(staged / "manifests" / f"{state['run_id']}.json", manifest)
        _write(staged / "index.json", {"schema_version": "1.0", "entries": [
            {"run_id": state["run_id"], "model_id": provider.model, "sample": provider.sample}]})
        Index(staged, allow_samples=provider.sample)
        staged.rename(output / "bundle")
    return output / "bundle"
