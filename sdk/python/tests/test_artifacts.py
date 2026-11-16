import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from osmsi import ArtifactError, Index, load_run, read_artifact, validate_artifact

FIXTURE = Path(__file__).parent / "fixtures" / "sample-run"
RUN_ID = "sample-a-001"


class ArtifactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "bundle"
        shutil.copytree(FIXTURE, self.root)

    def change(self, folder, transform):
        path = self.root / folder / f"{RUN_ID}.json"
        document = json.loads(path.read_text())
        transform(document)
        path.write_text(json.dumps(document))

    def test_loads_typed_card_with_full_provenance(self):
        run = Index(self.root, allow_samples=True).get(RUN_ID)
        self.assertEqual(run.card.model.id, "specimen-a")
        self.assertEqual(run.manifest.model, run.card.model)
        self.assertEqual(run.manifest.seed, 42)
        self.assertEqual(run.manifest.suites[0].dataset_revision, "synthetic-fixture-v1")
        self.assertEqual(run.card.scores[0].confidence_interval.level, 0.95)

    def test_samples_require_explicit_opt_in(self):
        with self.assertRaisesRegex(ArtifactError, "Sample run rejected"):
            Index(self.root)

    def test_unknown_index_run_raises_key_error(self):
        with self.assertRaises(KeyError):
            Index(self.root, allow_samples=True).get("absent")

    def test_rejects_wrong_model_revision(self):
        self.change("cards", lambda doc: doc["model"].update(revision="different-revision"))
        with self.assertRaisesRegex(ArtifactError, "disagree on model"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_mismatched_sample_flags(self):
        self.change("cards", lambda doc: doc.update(sample=False))
        with self.assertRaises(ArtifactError):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_score_for_a_different_suite(self):
        self.change("cards", lambda doc: doc["scores"][0].update(suite_id="unrecorded-suite"))
        with self.assertRaisesRegex(ArtifactError, "do not match"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_duplicate_dimensions(self):
        self.change("cards", lambda doc: doc["scores"].append(copy.deepcopy(doc["scores"][0])))
        with self.assertRaisesRegex(ArtifactError, "Duplicate score dimensions"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_invalid_intervals(self):
        for low, high in [(80, 70), (76, 80), (70, 74)]:
            with self.subTest(low=low, high=high):
                self.change("cards", lambda doc: doc["scores"][0]["confidence_interval"].update(
                    low=low, high=high))
                with self.assertRaisesRegex(ArtifactError, "must contain"):
                    load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_unknown_fields_and_aggregate_scores(self):
        self.change("cards", lambda doc: doc.update(aggregate_score=99))
        with self.assertRaisesRegex(ArtifactError, "additionalProperties"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_non_finite_scores(self):
        for value in [float("nan"), float("inf"), float("-inf")]:
            with self.subTest(value=value):
                self.change("cards", lambda doc: doc["scores"][0].update(value=value))
                with self.assertRaisesRegex(ArtifactError, "finite numbers"):
                    load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_unversioned_or_future_artifacts(self):
        self.change("cards", lambda doc: doc.update(schema_version="2.0"))
        with self.assertRaisesRegex(ArtifactError, "schema_version"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_sample_attached_to_real_model_name(self):
        self.change("cards", lambda doc: doc["model"].update(id="real-model-name"))
        with self.assertRaises(ArtifactError):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_invalid_and_reversed_timestamps(self):
        for timestamp in ["yesterday", "2026-01-01T00:00:00", "2025-12-31T23:59:59Z"]:
            with self.subTest(timestamp=timestamp):
                self.change("manifests", lambda doc: doc.update(completed_at=timestamp))
                with self.assertRaises(ArtifactError):
                    load_run(self.root, RUN_ID, allow_samples=True)

    def test_requires_seed(self):
        self.change("manifests", lambda doc: doc.pop("seed"))
        with self.assertRaises(ArtifactError):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_requires_suite_dataset_revision(self):
        self.change("manifests", lambda doc: doc["suites"][0].pop("dataset_revision"))
        with self.assertRaises(ArtifactError):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_cannot_remove_sample_label_from_specimen(self):
        for folder in ["cards", "manifests"]:
            self.change(folder, lambda doc: doc.update(sample=False))
        with self.assertRaises(ArtifactError):
            load_run(self.root, RUN_ID)

    def test_rejects_duplicate_json_members(self):
        path = self.root / "index.json"
        path.write_text('{"schema_version":"1.0","entries":[],"entries":[]}')
        with self.assertRaisesRegex(ArtifactError, "Cannot read"):
            Index(self.root)

    def test_rejects_index_metadata_mismatch(self):
        path = self.root / "index.json"
        doc = json.loads(path.read_text())
        doc["entries"][0]["model_id"] = "different-model"
        path.write_text(json.dumps(doc))
        with self.assertRaisesRegex(ArtifactError, "Index entry"):
            Index(self.root, allow_samples=True)

    def test_rejects_duplicate_index_entries(self):
        doc = json.loads((self.root / "index.json").read_text())
        doc["entries"].append(copy.deepcopy(doc["entries"][0]))
        with self.assertRaisesRegex(ArtifactError, "Duplicate index run IDs"):
            validate_artifact("index", doc)

    def test_rejects_path_traversal(self):
        for run_id in ["../outside", "/tmp/card", "a/b", ".."]:
            with self.subTest(run_id=run_id), self.assertRaisesRegex(ArtifactError, "Invalid run ID"):
                load_run(self.root, run_id, allow_samples=True)

    def test_rejects_symlinks_outside_bundle(self):
        card = self.root / "cards" / f"{RUN_ID}.json"
        outside = Path(self.temp.name) / "outside.json"
        card.rename(outside)
        card.symlink_to(outside)
        with self.assertRaisesRegex(ArtifactError, "escapes"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_missing_or_malformed_json(self):
        path = self.root / "cards" / f"{RUN_ID}.json"
        path.write_text("{")
        with self.assertRaisesRegex(ArtifactError, "Cannot read"):
            read_artifact(path, "safety-card")
        path.unlink()
        with self.assertRaisesRegex(ArtifactError, "Cannot read"):
            load_run(self.root, RUN_ID, allow_samples=True)

    def test_rejects_filename_run_id_mismatch(self):
        self.change("cards", lambda doc: doc.update(run_id="another-run"))
        with self.assertRaisesRegex(ArtifactError, "filename"):
            load_run(self.root, RUN_ID, allow_samples=True)
