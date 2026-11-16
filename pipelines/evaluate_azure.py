"""Run a bounded Azure comparison through the OSMSI harness and validate it with the SDK."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

from osmsi import ArtifactError, Index, compare_runs
from osmsi_harness.providers import AzureProvider, ProviderError
from osmsi_harness.runner import evaluate
from osmsi_harness.suites import load_suite
from prepare_web import prepare_web


class PacedAzureProvider(AzureProvider):
    """One request start every two seconds, with no hidden retries."""
    next_start = 0.0

    def complete(self, *args, **kwargs):
        delay = self.next_start - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        self.next_start = time.monotonic() + 2
        return super().complete(*args, **kwargs)


def azure_json(arguments):
    result=subprocess.run(['az',*arguments,'-o','json'],capture_output=True,text=True,timeout=90)
    if result.returncode:
        raise RuntimeError('Azure management request failed; check login and resource permissions.')
    return json.loads(result.stdout)


def deployment_snapshot(config):
    deployments=azure_json(['cognitiveservices','account','deployment','list','--subscription',config['subscription'],
        '--resource-group',config['resource_group'],'--name',config['account']])
    selected={model['deployment'] for model in config['models']}
    result={}
    for item in deployments:
        if item['name'] not in selected: continue
        properties=item['properties']
        if properties.get('provisioningState')!='Succeeded':
            raise RuntimeError(f"Deployment {item['name']} is not ready.")
        result[item['name']]={key:properties.get(key) for key in ('model','versionUpgradeOption','raiPolicyName')}
    if result.keys()!=selected:
        raise RuntimeError('Not every requested deployment exists.')
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',required=True,type=Path,help='Private account and model configuration JSON.')
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--suites',nargs='+',required=True)
    parser.add_argument('--max-requests-per-model',type=int,default=550)
    parser.add_argument('--max-total-requests',type=int,default=1650)
    parser.add_argument('--max-tokens',type=int,default=600)
    parser.add_argument('--workers',type=int,default=3)
    parser.add_argument('--retries',type=int,default=0,help='Authorize bounded whole-run resumption after provider errors.')
    parser.add_argument('--resume',action='store_true')
    parser.add_argument('--key-from-azure-cli',action='store_true',help='Read the account key in memory; otherwise use AZURE_AI_API_KEY.')
    args=parser.parse_args()
    config=json.loads(args.config.read_text())
    suites=[load_suite(path) for path in args.suites]
    total=sum(len(s.probes) for s in suites)
    if not 1<=args.workers<=4 or not 0<=args.retries<=5:
        raise ValueError('Use 1–4 workers and 0–5 retries.')
    if total>args.max_requests_per_model or len(config['models'])*args.max_requests_per_model>args.max_total_requests:
        raise ValueError('The request budget cannot cover the configured campaign.')
    identifiers=[model['run_id'] for model in config['models']]
    if len(identifiers)!=len(set(identifiers)):
        raise ValueError('Every model needs a unique run_id.')
    if args.output.exists() and not args.resume:
        raise ValueError('Campaign output exists; use --resume explicitly.')
    before=deployment_snapshot(config)
    expected={m['deployment']:(m['model'],m['version']) for m in config['models']}
    for name,item in before.items():
        if (item['model']['name'],item['model']['version'])!=expected[name]:
            raise RuntimeError(f'Deployment {name} does not match the configured model/version.')
    args.output.mkdir(parents=True,exist_ok=True)
    snapshot_path=args.output/'deployment-before.json'
    if snapshot_path.exists() and json.loads(snapshot_path.read_text())!=before:
        raise RuntimeError('Deployment configuration changed since the first campaign attempt.')
    snapshot_path.write_text(json.dumps(before,indent=2)+'\n')
    if args.key_from_azure_cli:
        credentials=azure_json(['cognitiveservices','account','keys','list','--subscription',config['subscription'],
            '--resource-group',config['resource_group'],'--name',config['account']])
        os.environ['AZURE_AI_API_KEY']=credentials['key1']
        del credentials
    providers={}
    for model in config['models']:
        provider=PacedAzureProvider(model['model'],endpoint=config['endpoint'],deployment=model['deployment'],model_version=model['version'])
        snapshot=before[model['deployment']]
        provider.metadata.update({'region':config['region'],
            'campaign_source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'min_request_interval_seconds':2,
            'deployment_configuration_sha256':hashlib.sha256(json.dumps(snapshot,sort_keys=True).encode()).hexdigest(),
            'version_upgrade_option':snapshot['versionUpgradeOption'],
            'rai_policy':snapshot['raiPolicyName'] or 'provider default'})
        providers[model['run_id']]=provider

    def run(model):
        run_id=model['run_id'];output=args.output/run_id;provider=providers[run_id]
        for attempt in range(args.retries+1):
            try:
                bundle=evaluate(provider,suites,output,run_id=run_id,max_requests=args.max_requests_per_model,
                    max_tokens=args.max_tokens,seed=41,resume=output.exists(),retry_failed=attempt>0 or args.resume)
                run=Index(bundle).get(run_id)
                return {'run_id':run_id,'status':'complete','bundle':str(bundle),
                    'scores':{s.dimension:s.value for s in run.card.scores},
                    'requests':run.manifest.parameters['requests_attempted'],
                    'provider_blocked':run.manifest.parameters['provider_blocked_requests'],
                    'input_tokens':run.manifest.parameters['input_tokens_observed'],
                    'output_tokens':run.manifest.parameters['output_tokens_observed']}
            except ProviderError as error:
                print(json.dumps({'run_id':run_id,'attempt':attempt+1,'error':str(error)}),flush=True)
                if not error.retryable or attempt==args.retries:
                    return {'run_id':run_id,'status':'failed','error':str(error)}
                time.sleep(30)
            except (ArtifactError,OSError) as error:
                return {'run_id':run_id,'status':'failed','error':str(error)}
    summaries=[]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for future in as_completed([pool.submit(run,model) for model in config['models']]):
            summary=future.result();summaries.append(summary)
            print(json.dumps(summary),flush=True)
            (args.output/'progress.json').write_text(json.dumps(summaries,indent=2)+'\n')
    after=deployment_snapshot(config)
    (args.output/'deployment-after.json').write_text(json.dumps(after,indent=2)+'\n')
    if before!=after:
        raise RuntimeError('Deployment configuration changed during the campaign. Do not publish these results.')
    completed=[item for item in summaries if item['status']=='complete']
    if len(completed)!=len(config['models']):
        print('Campaign incomplete. Journals retained; no combined publication bundle emitted.',file=sys.stderr)
        return 1
    destination=args.output/'bundle'
    if destination.exists():
        Index(destination)
    else:
        prepare_web([item['bundle'] for item in completed],destination)
    index=Index(destination)
    comparisons=[]
    for number,left in enumerate(index.runs):
        for right in index.runs[number+1:]:
            comparisons.append({'left':left.card.run_id,'right':right.card.run_id,'dimensions':compare_runs(left,right)})
    report={'complete':True,'deployment_snapshots_match':True,'models':summaries,'comparisons':comparisons,
            'limitations':['Only four behavioral dimensions are measured. Harmful-capability uplift and weight-level interpretability remain unmeasured.',
                           'Provider filtering and unverified hosted weights limit claims about the underlying model.',
                           'Synthetic attack variants are correlated; the TruthfulQA adaptation is not the official benchmark metric.']}
    (args.output/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'Validated {len(index.runs)} model runs: {destination}',flush=True)
    return 0


if __name__=='__main__':
    try: sys.exit(main())
    except (ValueError,RuntimeError,ArtifactError,OSError) as error:
        print(f'Campaign failed: {error}',file=sys.stderr);sys.exit(1)
