import { lazy, Suspense } from "react";
import SectionHead from "@/components/SectionHead";
import { REPO_URL } from "@/lib/data";
import { importFloatingIslands } from "@/lib/preload";
import SceneBoundary from "@/components/SceneBoundary";

const FloatingIslands = lazy(importFloatingIslands);

const PATHS = [
  {
    tag: "researchers",
    hue: "#2036c8",
    line: "Bring a suite.",
    body: "New risks need new probes. The harness is modular by design: a suite is a container, a scoring spec and a manifest. Deception probes and constitutional-alignment audits are next in queue.",
    cta: "Read the suite spec",
  },
  {
    tag: "developers",
    hue: "#8f6410",
    line: "Gate a deploy.",
    body: "Pull dimension scores over the API, pin a minimum band in CI, and block the fine-tune that quietly regressed injection resistance from reaching production.",
    cta: "See the schema",
  },
  {
    tag: "policymakers",
    hue: "#256e47",
    line: "Cite a standard.",
    body: "Every figure traces to a public pipeline, a pinned harness version and a diffable methodology. Reference numbers that survive an audit, because they were built for one.",
    cta: "Read the methodology",
  },
];

export default function Contribute() {
  return (
    <section id="contribute" className="scroll-mt-20 px-(--pad-x) py-(--section-gap)">
      <SectionHead
        clause="06 · contribute"
        title="Built to be forked."
        lead="The framework, the pipelines and the scoring specs ship under a permissive license. The index gets stronger every time someone disagrees with it precisely."
      />

      {/* the ecosystem, as floating drafting dioramas: click one to center it */}
      <div data-reveal="" className="mt-8">
        <SceneBoundary>
          <Suspense fallback={<div className="h-[340px] sm:h-[384px] lg:h-[454px]" />}>
            <FloatingIslands />
          </Suspense>
        </SceneBoundary>
      </div>

      <div className="mt-10">
        {PATHS.map(({ tag, hue, line, body, cta }, i) => (
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
              href={REPO_URL}
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
