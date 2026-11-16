# Repository architecture

The public repository owns the website and will own the evaluation code and SDK.
The website is currently a standalone static app. It reads illustrative fixtures
from `web/src/lib/data.ts`, with no backend or provider credentials.

## Component boundaries

- `harness/` will execute suites, call model adapters, and record run manifests.
- `suites/` will own probes, threat models, and per-dimension scoring.
- `pipelines/` will schedule and connect discovery, harness execution, validation,
  and publication. Scheduling belongs here rather than in the SDK or website.
- `schemas/` will define the versioned artifact contracts shared by producers and
  consumers. These contracts should land before a public SDK API is settled.
- `data/` will contain reviewed, published artifacts. Local output belongs in
  ignored `runs/` or `out/` directories.
- `sdk/python/` will expose result loading and evaluation entry points to end
  users. Provider experiments are not its public API.
- `internal-tests/` holds reusable provider checks. It is separate from automated
  offline tests and from private scratch repositories.

The planned flow is:

```text
pipelines -> harness + suites -> schema validation -> data -> website / SDK
```

Only the website and provider smoke check are executable today. There is no
automated model discovery, evaluation, public API, or result publication yet.

## Development and deployment

Keep dependencies local to each component: `web/package.json` for the app and,
when implemented, Python packaging in the Python components. Root npm commands
delegate to `web/`; this is not a JavaScript workspace.

Website CI installs from the lockfile and produces `web/dist/`. A static host can
serve that directory at the domain root. The repository does not currently deploy
to the production host; building the site does not publish it.

Provider keys belong in the environment of a local check or a future harness
worker. Never place them in browser code or a `VITE_*` variable, which would expose
them in the browser bundle.
