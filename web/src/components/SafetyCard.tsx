import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_SPECIMENS, DIMENSIONS, SPECIMENS } from "@/lib/data";
import RadarSVG from "@/components/RadarSVG";
import SectionHead from "@/components/SectionHead";
import { Badge, gradeVariant } from "@/components/ui/badge";
import { gsap, prefersReduced } from "@/lib/anim";
import { cn } from "@/lib/utils";

export default function SafetyCard() {
  const [activeId, setActiveId] = useState<string>(CARD_SPECIMENS[0]);
  const cardRef = useRef<HTMLDivElement>(null);
  const specimen = SPECIMENS.find((s) => s.id === activeId)!;

  /* crossfade card content when the specimen changes */
  const swap = useCallback((id: string) => {
    if (id === activeId) return;
    if (prefersReduced() || !cardRef.current) {
      setActiveId(id);
      return;
    }
    gsap.to(cardRef.current, {
      opacity: 0,
      y: 10,
      duration: 0.22,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => {
        setActiveId(id);
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.38, ease: "power3.out", overwrite: true }
        );
      },
    });
  }, [activeId]);

  /* pointer tilt: the card is a physical sheet on the desk */
  useEffect(() => {
    const el = cardRef.current?.parentElement;
    if (!el || prefersReduced()) return;
    const qx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
    const qy = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 1100 });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      qx(((e.clientY - r.top) / r.height - 0.5) * -5);
      qy(((e.clientX - r.left) / r.width - 0.5) * 5);
    };
    const leave = () => (qx(0), qy(0));
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <section id="cards" className="scroll-mt-20 px-(--pad-x) py-(--section-gap)">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
        <div className="min-w-0">
          <SectionHead
            clause="04 · safety cards"
            title="Every model leaves with a card."
            lead="Grades with confidence intervals, flags with evidence, and the exact command that reproduces all of it. The card is the unit of accountability."
          />

          <div data-reveal="" className="mt-10">
            <p className="mono-label mb-4">inspect a specimen</p>
            <div className="flex flex-wrap gap-3">
              {CARD_SPECIMENS.map((id) => {
                const s = SPECIMENS.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => swap(id)}
                    aria-pressed={activeId === id}
                    className={cn(
                      "press cursor-pointer rounded-lg border px-4 py-2.5 font-mono text-[0.74rem] font-medium tracking-[0.12em] uppercase",
                      activeId === id
                        ? "press-ink border-ink bg-cobalt text-paper"
                        : "press-wash text-ink border-(--line-strong) hover:border-ink"
                    )}
                  >
                    {s.name} · {s.params}
                  </button>
                );
              })}
            </div>
            <p className="text-ink-mute mt-8 max-w-[46ch] font-mono text-[0.72rem] leading-[1.7] tracking-[0.04em]">
              Specimen figures illustrate the card format. Real model names appear only with real
              harness runs; the instrument never prints a number it did not measure.
            </p>
          </div>
        </div>

        {/* the artifact */}
        <div data-reveal="" className="min-w-0 lg:pt-6" style={{ perspective: "1100px" }}>
          <div className="will-change-transform">
            <div
              ref={cardRef}
              className="bg-paper-2 press-ink relative rounded-xl border border-(--line-strong) p-5 sm:p-9"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="mono-label">
                  safety card · <span className="tnum">{specimen.hash}</span>
                </p>
                <Badge variant="stamp">specimen · sample</Badge>
              </div>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h3 className="font-display text-[2.1rem] leading-none font-[600]">
                    {specimen.name}
                  </h3>
                  <p className="mono-label mt-3">
                    {specimen.params} · {specimen.arch} · {specimen.license}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="mono-label">band</span>
                  <span className="font-display text-cobalt text-[2.6rem] leading-none font-[620]">
                    {specimen.band}
                  </span>
                </div>
              </div>

              <div className="mt-8 grid gap-8 sm:grid-cols-[minmax(0,1fr)_190px]">
                <ul className="border-t border-(--line)">
                  {DIMENSIONS.map((d) => {
                    const s = specimen.scores[d.key];
                    return (
                      <li
                        key={d.key}
                        className="grid grid-cols-[34px_minmax(0,1fr)_66px_40px] items-center gap-2 border-b border-(--line) py-2.5 sm:grid-cols-[44px_minmax(0,1fr)_74px_44px] sm:gap-3"
                      >
                        <span
                          className="font-mono text-[0.62rem] font-medium tracking-[0.22em] uppercase"
                          style={{ color: d.hue.ink }}
                        >
                          {d.abbr}
                        </span>
                        <div className="bg-ink/8 relative h-[5px] overflow-hidden rounded-full">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{ width: `${s.v}%`, background: d.hue.bright }}
                          />
                        </div>
                        <span className="tnum text-ink-dim text-right font-mono text-[0.78rem]">
                          {s.v}
                          <span className="text-ink-mute">±{s.ci}</span>
                        </span>
                        <span className="justify-self-end">
                          <Badge variant={gradeVariant(s.grade)}>{s.grade}</Badge>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mx-auto sm:mx-0">
                  <RadarSVG values={specimen.scores} size={190} />
                </div>
              </div>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mono-label text-flag mb-3">▲ flags</p>
                  <ul className="space-y-2">
                    {specimen.flags?.map((f) => (
                      <li key={f} className="text-ink-dim text-[0.92rem] leading-snug">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mono-label text-pass mb-3">+ strengths</p>
                  <ul className="space-y-2">
                    {specimen.strengths?.map((s) => (
                      <li key={s} className="text-ink-dim text-[0.92rem] leading-snug">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-ink text-cream mt-8 overflow-x-auto rounded-lg px-5 py-3.5 font-mono text-[0.78rem] whitespace-nowrap">
                <span className="text-cream/55 select-none">$ </span>
                osmsi run {specimen.id} --suites all --seed 41
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
