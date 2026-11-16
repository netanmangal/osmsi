from pathlib import Path
import tempfile
import unittest

from osmsi import Index, compare_runs
from osmsi_harness.providers import demo_provider
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite
from build_diagnostic_suites import build

ROOT=Path(__file__).resolve().parents[1]


class DiagnosticSuiteTests(unittest.TestCase):
    def test_frozen_suites_run_end_to_end_and_sdk_compares_them(self):
        suites=[load_suite(str(path)) for path in sorted((ROOT/'suites/azure-diagnostics-v1').glob('*.json'))]
        self.assertEqual(sum(len(suite.probes) for suite in suites),544)
        self.assertEqual({suite.document['dimension'] for suite in suites},{'jb','pi','ag','uc'})
        with tempfile.TemporaryDirectory() as temp:
            first=evaluate(demo_provider(suites),suites,Path(temp)/'first',max_requests=544,run_id='demo-first')
            second=evaluate(demo_provider(suites),suites,Path(temp)/'second',max_requests=544,run_id='demo-second')
            left=Index(first,allow_samples=True).runs[0]
            right=Index(second,allow_samples=True).runs[0]
            comparisons=compare_runs(left,right)
            self.assertTrue(all(item['comparable'] and item['delta']==0 for item in comparisons))
            self.assertEqual(left.manifest.parameters['requests_attempted'],544)
            self.assertEqual(len(left.card.scores),4)

    def test_unverified_truthfulqa_csv_cannot_claim_pinned_revision(self):
        with self.assertRaisesRegex(ValueError,'checksum'):
            build('Category,Question,Best Answer,Best Incorrect Answer\ntest,changed,true,false\n')
