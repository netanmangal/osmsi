# Build and deployment

The site is static. It requires no server-side provider key, database, or Python
runtime after build. From the repository root with Node.js 22+:

```bash
npm run setup
npm test
npm run build
npm run preview
```

Deploy the complete `web/dist/` directory at the domain root. It contains the
HTML, versioned assets, fonts, and `/results/` JSON artifacts. Keep the results
directory with the build; copying only JavaScript will break the index.

For an existing Nginx or other static host, publish to a new release directory,
verify it, and switch the serving directory atomically. Retain the previous
release for rollback. Do not put `.env`, `runs/`, or response journals on the host.
The repository intentionally contains no production host credentials.

The `web` GitHub Actions workflow tests and builds the site and uploads an
`osmsi-static-site` artifact. It does not change the current production host.
No hosting provider or deployment credential has been assumed.

After deployment, check the landing page, `/results/index.json`, linked cards and
manifests, mobile navigation, reduced-motion behavior, and a no-WebGL browser.
The page must show load failures explicitly rather than substituting sample
figures for unavailable real results.

The SDK can check the deployed data independently:

```bash
osmsi fetch https://osmsi.disobedientgeometry.com/results --output out/deployed-check
osmsi validate out/deployed-check
```

The Superlinked key is used only by evaluation workers. Enabling the optional
manual benchmark workflow requires separately configuring an Actions secret;
website deployment does not require that secret.
