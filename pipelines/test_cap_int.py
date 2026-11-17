import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from osmsi import ArtifactError, Index
from osmsi_harness.providers import Completion
from osmsi_harness.suites import load_suite
from build_cap_int_suites import rationale_probes
from evaluate_supplement import initialize
from resume_cloud_parallel import resume_parallel
from analyze_azure_campaign import analyze

ROOT = Path(__file__).resolve().parents[1]


class SupplementTests(unittest.TestCase):
    def test_frozen_rationale_suite_is_balanced_and_reproducible(self):
        suite = load_suite(str(ROOT / "suites/cap-int-v1/int.json"))
        self.assertEqual(suite.probes, rationale_probes())
        self.assertEqual(len(suite.probes), 64)
        self.assertEqual(len({p["id"] for p in suite.probes}), 64)
        self.assertEqual({k: sum(p["expected"] == k for p in suite.probes) for k in "ABCD"},
                         dict.fromkeys("ABCD", 16))

    def test_initialized_run_is_scored_and_independently_audited(self):
        suite = load_suite("policy-boundaries")
        answers = {json.dumps(p["messages"]): p["expected"] for p in suite.probes}

        class MockCloud:
            sample = False
            model = "test-cloud-model"
            revision = "test-revision"
            base_url = "https://example.invalid"
            metadata = {"supplement_for_run_id": "original"}

            def complete(self, messages, **kwargs):
                return Completion(content=answers[json.dumps(messages)], revision=self.revision)

        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "test-run"
            provider = MockCloud()
            initialize(provider, [suite], output, "test-run", 2048)
            with patch("resume_cloud_parallel.time.sleep"):
                bundle = resume_parallel(provider, [suite], output, max_requests=100)
            run = Index(bundle).get("test-run")
            self.assertEqual(run.card.scores[0].value, 100)
            analyze(bundle, Path(temp), [suite])
            self.assertEqual(run.manifest.parameters["requests_attempted"], len(suite.probes))

    def test_changed_revision_cannot_start_requests(self):
        suite = load_suite("policy-boundaries")
        class MockCloud:
            sample = False
            model = "test-cloud-model"
            revision = "original-revision"
            base_url = "https://example.invalid"
            metadata = {}
            def complete(self, *args, **kwargs):
                raise AssertionError("Must not call changed provider")
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "run"
            provider = MockCloud()
            initialize(provider, [suite], output, "test-run", 2048)
            provider.revision = "changed"
            with self.assertRaisesRegex(ArtifactError, "Protocol changed"):
                resume_parallel(provider, [suite], output, max_requests=100)


if __name__ == "__main__":
    unittest.main()
