from dataclasses import replace
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from osmsi import ArtifactError, Index
from osmsi_harness.providers import ChatProvider, Completion, ProviderError, demo_provider
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite, probe_score, summarize


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name) / "run"
        self.suites = [load_suite("injection-boundaries")]

    def test_demo_writes_valid_partial_dimension_run(self):
        bundle = evaluate(demo_provider(self.suites), self.suites, self.output,
                          run_id="demo-run", limit=2)
        run = Index(bundle, allow_samples=True).get("demo-run")
        self.assertEqual([score.dimension for score in run.card.scores], ["pi"])
        self.assertTrue(run.card.sample)
        self.assertEqual(run.manifest.parameters["requests_attempted"], 2)
        self.assertTrue(run.manifest.suites[0].dataset_revision.startswith("sha256:"))
        self.assertTrue((self.output / "journal.jsonl").exists())
        self.assertFalse((bundle / "journal.jsonl").exists())

    def test_preflight_budget_rejection_calls_nothing(self):
        provider = demo_provider(self.suites)
        with patch.object(provider, "complete") as complete:
            with self.assertRaisesRegex(ArtifactError, "budget is smaller"):
                evaluate(provider, self.suites, self.output, max_requests=1, limit=2)
            complete.assert_not_called()
        self.assertFalse(self.output.exists())

    def test_no_overwrite_and_completed_resume_makes_no_calls(self):
        evaluate(demo_provider(self.suites), self.suites, self.output, limit=2)
        with self.assertRaisesRegex(ArtifactError, "Output exists"):
            evaluate(demo_provider(self.suites), self.suites, self.output, limit=2)
        provider = demo_provider(self.suites)
        with patch.object(provider, "complete") as complete:
            evaluate(provider, self.suites, self.output, limit=2, resume=True)
            complete.assert_not_called()

    def test_resume_rejects_configuration_changes(self):
        evaluate(demo_provider(self.suites), self.suites, self.output, limit=2)
        with self.assertRaisesRegex(ArtifactError, "configuration"):
            evaluate(demo_provider(self.suites), self.suites, self.output, limit=2, seed=99, resume=True)

    def test_failure_retains_journal_and_requires_explicit_retry(self):
        provider = demo_provider(self.suites)
        original = provider.complete
        calls = 0

        def fail_second(*args, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise ProviderError("Temporary provider failure.", credits=2)
            return original(*args, **kwargs)

        with patch.object(provider, "complete", side_effect=fail_second):
            with self.assertRaises(ProviderError):
                evaluate(provider, self.suites, self.output, limit=2, max_requests=3)
        self.assertFalse((self.output / "bundle").exists())
        with self.assertRaisesRegex(ArtifactError, "retry-failed"):
            evaluate(demo_provider(self.suites), self.suites, self.output, limit=2,
                     max_requests=3, resume=True)
        provider = demo_provider(self.suites)
        with patch.object(provider, "complete", wraps=provider.complete) as complete:
            bundle = evaluate(provider, self.suites, self.output, limit=2,
                              max_requests=3, resume=True, retry_failed=True)
            self.assertEqual(complete.call_count, 1)
        manifest = Index(bundle, allow_samples=True).runs[0].manifest
        self.assertEqual(manifest.parameters["requests_attempted"], 3)
        self.assertEqual(manifest.parameters["credits_observed"], 2)

    def test_revision_drift_prevents_card(self):
        provider = demo_provider(self.suites)
        original = provider.complete
        calls = 0

        def drift(*args, **kwargs):
            nonlocal calls
            calls += 1
            return replace(original(*args, **kwargs), revision=f"revision-{calls}")

        with patch.object(provider, "complete", side_effect=drift), self.assertRaisesRegex(ArtifactError, "revision changed"):
            evaluate(provider, self.suites, self.output, limit=2)
        self.assertFalse((self.output / "bundle").exists())

    def test_credit_limit_stops_after_one_billed_response(self):
        provider = demo_provider(self.suites)
        original = provider.complete
        with patch.object(provider, "complete", side_effect=lambda *a, **kw: replace(
            original(*a, **kw), credits=5)) as complete:
            with self.assertRaisesRegex(ArtifactError, "Credit limit"):
                evaluate(provider, self.suites, self.output, limit=2, max_credits=1)
            self.assertEqual(complete.call_count, 1)
        with self.assertRaisesRegex(ArtifactError, "exhaust"):
            evaluate(demo_provider(self.suites), self.suites, self.output, limit=2,
                     max_credits=1, resume=True)
        self.assertFalse((self.output / "bundle").exists())

    def test_demo_cannot_score_real_model_name(self):
        with self.assertRaisesRegex(ArtifactError, "specimen"):
            evaluate(demo_provider(self.suites, model="real-model"), self.suites, self.output)

    def test_duplicate_dimensions_rejected(self):
        with self.assertRaisesRegex(ArtifactError, "one suite"):
            evaluate(demo_provider(self.suites), self.suites * 2, self.output)


class ScoreTests(unittest.TestCase):
    def test_wilson_interval_has_uncertainty_at_extremes(self):
        result = summarize([1.0] * 8, "exact", 41)
        self.assertEqual(result["value"], 100)
        self.assertAlmostEqual(result["confidence_interval"]["low"], 67.559, places=2)
        self.assertEqual(result["confidence_interval"]["high"], 100)

    def test_calibration_and_malformed_responses(self):
        self.assertEqual(probe_score("calibration", '{"answer":"A","confidence":1}', "A"), 1)
        self.assertEqual(probe_score("calibration", '{"answer":"B","confidence":1}', "A"), 0)
        self.assertEqual(probe_score("calibration", '{"answer":"A","confidence":0.5}', "A"), 0.75)
        for text in ['{"answer":"A","confidence":true}', '{"answer":"A","confidence":NaN}', "not JSON", "[]"]:
            self.assertEqual(probe_score("calibration", text, "A"), 0)
        self.assertEqual(probe_score("json-choice", '{"action":"ASK"}', "ASK"), 1)
        self.assertEqual(probe_score("exact", "SAFE plus extra", "SAFE"), 0)

    def test_bootstrap_is_deterministic(self):
        self.assertEqual(summarize([0.3, 0.7, 1], "calibration", 41),
                         summarize([0.3, 0.7, 1], "calibration", 41))


class ProviderTests(unittest.TestCase):
    def response(self, opener, content="SAFE", revision="pinned"):
        response = opener.return_value.open.return_value.__enter__.return_value
        response.headers = {"X-Sie-Model-Revision": revision, "X-Sie-Credits-Debited": "2"}
        response.read.return_value = json.dumps({
            "choices": [{"message": {"content": content}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 1},
        }).encode()

    def test_auth_revision_and_request_caps(self):
        with patch.dict(os.environ, {"SUPERLINKED_API_KEY": "test-token"}), \
                patch("osmsi_harness.providers.build_opener") as opener:
            self.response(opener)
            provider = ChatProvider("test-model")
            result = provider.complete([{"role": "user", "content": "hello"}], seed=41, max_tokens=600)
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
            self.assertEqual(json.loads(request.data)["max_tokens"], 600)
            self.assertEqual(result.revision, "pinned")
            self.assertEqual(result.credits, 2)
            self.assertEqual(result.output_tokens, 1)

    def test_missing_revision_is_not_silently_published(self):
        with patch("osmsi_harness.providers.build_opener") as opener:
            self.response(opener, revision=None)
            with self.assertRaisesRegex(ProviderError, "revision"):
                ChatProvider("test", base_url="http://127.0.0.1:8080").complete([], seed=1, max_tokens=600)

    def test_bad_origin_and_missing_key(self):
        with self.assertRaises(ProviderError):
            ChatProvider("test", base_url="http://example.com")
        with patch.dict(os.environ, {}, clear=True), self.assertRaisesRegex(ProviderError, "SUPERLINKED_API_KEY"):
            ChatProvider("test")

    def test_http_failure_records_charge_without_echoing_body(self):
        with patch("osmsi_harness.providers.build_opener") as opener:
            opener.return_value.open.side_effect = HTTPError(
                "http://127.0.0.1", 500, "secret", {"X-Sie-Credits-Debited": "7"}, io.BytesIO(b"secret"))
            with self.assertRaises(ProviderError) as context:
                ChatProvider("test", base_url="http://127.0.0.1").complete([], seed=1, max_tokens=600)
            self.assertEqual(context.exception.credits, 7)
            self.assertNotIn("secret", str(context.exception))
            self.assertEqual(opener.return_value.open.call_count, 1)
