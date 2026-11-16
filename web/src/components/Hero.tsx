import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import RevisionCloud from "@/components/deco/RevisionCloud";
import { gsap, prefersReduced, scrollToHash } from "@/lib/anim";
import { importProvingBench, webglAvailable } from "@/lib/preload";
import SceneBoundary from "@/components/SceneBoundary";
import RadarSVG from "@/components/RadarSVG";
import { useResults } from "@/lib/results";

const ProvingBench = lazy(importProvingBench);

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const results = useResults();
  const [canRender] = useState(() => typeof window !== "undefined" && !prefersReduced() && webglAvailable());
  const hud = [
    { k: "dimensions", label: "dimensions", value: "06" },
    { k: "suites", label: "runnable axes", value: "06" },
    { k: "harness", label: "harness", value: "v0.1.0" },
    { k: "runs", label: "measured runs", value: results.status === "ready" ? String(results.runs.filter((run) => !run.card.sample).length) : "—" },
  ];

  /* Entrance choreography, fired when the preloader wipes away. */
  useEffect(() => {
    if (prefersReduced() || !root.current) return;
    const el = root.current;
    let enter: (() => void) | undefined;
    const ctx = gsap.context(() => {
      gsap.set("[data-hero-line] > span", { yPercent: 112 });
      gsap.set("[data-hero-fade]", { opacity: 0, y: 18 });
      gsap.set("[data-hero-stage]", { opacity: 0, scale: 0.965 });

      const play = () => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .to("[data-hero-line] > span", { yPercent: 0, duration: 1.05, stagger: 0.12 }, 0.05)
          .to("[data-hero-fade]", { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 }, 0.42)
          .to("[data-hero-stage]", { opacity: 1, scale: 1, duration: 1.3, ease: "power3.out" }, 0.3);
      };
      enter = play;
      window.addEventListener("osmsi:enter", play, { once: true });
    }, el);
    return () => {
      if (enter) window.removeEventListener("osmsi:enter", enter);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      id="top"
      aria-label="Introduction"
      className="relative flex min-h-svh flex-col justify-center overflow-hidden pt-20 pb-8"
    >
      <div className="grid items-center gap-8 px-(--pad-x) lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="relative z-(--z-content) max-w-[640px]">
          <h1 className="text-ink" style={{ fontSize: "var(--text-hero)" }}>
            <span data-hero-line className="block overflow-hidden pb-[0.08em]">
              <span className="block">Open weights.</span>
            </span>
            <span data-hero-line className="block overflow-hidden pb-[0.12em]">
              <span className="block">
                <em className="text-cobalt pr-1 font-[590]">Measured</em> safety.
              </span>
            </span>
          </h1>

          <p data-hero-fade className="text-ink-dim mt-5 max-w-[52ch] text-[1.05rem] leading-[1.62]">
            An open framework for measuring model safety across six dimensions.
            Run the pilot suites, inspect the evidence, and help build an index
            whose methods are as public as its results.
          </p>

          <div data-hero-fade className="mt-6 flex flex-wrap items-center gap-4">
            <ButtonLink
              href="#index"
              onClick={(e) => (e.preventDefault(), scrollToHash("#index"))}
            >
              Explore the index
            </ButtonLink>
            <ButtonLink
              variant="ghost"
              href="#method"
              onClick={(e) => (e.preventDefault(), scrollToHash("#method"))}
            >
              Read the method ↗
            </ButtonLink>
          </div>

          <dl
            data-hero-fade
            className="mt-10 grid max-w-[560px] grid-cols-2 border-t border-(--line) sm:grid-cols-4"
          >
            {hud.map(({ k, label, value }) => (
              <div
                key={k}
                className="border-r border-(--line) py-3 pr-4 even:border-r-0 first:pl-0 sm:px-4 sm:first:pl-0 sm:even:border-r sm:last:border-r-0"
              >
                <dt className="mono-label text-[0.62rem]">{label}</dt>
                <dd className="tnum text-ink mt-1 font-mono text-[0.95rem] font-medium">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div
          data-hero-stage
          className="relative mx-auto aspect-square w-full"
          style={{ maxWidth: "min(600px, 76svh, 100%)" }}
        >
          <RevisionCloud
            className="absolute top-[7%] -left-[9%] w-36 opacity-60"
            drift={38}
            duration={23}
            tag="1"
          />
          <RevisionCloud
            className="absolute -right-[7%] bottom-[9%] w-28 opacity-50"
            drift={-30}
            duration={17}
            delay={2}
            tone="gold"
          />
          {/* corner brackets: instrument viewport */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-(--z-hud)">
            {(["top-0 left-0", "top-0 right-0 rotate-90", "bottom-0 right-0 rotate-180", "bottom-0 left-0 -rotate-90"] as const).map(
              (pos) => (
                <span
                  key={pos}
                  className={`absolute ${pos} border-cobalt/55 size-5 border-t-[1.5px] border-l-[1.5px]`}
                />
              )
            )}
            <span className="mono-label absolute -top-1 left-8 text-[0.6rem]">
              open source model safety index
            </span>
            <span className="mono-label tnum absolute right-8 -bottom-1 text-[0.6rem]">
              six dimensions · open methodology
            </span>
          </div>

          {/* no WebGL means no bench, and the loader is told not to wait */}
          {canRender ? (
            <SceneBoundary
              onFail={() => window.dispatchEvent(new CustomEvent("osmsi:hero-ready"))}
            >
              <Suspense fallback={null}>
                <ProvingBench />
              </Suspense>
            </SceneBoundary>
          ) : <div className="flex h-full items-center justify-center p-8" aria-label="Static six-dimension instrument">
            <RadarSVG values={[null, null, null, null, null, null]} size={420} />
          </div>}
        </div>
      </div>
    </section>
  );
}
