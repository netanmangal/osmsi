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
from osmsi_harness.providers import AzureProvider, ProviderError, demo_provider
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite


class AzureTests(unittest.TestCase):
    def provider(self):
        return AzureProvider('Phi-4',endpoint='https://example.cognitiveservices.azure.com',
                             deployment='test-phi',model_version='7')

    @patch.dict(os.environ, {'AZURE_AI_API_KEY':'fake-test-key'})
    @patch('osmsi_harness.providers.build_opener')
    def test_v1_request_uses_deployment_and_api_key(self,opener):
        response=opener.return_value.open.return_value.__enter__.return_value
        response.headers={}
        response.read.return_value=json.dumps({'choices':[{'message':{'content':'READY'},'finish_reason':'stop'}],
                                               'usage':{'prompt_tokens':3,'completion_tokens':1}}).encode()
        provider=self.provider()
        result=provider.complete([{'role':'user','content':'READY'}],seed=41,max_tokens=600)
        request=opener.return_value.open.call_args.args[0]
        self.assertEqual(request.full_url,'https://example.cognitiveservices.azure.com/openai/v1/chat/completions')
        self.assertEqual(request.get_header('Api-key'),'fake-test-key')
        self.assertIsNone(request.get_header('Authorization'))
        self.assertEqual(json.loads(request.data)['model'],'test-phi')
        self.assertEqual(provider.model,'Phi-4')
        self.assertEqual(result.revision,'azure-model-version:7')
        self.assertEqual(result.output_tokens,1)

    @patch.dict(os.environ, {'AZURE_AI_API_KEY':'fake-test-key'})
    @patch('osmsi_harness.providers.build_opener')
    def test_only_explicit_content_filter_is_a_provider_block(self,opener):
        opener.return_value.open.side_effect=HTTPError('https://example',400,'bad',{},
            io.BytesIO(b'{"error":{"code":"content_filter","message":"private diagnostic"}}'))
        completion=self.provider().complete([],seed=41,max_tokens=600)
        self.assertTrue(completion.provider_blocked)
        self.assertEqual(completion.content,'')
        opener.return_value.open.side_effect=HTTPError('https://example',400,'bad',{},
            io.BytesIO(b'{"error":{"code":"bad_request","message":"private diagnostic"}}'))
        with self.assertRaises(ProviderError) as error: self.provider().complete([],seed=41,max_tokens=600)
        self.assertNotIn('private diagnostic',str(error.exception))

    def test_non_azure_origins_are_rejected(self):
        for endpoint in ['https://example.com','http://example.openai.azure.com','https://example.openai.azure.com/other']:
            with self.assertRaises(ProviderError):
                AzureProvider('test',endpoint=endpoint,deployment='test',model_version='1')

    def test_filtered_probe_is_not_scored_as_model_refusal(self):
        suites=[load_suite('policy-boundaries')]
        provider=demo_provider(suites)
        original=provider.complete
        count=0
        def complete(*args,**kwargs):
            nonlocal count
            count+=1
            result=original(*args,**kwargs)
            return replace(result,content='',provider_blocked=True,finish_reason='content_filter') if count==1 else result
        with tempfile.TemporaryDirectory() as temp,patch.object(provider,'complete',side_effect=complete):
            bundle=evaluate(provider,suites,Path(temp)/'run',limit=3)
            run=Index(bundle,allow_samples=True).runs[0]
            self.assertEqual(run.card.scores[0].value,100)
            self.assertEqual(run.manifest.suites[0].parameters['n_scored'],2)
            self.assertEqual(run.manifest.suites[0].parameters['provider_blocked'],1)
            self.assertIsNone(run.manifest.parameters['observations'][0]['score'])

    def test_too_few_unblocked_outcomes_emits_no_card(self):
        suites=[load_suite('policy-boundaries')]
        provider=demo_provider(suites); original=provider.complete
        with tempfile.TemporaryDirectory() as temp,patch.object(provider,'complete',side_effect=lambda *a,**k:
                replace(original(*a,**k),content='',provider_blocked=True)):
            output=Path(temp)/'run'
            with self.assertRaises(ArtifactError): evaluate(provider,suites,output,limit=2)
            self.assertFalse((output/'bundle').exists())
