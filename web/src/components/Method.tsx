import { useEffect, useRef } from "react";
import { PIPELINE } from "@/lib/data";
import SectionHead from "@/components/SectionHead";
import BandScallop from "@/components/deco/BandScallop";
import RevisionCloud from "@/components/deco/RevisionCloud";
import { gsap, prefersReduced } from "@/lib/anim";

export default function Method() {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced() || !lineRef.current) return;
    const tween = gsap.fromTo(
      lineRef.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: lineRef.current,
          start: "top 78%",
          end: "top 30%",
          scrub: 0.6,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <section id="method" data-band="blueprint" className="band-blueprint relative scroll-mt-20">
      <BandScallop className="text-blueprint" />
      <RevisionCloud className="absolute top-24 right-[7%] w-52 opacity-90" drift={54} duration={21} tone="cobalt" tag="2" />
      <RevisionCloud className="absolute bottom-24 left-[3%] w-36 opacity-75" drift={-40} duration={16} delay={1.2} tone="green" />
      <div className="relative px-(--pad-x) py-(--section-gap)">
        <SectionHead
          clause="03 · the method"
          title={
            <>
              Reproducible, <em className="text-cobalt">or it doesn't count.</em>
            </>
          }
          lead="Every published score links to model and harness revisions, versioned probes, seeds, and request budgets. Reruns can vary on hosted backends; the manifest records what was controlled."
        />

        <div className="relative mt-20">
          <div
            ref={lineRef}
            aria-hidden="true"
            className="bg-cobalt absolute top-[3px] left-0 hidden h-px w-full origin-left lg:block"
          />
          <ol className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((step, i) => (
              <li key={step.index} data-reveal="" data-delay={String(i * 0.07)}>
                <div
                  className="mb-6 hidden size-[7px] rounded-full lg:block"
                  style={{ background: step.hue.bright }}
                />
                <p className="mono-label">
                  <span className="tnum" style={{ color: step.hue.ink }}>
                    {step.index}
                  </span>
                  <span className="tnum text-ink-mute"> /05</span>
                </p>
                <h3 className="font-display mt-3 text-[1.45rem] font-[580]">{step.name}</h3>
                <p className="text-ink-dim mt-3 max-w-[30ch] text-[0.96rem] leading-[1.6]">
                  {step.blurb}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* the pin strip: what "addressable" means, concretely */}
        <div
          data-reveal=""
          className="bg-ink text-cream mt-20 flex max-w-[880px] flex-wrap items-center gap-x-6 gap-y-2 rounded-lg px-6 py-4 font-mono text-[0.82rem]"
        >
          <span className="text-cream/55 select-none">$</span>
          <span>
            osmsi run --provider demo --output runs/demo --seed 41
          </span>
          <span className="text-cream/55">→</span>
          <span className="tnum text-cream/85">validated sample bundle</span>
        </div>
      </div>
    </section>
  );
}
