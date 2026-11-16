"""Scoped capability and causal evidence, without converting it to safety grades."""

import hashlib
import json
from pathlib import Path
import tempfile

from .validation import ArtifactError, read_artifact, validate_artifact


class EvidenceIndex:
    def __init__(self, source: str | Path, *, allow_samples: bool = False):
        self.source = Path(source)
        index = read_artifact(self.source / "evidence-index.json", "evidence-index")
        self.reports = []
        for entry in index["reports"]:
            path = self.source / "reports" / f'{entry["report_id"]}.json'
            report = read_artifact(path, "evidence-report")
            if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
                raise ArtifactError("Evidence report digest mismatch.")
            if (report["report_id"], report["dimension"], report["model"]["id"]) != (
                    entry["report_id"], entry["dimension"], entry["model_id"]):
                raise ArtifactError("Evidence index and report identities differ.")
            if report["sample"] and not allow_samples:
                raise ArtifactError("Sample evidence requires allow_samples=True.")
            self.reports.append(report)

    def get(self, report_id: str) -> dict:
        for report in self.reports:
            if report["report_id"] == report_id:
                return report
        raise KeyError(report_id)


def stage_evidence(reports: list[dict], destination: str | Path, *, allow_samples: bool = False) -> Path:
    """Validate all reports before exposing a new immutable evidence bundle."""
    destination = Path(destination)
    if destination.exists():
        raise ArtifactError("Evidence destination already exists.")
    entries, serialized = [], {}
    for report in reports:
        validate_artifact("evidence-report", report)
        if report["sample"] and not allow_samples:
            raise ArtifactError("Cannot publish sample evidence without explicit opt-in.")
        content = (json.dumps(report, indent=2, allow_nan=False) + "\n").encode()
        serialized[report["report_id"]] = content
        entries.append({"report_id": report["report_id"], "dimension": report["dimension"],
                        "model_id": report["model"]["id"], "sha256": hashlib.sha256(content).hexdigest()})
    index = {"schema_version": "1.0", "reports": sorted(entries, key=lambda x: x["report_id"])}
    validate_artifact("evidence-index", index)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".evidence-", dir=destination.parent) as temp:
        bundle = Path(temp) / "bundle"
        (bundle / "reports").mkdir(parents=True)
        for report_id, content in serialized.items():
            (bundle / "reports" / f"{report_id}.json").write_bytes(content)
        (bundle / "evidence-index.json").write_text(json.dumps(index, indent=2) + "\n")
        EvidenceIndex(bundle, allow_samples=allow_samples)
        bundle.rename(destination)
    return destination
