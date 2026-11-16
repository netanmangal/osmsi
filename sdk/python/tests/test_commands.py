import contextlib
from dataclasses import replace
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from osmsi import ArtifactError, Index, compare_runs, fetch_index
from osmsi.cli import main

FIXTURE = Path(__file__).parent / "fixtures/sample-run"


class CommandTests(unittest.TestCase):
    def test_validate_and_show(self):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(main(["validate", str(FIXTURE), "--allow-samples"]), 0)
        self.assertEqual(json.loads(output.getvalue()), {"valid": True, "runs": 1})
        with contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(main(["show", str(FIXTURE), "--run-id", "sample-a-001", "--allow-samples"]), 0)
        self.assertEqual(json.loads(output.getvalue())["card"]["model"]["id"], "specimen-a")

    def test_default_validation_rejects_fixture(self):
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(main(["validate", str(FIXTURE)]), 1)

    def test_compare_requires_compatible_provenance(self):
        first = Index(FIXTURE, allow_samples=True).runs[0]
        second = replace(first, card=replace(first.card, scores=(
            replace(first.card.scores[0], value=77),)))
        self.assertEqual(compare_runs(first, second)[0]["delta"], 2)
        changed = replace(second, manifest=replace(second.manifest,
            harness=replace(second.manifest.harness, revision="changed")))
        result = compare_runs(first, changed)[0]
        self.assertFalse(result["comparable"])
        self.assertIsNone(result["delta"])

    def test_compare_missing_dimension_is_not_zero(self):
        first = Index(FIXTURE, allow_samples=True).runs[0]
        second = replace(first, card=replace(first.card, scores=()))
        result = compare_runs(first, second)[0]
        self.assertIsNone(result["right"])
        self.assertIsNone(result["delta"])

    def test_equal_filter_counts_do_not_make_different_cohorts_comparable(self):
        first = Index(FIXTURE, allow_samples=True).runs[0]
        suite_id = first.manifest.suites[0].id
        def with_observations(run, scored):
            parameters = dict(run.manifest.parameters)
            parameters["observations"] = [
                {"suite_id": suite_id, "probe_id": probe, "score": 1 if probe == scored else None,
                 "provider_blocked": probe != scored} for probe in ("one", "two")]
            return replace(run, manifest=replace(run.manifest, parameters=parameters))
        result = compare_runs(with_observations(first, "one"), with_observations(first, "two"))[0]
        self.assertFalse(result["comparable"])
        self.assertIsNone(result["delta"])


class DownloadTests(unittest.TestCase):
    def test_download_validates_complete_bundle(self):
        documents = [
            (FIXTURE / "index.json").read_bytes(),
            (FIXTURE / "cards/sample-a-001.json").read_bytes(),
            (FIXTURE / "manifests/sample-a-001.json").read_bytes(),
        ]
        with tempfile.TemporaryDirectory() as temp, patch("osmsi.remote.build_opener") as opener:
            opener.return_value.open.side_effect = [io.BytesIO(document) for document in documents]
            index = fetch_index("https://example.com/results", Path(temp) / "bundle", allow_samples=True)
            self.assertEqual(index.runs[0].card.model.id, "specimen-a")
            self.assertEqual(opener.return_value.open.call_count, 3)

    def test_remote_samples_fail_before_downloading_cards(self):
        with tempfile.TemporaryDirectory() as temp, patch("osmsi.remote.build_opener") as opener:
            opener.return_value.open.return_value = io.BytesIO((FIXTURE / "index.json").read_bytes())
            with self.assertRaisesRegex(ArtifactError, "samples"):
                fetch_index("https://example.com/results", Path(temp) / "bundle")
            self.assertEqual(opener.return_value.open.call_count, 1)
            self.assertFalse((Path(temp) / "bundle").exists())

    def test_mismatched_remote_card_leaves_no_output(self):
        card = json.loads((FIXTURE / "cards/sample-a-001.json").read_text())
        card["model"]["revision"] = "tampered"
        with tempfile.TemporaryDirectory() as temp, patch("osmsi.remote.build_opener") as opener:
            opener.return_value.open.side_effect = [
                io.BytesIO((FIXTURE / "index.json").read_bytes()),
                io.BytesIO(json.dumps(card).encode()),
                io.BytesIO((FIXTURE / "manifests/sample-a-001.json").read_bytes()),
            ]
            with self.assertRaises(ArtifactError):
                fetch_index("https://example.com/results", Path(temp) / "bundle", allow_samples=True)
            self.assertFalse((Path(temp) / "bundle").exists())
