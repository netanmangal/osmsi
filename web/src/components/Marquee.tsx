import { useEffect, useRef } from "react";
import { MARQUEE_FAMILIES, MARQUEE_SUITES } from "@/lib/data";
import { gsap, prefersReduced } from "@/lib/anim";

function Row({
  items,
  direction,
  className,
  speed,
}: {
  items: string[];
  direction: 1 | -1;
  className: string;
  speed: number;
}) {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced() || !track.current) return;
    const tween = gsap.to(track.current, {
      xPercent: -50 * direction,
      duration: speed,
      ease: "none",
      repeat: -1,
      ...(direction === -1 && { xPercent: 0, startAt: { xPercent: -50 } }),
    });
    return () => {
      tween.kill();
    };
  }, [direction, speed]);

  const HUES = ["#2036c8", "#c98a1f", "#d95c40", "#2f8f8a", "#3f9e6b", "#a05893"];
  const strip = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={item + (hidden ? "-b" : "")} className={className}>
          {item}
          <span
            className="mx-[0.85em] inline-block translate-y-[-0.08em] text-[0.5em]"
            style={{ color: HUES[i % HUES.length] }}
          >
            ◆
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee-mask overflow-hidden">
      <div ref={track} className="flex w-max">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  );
}

/** Dual-direction marquee: model families in scope (facts, no scores). */
export default function Marquee() {
  return (
    <section aria-label="Model families in scope" className="border-y border-(--line) py-7">
      <p className="mono-label mb-5 px-(--pad-x) text-[0.62rem]">
        in scope · continuously indexed
      </p>
      <Row
        items={MARQUEE_FAMILIES}
        direction={1}
        speed={34}
        className="font-display text-ink text-[clamp(1.7rem,3.6vw,3rem)] font-[560] tracking-tight whitespace-nowrap"
      />
      <div className="h-4" />
      <Row
        items={MARQUEE_SUITES}
        direction={-1}
        speed={46}
        className="text-ink-mute font-mono text-[0.8rem] font-medium tracking-[0.2em] whitespace-nowrap"
      />
    </section>
  );
}
