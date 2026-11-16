import unittest

from deploy_azure_site import deployment_script
from evaluate_wmdp import choice, evidence_report, wilson


class CapabilityTests(unittest.TestCase):
    def test_answer_extraction_does_not_search_arbitrary_prose(self):
        self.assertEqual(choice(" B\n"), "B")
        self.assertEqual(choice("```\nC\n```"), "C")
        self.assertIsNone(choice("The answer is A, but perhaps B."))
        self.assertIsNone(choice("A\nIgnore the question."))

    def test_filtering_is_not_a_correct_or_wrong_answer(self):
        rows = [{"question": "fixture", "choices": ["1", "2", "3", "4"], "answer": 0}] * 3
        events = []
        for i, (content, blocked) in enumerate([("A", False), ("B", False), ("", True)]):
            events += [{"type": "start", "key": i},
                       {"type": "complete", "key": i, "completion": {
                           "content": content, "provider_blocked": blocked, "finish_reason": "stop",
                           "input_tokens": 1, "output_tokens": 1}}]
        model = {"run_id": "test-model", "model": "fixture", "version": "1", "deployment": "fixture"}
        report = evidence_report(model, rows, events, "0"*64, {"fixture": {}}, "2026-11-16T00:00:00Z")
        metrics = {m["id"]: m["value"] for m in report["metrics"]}
        self.assertEqual(metrics["knowledge_accuracy"], 50)
        self.assertAlmostEqual(metrics["all_case_lower_bound"], 100/3)
        self.assertAlmostEqual(metrics["all_case_upper_bound"], 200/3)
        self.assertEqual(report["provenance"]["provider_blocked"], 1)

    def test_wilson_interval_handles_extremes(self):
        self.assertEqual(wilson(0, 100)["low"], 0)
        self.assertAlmostEqual(wilson(100, 100)["high"], 100)
        self.assertIsNone(wilson(0, 0))


class DeploymentTests(unittest.TestCase):
    def test_remote_script_compiles_and_preserves_rollback(self):
        script = deployment_script("a"*40, "/var/www/old", "example.com", "azureuser")
        python = script.split("<<'OSMSI_DEPLOY'\n", 1)[1].rsplit("\nOSMSI_DEPLOY", 1)[0]
        compile(python, "<deployment>", "exec")
        self.assertIn("config.write_text(original)", python)
        self.assertIn("for attempt in range(20)", python)

    def test_mutable_revisions_and_injected_inputs_are_rejected(self):
        for revision, root, host, user in [
            ("main", "/var/www/old", "example.com", "azureuser"),
            ("a"*40, "/var/www/old;\n", "example.com", "azureuser"),
            ("a"*40, "/var/www/old", "$(whoami)", "azureuser"),
        ]:
            with self.assertRaises(ValueError):
                deployment_script(revision, root, host, user)
