import contextlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from osmsi import ArtifactError, Index
from stage_results import main, stage_results

FIXTURE = Path(__file__).resolve().parents[1] / "sdk/python/tests/fixtures/sample-run"


class StageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.output = self.root / "output"
        shutil.copytree(FIXTURE, self.source)

    def test_stages_only_validated_artifacts(self):
        (self.source / ".env").write_text("PRIVATE=do-not-copy")
        (self.source / "response.json").write_text("private response")
        stage_results(self.source, self.output, allow_samples=True)
        run = Index(self.output, allow_samples=True).get("sample-a-001")
        self.assertTrue(run.card.sample)
        self.assertEqual(sorted(path.name for path in self.output.iterdir()),
                         ["cards", "index.json", "manifests"])

    def test_rejects_samples_by_default_without_output(self):
        with self.assertRaisesRegex(ArtifactError, "Sample run rejected"):
            stage_results(self.source, self.output)
        self.assertFalse(self.output.exists())

    def test_late_invalid_run_leaves_no_partial_bundle(self):
        for folder in ["cards", "manifests"]:
            doc = json.loads((self.source / folder / "sample-a-001.json").read_text())
            doc["run_id"] = "sample-z-002"
            if folder == "cards":
                doc["scores"][0]["value"] = 500
            (self.source / folder / "sample-z-002.json").write_text(json.dumps(doc))
        with self.assertRaises(ArtifactError):
            stage_results(self.source, self.output, allow_samples=True)
        self.assertFalse(self.output.exists())
        self.assertFalse(list(self.root.glob(".osmsi-stage-*")))

    def test_requires_matching_cards_and_manifests(self):
        (self.source / "manifests/sample-a-001.json").unlink()
        with self.assertRaisesRegex(ArtifactError, "card and manifest"):
            stage_results(self.source, self.output, allow_samples=True)

    def test_never_overwrites_existing_bundle(self):
        self.output.mkdir()
        marker = self.output / "keep.txt"
        marker.write_text("keep")
        with self.assertRaisesRegex(ArtifactError, "already exists"):
            stage_results(self.source, self.output, allow_samples=True)
        self.assertEqual(marker.read_text(), "keep")

    def test_cli_returns_failure_for_invalid_source(self):
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main([str(self.root / "missing"),
                                   "--destination", str(self.output)]), 1)

    def test_rebuilds_index_deterministically(self):
        (self.source / "index.json").write_text("stale source index is not used")
        stage_results(self.source, self.output, allow_samples=True)
        second = self.root / "second"
        stage_results(self.source, second, allow_samples=True)
        for path in self.output.rglob("*.json"):
            self.assertEqual(path.read_bytes(), (second / path.relative_to(self.output)).read_bytes())
