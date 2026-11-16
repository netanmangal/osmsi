"""Deploy a pinned public-repository revision through Azure VM Run Command."""

import argparse
import json
from pathlib import Path
import re
import shlex
import subprocess


def deployment_script(revision, expected_root, hostname, build_user):
    if not re.fullmatch(r"[a-f0-9]{40}", revision):
        raise ValueError("Use a complete, immutable Git commit SHA.")
    if not re.fullmatch(r"[a-z0-9.-]+", hostname) or not re.fullmatch(r"[a-z_][a-z0-9_-]*", build_user):
        raise ValueError("Invalid hostname or build user.")
    if not expected_root.startswith("/") or any(c in expected_root for c in "\n\r;"):
        raise ValueError("Expected root must be an absolute path without Nginx syntax.")
    settings = json.dumps(dict(revision=revision, expected_root=expected_root,
                               hostname=hostname, build_user=build_user))
    return f"""set -eu
python3 - {shlex.quote(settings)} <<'OSMSI_DEPLOY'
import hashlib,json,os,pathlib,re,shutil,stat,subprocess,sys,time,urllib.request
c=json.loads(sys.argv[1]);sha=c['revision'];host=c['hostname']
base=pathlib.Path('/var/www/osmsi');release=base/'releases'/sha;current=base/'current'
config=pathlib.Path('/etc/nginx/sites-available')/(host+'.conf')
original=config.read_text()
roots=re.findall(r'^\\s*root\\s+([^;]+);',original,re.M)
if roots!=[c['expected_root']]:raise RuntimeError('Nginx root changed; inspect before deploying.')
if release.exists():raise RuntimeError('Release already exists; do not overwrite an immutable release.')
if current.exists() and not current.is_symlink():raise RuntimeError('Current release must be a symlink.')
build=pathlib.Path('/var/tmp')/('osmsi-build-'+sha)
if build.exists():raise RuntimeError('Build directory exists; inspect it before retrying.')
subprocess.run(['install','-d','-o',c['build_user'],'-g',c['build_user'],str(build)],check=True)
def run(args):
 subprocess.run(['sudo','-u',c['build_user'],'--',*args],cwd=build,check=True)
with (build/'build.log').open('w') as log:
 def logged(args):
  subprocess.run(['sudo','-u',c['build_user'],'--',*args],cwd=build,check=True,stdout=log,stderr=subprocess.STDOUT)
 logged(['git','init','.'])
 logged(['git','remote','add','origin','https://github.com/netanmangal/osmsi.git'])
 logged(['git','fetch','--depth=1','origin',sha])
 logged(['git','checkout','--detach','FETCH_HEAD'])
 observed=subprocess.check_output(['git','-c','safe.directory='+str(build),'rev-parse','HEAD'],cwd=build,text=True).strip()
 if observed!=sha:raise RuntimeError('Checkout revision mismatch.')
 logged(['npm','ci','--prefix','web'])
 logged(['npm','exec','--yes','--package=node@22','--','npm','run','build'])
dist=build/'web/dist'
index=json.loads((dist/'results/index.json').read_text())
for entry in index['entries']:
 for kind in ('cards','manifests'):
  path=dist/'results'/kind/(entry['run_id']+'.json')
  if json.loads(path.read_text())['run_id']!=entry['run_id']:raise RuntimeError('Invalid result identity.')
evidence_path=dist/'evidence/evidence-index.json'
evidence=json.loads(evidence_path.read_text()) if evidence_path.exists() else None
if evidence:
 for entry in evidence['reports']:
  raw=(dist/'evidence/reports'/(entry['report_id']+'.json')).read_bytes()
  report=json.loads(raw)
  if hashlib.sha256(raw).hexdigest()!=entry['sha256']:raise RuntimeError('Evidence digest mismatch.')
  if (report['report_id'],report['model']['id'],report['dimension'])!=(entry['report_id'],entry['model_id'],entry['dimension']):raise RuntimeError('Evidence identity mismatch.')
release.parent.mkdir(parents=True,exist_ok=True)
shutil.copytree(dist,release)
(release/'release.json').write_text(json.dumps({{'revision':sha,'result_runs':len(index['entries']),'evidence_reports':len(evidence['reports']) if evidence else 0}})+'\\n')
# Preserve immutable hashed assets requested by already-open browser tabs.
previous_assets=pathlib.Path(c['expected_root'])/'assets'
if previous_assets.is_dir():
 for old in previous_assets.iterdir():
  target=release/'assets'/old.name
  if old.is_file() and not target.exists():shutil.copy2(old,target)
backup=base/'backups'/('nginx-'+str(time.time_ns())+'.conf')
backup.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(config,backup)
previous=os.readlink(current) if current.is_symlink() else None
updated=re.sub(r'(^\\s*root\\s+)[^;]+;',lambda m:m.group(1)+str(current)+';',original,count=1,flags=re.M)
if '# OSMSI artifact routes' not in updated:
 updated=re.sub(r'(^\\s*root\\s+[^;]+;)',r'\\1\\n    # OSMSI artifact routes\\n    location ^~ /results/ {{ try_files $uri =404; }}\\n    location ^~ /evidence/ {{ try_files $uri =404; }}',updated,count=1,flags=re.M)
next_link=base/('current-next-'+sha)
try:
 next_link.symlink_to(release);os.replace(next_link,current)
 config.write_text(updated)
 subprocess.run(['nginx','-t'],check=True)
 subprocess.run(['systemctl','reload','nginx'],check=True)
 # A successful reload returns before every old worker has drained.
 for attempt in range(20):
  try:
   with urllib.request.urlopen('https://'+host+'/release.json',timeout=10) as response:live=json.load(response)
   with urllib.request.urlopen('https://'+host+'/results/index.json',timeout=10) as response:live_index=json.load(response)
   live_evidence=None
   if evidence:
    with urllib.request.urlopen('https://'+host+'/evidence/evidence-index.json',timeout=10) as response:live_evidence=json.load(response)
   if live.get('revision')==sha and live_index==index and live_evidence==evidence:break
  except (OSError,ValueError):pass
  time.sleep(1)
 else:raise RuntimeError('Live release or result verification failed.')
except BaseException:
 config.write_text(original)
 if previous:
  if next_link.is_symlink():next_link.unlink()
  next_link.symlink_to(previous);os.replace(next_link,current)
 elif current.is_symlink():current.unlink()
 subprocess.run(['nginx','-t'],check=True);subprocess.run(['systemctl','reload','nginx'],check=True)
 raise
print(json.dumps({{'deployed':sha,'result_runs':len(index['entries']),'release':str(release),'nginx_backup':str(backup),'previous_release':previous,'previous_root':c['expected_root']}}))
OSMSI_DEPLOY
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("subscription", "resource-group", "vm", "revision", "expected-root"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--hostname", default="osmsi.disobedientgeometry.com")
    parser.add_argument("--build-user", default="azureuser")
    parser.add_argument("--record", required=True, type=Path, help="Private deployment receipt under ignored output.")
    args = parser.parse_args()
    script = deployment_script(args.revision, args.expected_root, args.hostname, args.build_user)
    result = subprocess.run([
        "az", "vm", "run-command", "invoke", "--subscription", args.subscription,
        "--resource-group", args.resource_group, "--name", args.vm,
        "--command-id", "RunShellScript", "--scripts", script, "-o", "json",
    ], capture_output=True, text=True, timeout=900)
    if result.returncode:
        raise RuntimeError("Azure deployment command failed; check Azure login and the VM operation.")
    receipt = json.loads(result.stdout)
    args.record.parent.mkdir(parents=True, exist_ok=True)
    args.record.write_text(json.dumps(receipt, indent=2) + "\n")
    messages = "\n".join(item.get("message", "") for item in receipt.get("value", []))
    if '"deployed": "' + args.revision + '"' not in messages:
        raise RuntimeError(f"Deployment did not report success; inspect {args.record}.")
    print(f"Deployed {args.revision}; private receipt: {args.record}")


if __name__ == "__main__":
    main()
