import { useEffect, useRef } from "react";
import { DIMENSIONS } from "@/lib/data";
import { radarPoint, radarPoints } from "@/components/RadarSVG";
import SectionHead from "@/components/SectionHead";
import { gsap, ScrollTrigger } from "@/lib/anim";

const SIZE = 560;
const C = SIZE / 2;
const R = SIZE / 2 - 56;

/**
 * The instrument unfolds: six axes assemble one by one while the matching
 * dimension row engages. Pinned + scrubbed + snapped on desktop (house
 * grammar); a still, fully assembled instrument on mobile/reduced-motion.
 */
export default function Dimensions() {
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!stage.current) return;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const svg = svgRef.current!;
      const rows = Array.from(listRef.current!.querySelectorAll<HTMLLIElement>("li"));
      const axes = Array.from(svg.querySelectorAll<SVGGElement>("[data-axis]"));
      const poly = svg.querySelector<SVGPolygonElement>("[data-poly]")!;
      const vals = { a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0 };

      const draw = () => {
        poly.setAttribute(
          "points",
          radarPoints(C, C, R, [vals.a0, vals.a1, vals.a2, vals.a3, vals.a4, vals.a5])
        );
      };
      draw();

      let current = -1;
      const setActive = (idx: number) => {
        if (idx === current) return;
        current = idx;
        rows.forEach((row, i) => row.classList.toggle("is-active", i === idx));
        if (counterRef.current)
          counterRef.current.textContent =
            idx < 0 ? "00" : String(idx + 1).padStart(2, "0");
      };

      gsap.set(axes, { opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: stage.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.75,
          snap: { snapTo: 1 / 6, duration: { min: 0.15, max: 0.45 }, ease: "power2.inOut" },
          onUpdate: (st) => setActive(Math.min(5, Math.floor(st.progress * 6))),
        },
      });

      DIMENSIONS.forEach((_, i) => {
        tl.to(axes[i], { opacity: 1, duration: 0.22 }, i + 0.02);
        tl.to(vals, { [`a${i}`]: 100, duration: 0.72, onUpdate: draw }, i + 0.08);
      });
      tl.to({}, { duration: 0.18 }); // settle beat after the last axis

      return () => setActive(-1);
    });

    /* phones and tablets: no pin (it fights touch scrolling), but the
       instrument still assembles, one axis per row as the row arrives */
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      const svg = svgRef.current!;
      const rows = Array.from(listRef.current!.querySelectorAll<HTMLLIElement>("li"));
      const axes = Array.from(svg.querySelectorAll<SVGGElement>("[data-axis]"));
      const poly = svg.querySelector<SVGPolygonElement>("[data-poly]")!;
      const vals = { a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0 };
      const draw = () => {
        poly.setAttribute(
          "points",
          radarPoints(C, C, R, [vals.a0, vals.a1, vals.a2, vals.a3, vals.a4, vals.a5])
        );
      };
      draw();
      gsap.set(axes, { opacity: 0 });

      const triggers = rows.map((row, i) =>
        ScrollTrigger.create({
          trigger: row,
          start: "top 82%",
          once: true,
          onEnter: () => {
            row.classList.add("is-active");
            gsap.to(axes[i], { opacity: 1, duration: 0.4, ease: "power2.out" });
            gsap.to(vals, {
              [`a${i}`]: 100,
              duration: 0.8,
              ease: "power2.out",
              onUpdate: draw,
            });
            if (counterRef.current)
              counterRef.current.textContent = String(i + 1).padStart(2, "0");
          },
        })
      );
      return () => triggers.forEach((t) => t.kill());
    });

    /* reduced motion: everything assembled, everything readable */
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const svg = svgRef.current!;
      const poly = svg.querySelector<SVGPolygonElement>("[data-poly]")!;
      gsap.set(svg.querySelectorAll("[data-axis]"), { opacity: 1 });
      poly.setAttribute("points", radarPoints(C, C, R, Array(6).fill(100)));
      listRef.current!.querySelectorAll("li").forEach((row) => row.classList.add("is-active"));
      if (counterRef.current) counterRef.current.textContent = "06";
    });

    return () => mm.revert();
  }, []);

  return (
    <section id="dimensions" className="scroll-mt-20 pt-(--section-gap)">
      <div className="px-(--pad-x)">
        <SectionHead
          clause="02 · six dimensions"
          title="Six dimensions. One profile."
          lead="A single score hides more than it shows, so OSMSI never prints one. Every model is charted on the full hexagon, each axis with its own suite, its own confidence interval and its own failure exhibits."
        />
      </div>

      <div ref={stage} className="relative mt-10 lg:h-[620vh]">
        <div className="top-0 flex items-start px-(--pad-x) py-10 lg:sticky lg:h-svh lg:min-h-svh lg:items-center lg:py-0">
          <div className="grid w-full items-start gap-8 sm:gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center">
            {/* the assembling instrument */}
            {/* small enough to leave the rows room to read under it */}
            <div className="bg-paper sticky top-16 z-[2] w-full self-start pt-3 pb-4 lg:relative lg:top-auto lg:self-auto lg:bg-transparent lg:pt-0 lg:pb-0">
              <p className="mono-label mb-1 lg:absolute lg:-top-2 lg:left-0 lg:mb-0">
                axis <span ref={counterRef} className="tnum text-cobalt">00</span>
                <span className="tnum"> / 06</span>
              </p>
              {/* the backdrop spans the column; only the drawing is capped */}
              <div className="mx-auto w-full max-w-[208px] sm:max-w-[280px] lg:max-w-125">
                <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" aria-hidden="true">
                <g fill="none" stroke="var(--color-ink)">
                  {[25, 50, 75, 100].map((p, i) => (
                    <polygon
                      key={p}
                      points={radarPoints(C, C, R, Array(6).fill(p))}
                      strokeWidth="1"
                      opacity={i === 3 ? 0.3 : 0.11}
                    />
                  ))}
                </g>
                {DIMENSIONS.map((d, i) => {
                  const [x2, y2] = radarPoint(C, C, R, i, 100);
                  const [lx, ly] = radarPoint(C, C, R + 34, i, 100);
                  return (
                    <g key={d.key} data-axis>
                      <line
                        x1={C}
                        y1={C}
                        x2={x2}
                        y2={y2}
                        stroke="var(--color-ink)"
                        strokeWidth="1"
                        opacity="0.32"
                      />
                      <g stroke={d.hue.bright} strokeWidth="1.5">
                        <line x1={x2 - 7} y1={y2} x2={x2 + 7} y2={y2} />
                        <line x1={x2} y1={y2 - 7} x2={x2} y2={y2 + 7} />
                      </g>
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={d.hue.ink}
                        style={{ font: "500 13px var(--font-mono)", letterSpacing: "0.1em" }}
                      >
                        {d.abbr}
                      </text>
                    </g>
                  );
                })}
                <polygon
                  data-poly
                  points=""
                  fill="color-mix(in srgb, var(--color-cobalt) 16%, transparent)"
                  stroke="var(--color-cobalt)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <circle cx={C} cy={C} r="3" fill="var(--color-ink)" />
                </svg>
              </div>
            </div>

            {/* the six clauses */}
            <ol ref={listRef} className="border-t border-(--line)">
              {DIMENSIONS.map((d) => (
                <li
                  key={d.key}
                  className="dim-row border-b border-(--line)"
                  style={{ "--dim-c": d.hue.ink } as React.CSSProperties}
                >
                  <div className="flex items-baseline gap-5 py-4 lg:py-[1.15rem]">
                    <span className="tnum dim-index font-mono text-[0.8rem] font-medium">
                      {d.index}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[clamp(1.25rem,1.6vw,1.6rem)] font-[560]">
                        {d.name}
                      </h3>
                      <div className="dim-body">
                        <div className="overflow-hidden">
                          <p className="text-ink-dim mt-2.5 max-w-[46ch] text-[0.99rem] leading-[1.6]">
                            {d.blurb}
                          </p>
                          <p className="mono-label mt-3 pb-1 text-[0.62rem]">{d.probe}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
