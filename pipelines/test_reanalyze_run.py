import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from osmsi import ArtifactError, Index
from osmsi_harness.providers import demo_provider
from osmsi_harness.runner import evaluate, harness_revision
from osmsi_harness.suites import load_suite
from reanalyze_run import reanalyze_run
from analyze_azure_campaign import analyze


class ReanalysisTests(unittest.TestCase):
    def test_reanalysis_preserves_evidence_and_scores_without_new_calls(self):
        suites = [load_suite("policy-boundaries")]
        with tempfile.TemporaryDirectory() as temp:
            source, destination = Path(temp) / "source", Path(temp) / "reanalyzed"
            provider = demo_provider(suites)
            provider.metadata = {}
            original = evaluate(provider, suites, source, run_id="original")
            before = {p.name: p.read_bytes() for p in source.iterdir() if p.is_file()}
            reanalyze_run(source, destination, run_id="reanalyzed",
                          expected_harness=harness_revision(), reason="Explicit test reanalysis.")
            revised = json.loads((destination / "run-state.json").read_text())
            provider.metadata = revised["configuration"]["provider_metadata"]
            with patch.object(provider, "complete") as complete:
                bundle = evaluate(provider, suites, destination, run_id="reanalyzed", resume=True)
                complete.assert_not_called()
            self.assertEqual(Index(original, allow_samples=True).runs[0].card.scores,
                             Index(bundle, allow_samples=True).runs[0].card.scores)
            self.assertEqual(before, {p.name: p.read_bytes() for p in source.iterdir() if p.is_file()})
            self.assertEqual((source / "journal.jsonl").read_bytes(), (destination / "journal.jsonl").read_bytes())
            with patch("analyze_azure_campaign.Index", side_effect=lambda p: Index(p, allow_samples=True)):
                self.assertEqual(analyze(bundle, destination.parent, suites)["total_cases"],
                                 sum(len(s.probes) for s in suites))
                manifest_path = bundle / "manifests/reanalyzed.json"
                manifest = json.loads(manifest_path.read_text())
                manifest["parameters"]["provider_metadata"]["journal_reanalysis"]["source_journal_sha256"] = "0" * 64
                manifest_path.write_text(json.dumps(manifest))
                with self.assertRaisesRegex(ArtifactError, "journal prefix"):
                    analyze(bundle, destination.parent, suites)
            with self.assertRaisesRegex(ArtifactError, "already exists"):
                reanalyze_run(source, destination, run_id="other",
                              expected_harness=harness_revision(), reason="No overwrite.")

    def test_unexpected_source_revision_is_rejected(self):
        suites = [load_suite("policy-boundaries")]
        with tempfile.TemporaryDirectory() as temp:
            source, destination = Path(temp) / "source", Path(temp) / "reanalysis"
            provider = demo_provider(suites)
            provider.metadata = {}
            evaluate(provider, suites, source)
            with self.assertRaisesRegex(ArtifactError, "expected harness"):
                reanalyze_run(source, destination, run_id="reanalyzed",
                              expected_harness="sha256:unexpected", reason="Test")
            self.assertFalse(destination.exists())
