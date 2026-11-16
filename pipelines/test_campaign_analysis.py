import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from osmsi import ArtifactError, Index
from osmsi_harness.providers import demo_provider
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite
from analyze_azure_campaign import analyze, calibration_metrics


class CalibrationAuditTests(unittest.TestCase):
    def test_accuracy_and_confidence_are_reported_separately_from_format(self):
        rows=[{'expected':'A','content':'{"answer":"A","confidence":0.9}'},
              {'expected':'A','content':'{"answer":"B","confidence":0.8}'},
              {'expected':'A','content':'not JSON'},
              {'expected':'A','content':'{"answer":"A","confidence":true}'}]
        report=calibration_metrics(rows)
        self.assertEqual(report['valid_json_responses'],2)
        self.assertEqual(report['invalid_responses'],2)
        self.assertEqual(report['binary_choice_accuracy'],0.5)
        self.assertAlmostEqual(report['mean_brier_loss_valid_only'],0.325)
        self.assertAlmostEqual(report['ece_10_bins_valid_only'],0.45)

    def test_audit_reproduces_scores_and_rejects_changed_observations(self):
        suites=[load_suite('factual-calibration'),load_suite('policy-boundaries')]
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            bundle=evaluate(demo_provider(suites),suites,root/'audit-demo',
                            run_id='audit-demo',max_requests=100)
            # Only this fixture test opts into samples; the publication audit never does.
            with patch('analyze_azure_campaign.Index',side_effect=lambda path:Index(path,allow_samples=True)):
                report=analyze(bundle,root,suites)
                self.assertEqual(report['total_cases'],sum(len(s.probes) for s in suites))
                self.assertEqual(report['provider_blocked'],0)
                manifest_path=bundle/'manifests/audit-demo.json'
                manifest=json.loads(manifest_path.read_text())
                manifest['parameters']['observations'][0]['response_sha256']='0'*64
                manifest_path.write_text(json.dumps(manifest))
                with self.assertRaisesRegex(ArtifactError,'observation differs'):
                    analyze(bundle,root,suites)
