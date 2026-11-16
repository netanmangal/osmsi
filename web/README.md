# OSMSI website

The public site is a static React/TypeScript app built with Vite. It introduces the
six safety dimensions and displays published evaluation artifacts. The current
release includes one deliberately small, two-probe calibration pilot; sample
specimens are available through an explicit preview option.

## Development

Use Node.js 22 or newer. From the repository root:

```bash
npm run setup
npm run dev        # localhost:5173
npm test
npm run build      # web/dist
```

No API key or environment file is needed. See [deployment](../docs/deployment.md)
for hosting the generated site.

## Results

`src/lib/artifacts.ts` validates the index, cards, and manifests against the same
JSON schemas shipped in the Python SDK. `ResultsProvider` loads them from
`public/results/`; invalid or unavailable data produces a visible error with a
retry action. Missing dimensions remain unmeasured, and no overall grade is
calculated. Cards link to their underlying JSON and provenance.

Publish reviewed bundles with the [export pipeline](../pipelines/README.md).
Never copy provider credentials or raw request journals into the site.

## Interface

The original visual language uses warm paper, ruled lines, serif headings, and
monospaced measurements. Tokens live in `src/index.css`; `@/` resolves to `src/`.
GSAP and Lenis handle motion. The three.js scenes load separately from the entry
bundle, with static fallbacks for reduced motion or unavailable WebGL.

Vitest and Testing Library cover artifact validation, sample opt-in, partial
measurements, failures, downloads, and the reduced-motion hero. Production builds
also run TypeScript checks. Check changes to animation and layout in a browser.
