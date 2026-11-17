import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from osmsi import ArtifactError, Index
from osmsi_harness.providers import demo_provider, ProviderError
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite
from resume_cloud_parallel import resume_parallel


class ParallelResumeTests(unittest.TestCase):
    def stopped_run(self, path):
        suites = [load_suite("policy-boundaries")]
        provider = demo_provider(suites)
        provider.base_url = "demo"
        provider.metadata = {}
        complete = provider.complete
        calls = 0

        def interrupted(*args, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise ProviderError("Simulated interrupted request.")
            return complete(*args, **kwargs)

        with patch.object(provider, "complete", side_effect=interrupted):
            with self.assertRaises(ProviderError):
                evaluate(provider, suites, path, run_id="resume-test", max_requests=100)
        return provider, suites

    def test_resume_retains_completed_cases_and_counts_failed_attempts(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "run"
            provider, suites = self.stopped_run(path)
            total = sum(len(s.probes) for s in suites)
            original = (path / "journal.jsonl").read_bytes()
            with patch("resume_cloud_parallel.time.sleep"), patch.object(
                    provider, "complete", wraps=provider.complete) as complete:
                bundle = resume_parallel(provider, suites, path, max_requests=total + 1)
                self.assertEqual(complete.call_count, total - 1)
            self.assertTrue((path / "journal.jsonl").read_bytes().startswith(original))
            run = Index(bundle, allow_samples=True).get("resume-test")
            self.assertEqual(run.manifest.parameters["requests_attempted"], total + 1)
            self.assertEqual(len(run.manifest.parameters["observations"]), total)
            events = [json.loads(line) for line in (path / "journal.jsonl").read_text().splitlines()]
            starts = [e["attempt"] for e in events if e["type"] == "start"]
            self.assertEqual(starts, list(range(1, total + 2)))

    def test_changed_protocol_or_insufficient_budget_makes_no_calls(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "run"
            provider, suites = self.stopped_run(path)
            original = (path / "journal.jsonl").read_bytes()
            with patch.object(provider, "complete") as complete:
                with self.assertRaisesRegex(ArtifactError, "budget"):
                    resume_parallel(provider, suites, path, max_requests=2)
                provider.revision = "changed"
                with self.assertRaisesRegex(ArtifactError, "Protocol changed"):
                    resume_parallel(provider, suites, path, max_requests=100)
                complete.assert_not_called()
            self.assertEqual(original, (path / "journal.jsonl").read_bytes())
