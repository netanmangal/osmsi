# OSMSI · website

The public site for the Open Source Model Safety Index: a single long-scroll document that
makes the case for a multidimensional, reproducible safety index and routes visitors to the
index, the method, or the repo. Deploys as a static build to
`osmsi.disobedientgeometry.com`.

Audience: AI safety researchers, developers deploying open weights, and policymakers who
need numbers they can cite and rerun.

## Stack

- Vite 7 + React 19 + TypeScript
- Tailwind CSS v4 with `@theme` tokens, plus shadcn-convention primitives (`cva` + `cn`)
- GSAP 3.13 (ScrollTrigger, SplitText, Flip) + Lenis smooth scroll
- three.js via `@react-three/fiber` and `drei` for the hero and the audience scene
- Self-hosted variable fonts (~195 KB total): Zodiak, General Sans, Spline Sans Mono

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build  →  dist/
npm run preview    # serve dist/ locally
npm run typecheck  # tsc -b --noEmit
```

`@/` resolves to `src/` (`vite.config.ts`).

## Design system

Concept: *the instrument of record* — a standards-institute document being measured by a
calibration instrument. Ruled hairlines, tick strips, radar hexagons, mono clause
numbering. Voice: calibrated, transparent, unflinching.

**Color** (`src/index.css`, `@theme`). One background family, one ink, one accent;
hierarchy comes from ink at alphas, never from grey.

| Token | Value | Role |
| --- | --- | --- |
| `--color-paper` | `#f5efe2` | page canvas (warm paper, never `#fff`) |
| `--color-paper-2` | `#fbf7ec` | raised sheets |
| `--color-blueprint` | `#e9edf6` | cool technical band + 72px drafting grid |
| `--color-ink` | `#1a1511` | espresso ink · 14.9:1 on paper |
| `--color-ink-dim` | `#57524b` | secondary text · 6.7:1 AA |
| `--color-ink-mute` | `#7c776f` | large text and mono labels only · 3.9:1 |
| `--color-cobalt` | `#2036c8` | the accent · 7.5:1 on paper |
| `--color-void` | `#14100c` | inverted final band |
| dimension inks | `pass #256e47 · warn #8f6410 · flag #b03a24 · teal #20706c · plum #7c3f73` | **data only, never chrome** |

Grade and dimension colors never leak into navigation, buttons, or section chrome — the
instrument reports, it does not editorialize. Hairlines are ink at 14% / 26% (`--line`,
`--line-strong`); elevation is a hard offset press-shadow, never a blurred drop shadow.

**Type.** Three slots: Zodiak (display serif, ~560–620 weight), General Sans (body/UI,
400/500), Spline Sans Mono (every label, eyebrow, and numeral — `.mono-label` is
`0.72rem / 460 / +0.22em / uppercase`). All data figures use tabular numerals (`.tnum`).
Scale is fluid via clamp: `--text-hero`, `--text-statement`, `--text-h2`, `--text-giant`.

**Bands.** The page moves through three bands — paper (narrative) → blueprint (technical)
→ void (the ask). `App.tsx` observes sections and writes `html[data-band]` plus the
`theme-color` meta, so browser chrome and the fixed nav re-skin per band. Section eyebrows
(`+ NN · clause name`) are real index-document numbering, 01 problem through 06 contribute.

## Motion and fallbacks

Lenis smooth scroll (lerp 0.115) with the house ease `cubic-bezier(.22,1,.36,1)`. The
preloader reports real progress (fonts, load, hero canvas) with a minimum 1100ms hold.
`Dimensions` is a pinned scrub that assembles the radar one axis per segment;
`Leaderboard` re-orders through GSAP Flip on sort; `SafetyCard` tilts to the pointer.

Two fallbacks are load-bearing and must keep working:

- **`prefers-reduced-motion: reduce`** — no Lenis, no pins, no reveals. The page collapses
  to a fully readable static document and `Dimensions` renders already assembled.
- **No WebGL** — `webglAvailable()` in `src/lib/preload.ts` gates the three.js scenes, and
  `SceneBoundary` catches a failed lazy chunk so a rejected import can never take the page
  down with it. The hero (`three/ProvingBench`) and the audience scene
  (`three/FloatingIslands`) are both lazy-loaded and both degrade without breaking layout.

The Rollup `manualChunks` function in `vite.config.ts` splits `three`, `motion`, and
`vendor` deliberately — the comments there explain why the object form was wrong. Keep the
three.js bundle out of the entry chunk.

## Sample data

Every score on the page belongs to an anonymized specimen (`Specimen A…H`) and carries a
`SAMPLE` stamp. This is a project rule, not a placeholder convenience: no fabricated
statistics are ever attached to real model names. Swap in real rows only when real harness
runs publish — the shape lives in `src/lib/data.ts` (`DIMENSIONS`, `SPECIMENS`), which is
also the working draft of the published Safety Card schema.

## Copy bans

No em dashes in copy · no gradient text · no emoji icons · no centered hero · no identical
card grids · no fabricated stats or fake logos · no "scroll to explore" · no custom
cursors · no purple/blue AI gradient wash · grade colors never in chrome.
