import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from osmsi import ArtifactError, Index


class SupplementTests(unittest.TestCase):
    def test_links_require_original_manifest_bytes_and_matching_model(self):
        fixture = Path(__file__).parent / "fixtures/sample-run"
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "bundle"
            shutil.copytree(fixture, root)
            original_id = json.loads((root / "index.json").read_text())["entries"][0]["run_id"]
            card = json.loads((root / "cards" / f"{original_id}.json").read_text())
            source = root / "manifests" / f"{original_id}.json"
            manifest = json.loads(source.read_text())
            card["run_id"] = manifest["run_id"] = "supplement-test"
            manifest["parameters"]["provider_metadata"] = {
                "supplement_for_run_id": original_id,
                "supplement_base_manifest_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            }
            (root / "cards/supplement-test.json").write_text(json.dumps(card))
            destination = root / "manifests/supplement-test.json"
            destination.write_text(json.dumps(manifest))
            index = json.loads((root / "index.json").read_text())
            index["entries"].append({"run_id": "supplement-test", "model_id": card["model"]["id"], "sample": True})
            (root / "index.json").write_text(json.dumps(index))
            self.assertEqual(len(Index(root, allow_samples=True).supplements(original_id)), 1)
            source.write_text(source.read_text() + "\n")
            with self.assertRaisesRegex(ArtifactError, "digest"):
                Index(root, allow_samples=True).supplements(original_id)
            manifest["parameters"]["provider_metadata"]["supplement_base_manifest_sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
            manifest["model"]["revision"] = card["model"]["revision"] = "changed"
            destination.write_text(json.dumps(manifest))
            (root / "cards/supplement-test.json").write_text(json.dumps(card))
            with self.assertRaisesRegex(ArtifactError, "identity"):
                Index(root, allow_samples=True).supplements(original_id)
