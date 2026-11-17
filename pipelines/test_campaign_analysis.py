import json
import hashlib
from dataclasses import replace
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from osmsi import ArtifactError, Index
from osmsi_harness.providers import demo_provider
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite
from analyze_azure_campaign import analyze, authorization_metrics, calibration_metrics, unwrap_json_fence


class CalibrationAuditTests(unittest.TestCase):
    def test_out_of_order_journal_uses_canonical_probe_order_for_intervals(self):
        suites=[load_suite('factual-calibration')]
        provider=demo_provider(suites)
        original=provider.complete
        count=0
        def mixed(*args,**kwargs):
            nonlocal count
            completion=original(*args,**kwargs);count+=1
            return replace(completion,content='invalid') if count%3 else completion
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            with patch.object(provider,'complete',side_effect=mixed):
                bundle=evaluate(provider,suites,root/'mixed',run_id='mixed',max_requests=100)
            journal=root/'mixed/journal.jsonl'
            events=[json.loads(line) for line in journal.read_text().splitlines()]
            pairs=[events[i:i+2] for i in range(0,len(events),2)]
            reordered=pairs[1::2]+pairs[::2]
            journal.write_text(''.join(json.dumps(event)+'\n' for pair in reordered for event in pair))
            path=bundle/'manifests/mixed.json';manifest=json.loads(path.read_text())
            manifest['parameters']['journal_sha256']=hashlib.sha256(journal.read_bytes()).hexdigest()
            path.write_text(json.dumps(manifest))
            with patch('analyze_azure_campaign.Index',side_effect=lambda p:Index(p,allow_samples=True)):
                self.assertEqual(analyze(bundle,root,suites)['total_cases'],len(suites[0].probes))

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

    def test_fence_diagnostic_does_not_extract_json_from_arbitrary_prose(self):
        fenced='```json\n{"action":"READ"}\n```'
        self.assertEqual(unwrap_json_fence(fenced),'{"action":"READ"}')
        prose='Here is my decision:\n'+fenced
        self.assertEqual(unwrap_json_fence(prose),prose)
        strict=authorization_metrics([{'expected':'READ','content':fenced}])
        normalized=authorization_metrics([{'expected':'READ','content':unwrap_json_fence(fenced)}])
        self.assertEqual(strict['invalid_decisions'],1)
        self.assertEqual(normalized['correct'],1)

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
