import json
from pathlib import Path
import tempfile
import unittest

from osmsi import ArtifactError, Index
from prepare_web import prepare_web

FIXTURE = Path(__file__).resolve().parents[1] / "sdk/python/tests/fixtures/sample-run"


class WebExportTests(unittest.TestCase):
    def test_export_is_readable_by_sdk_and_requires_sample_opt_in(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "results"
            with self.assertRaises(ArtifactError):
                prepare_web([FIXTURE], output)
            prepare_web([FIXTURE], output, allow_samples=True)
            self.assertEqual(len(Index(output, allow_samples=True).runs), 1)

    def test_invalid_replacement_preserves_existing_results(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "results"
            prepare_web([FIXTURE], output, allow_samples=True)
            before = (output / "index.json").read_bytes()
            with self.assertRaises(ArtifactError):
                prepare_web([Path(temp) / "absent"], output, allow_samples=True, replace=True)
            self.assertEqual((output / "index.json").read_bytes(), before)

    def test_replacement_requires_explicit_flag_and_managed_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "results"
            prepare_web([FIXTURE], output, allow_samples=True)
            with self.assertRaises(ArtifactError):
                prepare_web([FIXTURE], output, allow_samples=True)
            (output / "keep.txt").write_text("user file")
            with self.assertRaisesRegex(ArtifactError, "unrelated"):
                prepare_web([FIXTURE], output, allow_samples=True, replace=True)
            self.assertEqual((output / "keep.txt").read_text(), "user file")

    def test_duplicate_ids_cannot_overwrite_another_run(self):
        with tempfile.TemporaryDirectory() as temp, self.assertRaisesRegex(ArtifactError, "Duplicate"):
            prepare_web([FIXTURE, FIXTURE], Path(temp) / "results", allow_samples=True)
