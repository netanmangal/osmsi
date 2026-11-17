"""Copy a stopped journal into a new, explicitly versioned harness analysis."""

import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import shutil
import tempfile

from osmsi import ArtifactError
from osmsi_harness.runner import harness_revision


def reanalyze_run(source, destination, *, run_id, expected_harness, reason):
    source, destination = Path(source), Path(destination)
    if destination.exists():
        raise ArtifactError("Reanalysis destination already exists.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,127}", run_id) or not reason.strip():
        raise ArtifactError("A valid new run ID and a reanalysis reason are required.")
    raw_state = (source / "run-state.json").read_bytes()
    state = json.loads(raw_state)
    identity = state["configuration"]
    fingerprint = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    if fingerprint != state["fingerprint"] or identity["harness_revision"] != expected_harness:
        raise ArtifactError("Source fingerprint or expected harness revision differs.")
    raw_journal = (source / "journal.jsonl").read_bytes()
    events = [json.loads(line) for line in raw_journal.decode().splitlines()]
    keys = {f'{suite["id"]}/{probe}' for suite in identity["suites"] for probe in suite["probe_ids"]}
    if any(event.get("key") not in keys for event in events):
        raise ArtifactError("Source journal contains an unexpected probe.")
    latest = {event["key"]: event for event in events}
    provenance = {
        "source_run_id": state["run_id"],
        "source_harness_revision": expected_harness,
        "source_state_sha256": hashlib.sha256(raw_state).hexdigest(),
        "source_journal_sha256": hashlib.sha256(raw_journal).hexdigest(),
        "retained_completed_cases": sum(event["type"] == "complete" for event in latest.values()),
        "prior_attempts": sum(event["type"] == "start" for event in events),
        "reason": reason,
        "migration_source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }
    revised = deepcopy(state)
    revised["run_id"] = run_id
    revised["configuration"]["harness_revision"] = harness_revision()
    revised["configuration"]["provider_metadata"]["journal_reanalysis"] = provenance
    revised["fingerprint"] = hashlib.sha256(
        json.dumps(revised["configuration"], sort_keys=True).encode()).hexdigest()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".osmsi-reanalysis-", dir=destination.parent) as temp:
        staged = Path(temp) / "run"
        staged.mkdir()
        (staged / "run-state.json").write_text(json.dumps(revised, indent=2) + "\n")
        (staged / "journal.jsonl").write_bytes(raw_journal)
        (staged / "reanalysis.json").write_text(json.dumps(provenance, indent=2) + "\n")
        staged.rename(destination)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--expected-harness", required=True)
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()
    print(reanalyze_run(args.source, args.destination, run_id=args.run_id,
                        expected_harness=args.expected_harness, reason=args.reason))


if __name__ == "__main__":
    main()
