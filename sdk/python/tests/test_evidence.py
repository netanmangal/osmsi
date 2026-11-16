import json
from pathlib import Path
import tempfile
import unittest

from osmsi import ArtifactError, EvidenceIndex, stage_evidence, validate_artifact


def report():
    return {
        "schema_version": "1.0", "report_id": "sample-evidence", "dimension": "in", "sample": True,
        "model": {"id": "test-model", "revision": "synthetic"},
        "created_at": "2026-11-16T00:00:00Z",
        "methodology": {"id": "test", "version": "1", "description": "Fixture only.",
                        "references": ["https://example.com/method"]},
        "metrics": [{"id": "recovery", "label": "Causal recovery", "value": -0.2,
                     "unit": "logit difference", "direction": "higher_more_recovery"}],
        "provenance": {}, "findings": [], "limitations": ["Synthetic fixture."],
    }


class EvidenceTests(unittest.TestCase):
    def test_raw_metrics_keep_their_units_and_sign(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "bundle"
            stage_evidence([report()], path, allow_samples=True)
            index = EvidenceIndex(path, allow_samples=True)
            self.assertEqual(index.get("sample-evidence")["metrics"][0]["value"], -0.2)
            with self.assertRaises(ArtifactError):
                EvidenceIndex(path)

    def test_digest_and_duplicate_identity_validation(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "bundle"
            stage_evidence([report()], path, allow_samples=True)
            artifact = path / "reports/sample-evidence.json"
            changed = json.loads(artifact.read_text())
            changed["metrics"][0]["value"] = 0.7
            artifact.write_text(json.dumps(changed))
            with self.assertRaisesRegex(ArtifactError, "digest"):
                EvidenceIndex(path, allow_samples=True)
            with self.assertRaisesRegex(ArtifactError, "Duplicate"):
                stage_evidence([report(), report()], Path(temp) / "duplicates", allow_samples=True)
            self.assertFalse((Path(temp) / "duplicates").exists())

    def test_evidence_is_not_an_aggregate_safety_grade(self):
        document = report()
        document["safety_score"] = 100
        with self.assertRaises(ArtifactError):
            validate_artifact("evidence-report", document)
        del document["safety_score"]
        document["metrics"][0]["value"] = float("nan")
        with self.assertRaises(ArtifactError):
            validate_artifact("evidence-report", document)
