import { lazy, Suspense, useState } from "react";
import SectionHead from "@/components/SectionHead";
import { REPO_URL } from "@/lib/data";
import { importFloatingIslands, webglAvailable } from "@/lib/preload";
import SceneBoundary from "@/components/SceneBoundary";

const FloatingIslands = lazy(importFloatingIslands);

const PATHS = [
  {
    tag: "researchers",
    hue: "#2036c8",
    line: "Bring a suite.",
    body: "Contribute versioned probes with a threat model, scoring method, and documented limits. Harmful-capability and weight-access interpretability benchmarks need specialist contributions.",
    cta: "Read the suite spec",
    path: "/tree/main/suites",
  },
  {
    tag: "developers",
    hue: "#8f6410",
    line: "Gate a deploy.",
    body: "Read validated cards with the Python SDK, compare compatible runs, and add checks for the dimensions your deployment depends on.",
    cta: "See the schema",
    path: "/tree/main/sdk/python",
  },
  {
    tag: "policymakers",
    hue: "#256e47",
    line: "Cite a standard.",
    body: "Every figure traces to a public pipeline, a pinned harness version and a diffable methodology. Reference numbers that survive an audit, because they were built for one.",
    cta: "Read the methodology",
    path: "/blob/main/docs/methodology.md",
  },
];

export default function Contribute() {
  const [canRender] = useState(() => typeof window !== "undefined" && webglAvailable());
  return (
    <section id="contribute" className="scroll-mt-20 px-(--pad-x) py-(--section-gap)">
      <SectionHead
        clause="07 · contribute"
        title="Built to be forked."
        lead="The framework, the pipelines and the scoring specs ship under a permissive license. The index gets stronger every time someone disagrees with it precisely."
      />

      {/* the ecosystem, as floating drafting dioramas: click one to center it */}
      {canRender && <div data-reveal="" className="mt-8">
        <SceneBoundary>
          <Suspense fallback={<div className="h-[340px] sm:h-[384px] lg:h-[454px]" />}>
            <FloatingIslands />
          </Suspense>
        </SceneBoundary>
      </div>}

      <div className="mt-10">
        {PATHS.map(({ tag, hue, line, body, cta, path }, i) => (
          <article
            key={tag}
            data-reveal=""
            data-delay={String(i * 0.06)}
            className="grid gap-4 border-b border-(--line) py-10 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.35fr)_auto] md:items-baseline md:gap-8"
          >
            <p className="mono-label" style={{ color: hue }}>
              {tag}
            </p>
            <h3 className="font-display text-[clamp(1.5rem,2.2vw,2rem)] font-[580]">{line}</h3>
            <p className="text-ink-dim max-w-[52ch] text-[0.99rem] leading-[1.62]">{body}</p>
            <a
              href={REPO_URL + path}
              target="_blank"
              rel="noreferrer"
              className="mono-label hover:text-cobalt group text-ink whitespace-nowrap no-underline transition-colors"
            >
              {cta}{" "}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                ↗
              </span>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
