# Build and deployment

The site is static: no provider key, database, or Python runtime is needed to
serve it. With Node.js 22+, run `npm run setup`, `npm test`, and `npm run build`.
Deploy the complete `web/dist/` at the domain root, including `/results/` and
`/evidence/`. The GitHub Actions web workflow tests and builds an artifact;
it does not deploy automatically.

## Current Azure host

The live domain is served by Nginx on an existing Azure VM. The public deployment
pipeline builds a pinned, pushed public-repository commit as an unprivileged
user. It installs immutable releases under `/var/www/osmsi/releases/` and swaps
`/var/www/osmsi/current` atomically. Nginx's site config points at that symlink.
The private source checkout is no longer the live document root.

After local checks and CI pass, use authenticated Azure CLI and private host
values supplied through your shell:

```bash
python pipelines/deploy_azure_site.py \
  --subscription "$AZURE_SUBSCRIPTION_ID" --resource-group "$OSMSI_RESOURCE_GROUP" \
  --vm "$OSMSI_VM" --revision "$(git rev-parse HEAD)" \
  --expected-root /var/www/osmsi/current --record out/deployment-receipt.json
```

The revision must be a full commit SHA available from the public repository.
The pipeline refuses a mismatched Nginx root or an existing release directory.
It preserves prior hashed assets for already-open tabs, checks `nginx -t`, then
verifies HTTPS release metadata and result indexes. Failed health checks restore
the original Nginx config and release link. Deployment receipts contain the
previous release and configuration backup; retain them privately.

For an operator-initiated rollback, use the receipt's `previous_release` path:
create a temporary symlink beside `current`, atomically rename it over `current`,
run `nginx -t`, and reload Nginx. If changing configuration too, restore the
receipt's `nginx_backup` before checking and reloading. Verify `/release.json`
afterward. Do not delete the previous release until the new one is established.

## Verify the live release

```bash
osmsi fetch https://osmsi.disobedientgeometry.com/results --output out/deployed-results
osmsi validate out/deployed-results
osmsi fetch-evidence https://osmsi.disobedientgeometry.com/evidence --output out/deployed-studies
osmsi evidence out/deployed-studies
```

Check the landing page, study selection, JSON downloads, mobile navigation,
reduced motion, and a no-WebGL browser. Missing artifacts must return HTTP 404,
not the SPA's HTML. The UI must show download failures rather than substitute
samples. `/release.json` identifies the deployed source revision.

Keep `.env`, Azure keys, response journals, and private account configuration
out of releases. Evaluation workers alone need provider credentials. No secret
is copied to Actions or the website by this deployment process.
