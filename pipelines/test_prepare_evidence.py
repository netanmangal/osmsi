from pathlib import Path
import tempfile
import unittest

from osmsi import ArtifactError, EvidenceIndex, stage_evidence
from prepare_evidence import prepare_evidence


def report(name):
    return {
        "schema_version": "1.0", "report_id": name, "dimension": "in", "sample": False,
        "model": {"id": "fixture", "revision": "fixture"}, "created_at": "2026-11-16T00:00:00Z",
        "methodology": {"id": "fixture", "version": "1", "description": "Test only.",
                        "references": ["https://example.com/method"]},
        "metrics": [{"id": "effect", "label": "Effect", "value": -2, "unit": "logits", "direction": "descriptive"}],
        "provenance": {}, "findings": [], "limitations": ["Test fixture."],
    }


class EvidencePublicationTests(unittest.TestCase):
    def test_duplicate_or_unrelated_files_leave_published_evidence_intact(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = stage_evidence([report("one")], root / "source")
            dest = prepare_evidence([source], root / "published")
            original = (dest / "evidence-index.json").read_bytes()
            with self.assertRaises(ArtifactError):
                prepare_evidence([source, source], dest, replace=True)
            self.assertEqual((dest / "evidence-index.json").read_bytes(), original)
            (dest / "keep.txt").write_text("unrelated")
            with self.assertRaises(ArtifactError):
                prepare_evidence([source], dest, replace=True)
            self.assertTrue((dest / "keep.txt").exists())
            (dest / "keep.txt").unlink()
            other = stage_evidence([report("two")], root / "other")
            prepare_evidence([source, other], dest, replace=True)
            self.assertEqual(len(EvidenceIndex(dest).reports), 2)
