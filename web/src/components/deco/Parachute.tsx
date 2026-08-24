import { useEffect, useRef } from "react";
import { gsap, prefersReduced } from "@/lib/anim";

/* ------------------------------------------------------------------ */
/*  The specimen drop.                                                 */
/*  A crate under canopy that rides the whole document: it sweeps      */
/*  left to right, back right to left, then left to right again as     */
/*  you scroll, banking into each turn and descending as it goes.      */
/*  Ink linework, so it turns cream over the dark closing bands.       */
/* ------------------------------------------------------------------ */

const SWEEPS = 3; /* L->R, R->L, L->R across the full page */
const BANK = 7; /* degrees it leans into a turn */
const EDGE_DESK = 28; /* keeps it off the viewport edges */
const EDGE_MOB = 10;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/* where each suspension line leaves the skirt, and which cascade it feeds */
const LINES: [number, number, number][] = [
  /* skirtX, skirtY, cascadeIndex */
  [12, 60, 0],
  [20, 66, 0],
  [32, 67, 0],
  [44, 68, 1],
  [56, 68, 1],
  [66, 68, 1],
  [76, 68, 2],
  [88, 67, 2],
  [100, 67, 2],
  [112, 66, 3],
  [120, 60, 3],
];
const CASCADE = [42, 55, 77, 90];

export default function Parachute() {
  const wrap = useRef<HTMLDivElement>(null);
  const bank = useRef<HTMLDivElement>(null);
  const sway = useRef<SVGSVGElement>(null);
  const canopy = useRef<SVGGElement>(null);
  const tag = useRef<SVGGElement>(null);
  const streamer = useRef<SVGGElement>(null);
  const lamp = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (prefersReduced() || !wrap.current || !bank.current) return;
    const el = wrap.current;

    /* ---- the flight path, driven by scroll depth ---- */
    const toX = gsap.quickTo(el, "x", { duration: 0.9, ease: "power2.out" });
    const toY = gsap.quickTo(el, "y", { duration: 1.15, ease: "power2.out" });
    const toO = gsap.quickTo(el, "opacity", { duration: 0.5, ease: "power2.out" });
    const toBank = gsap.quickTo(bank.current, "rotation", {
      duration: 1.3,
      ease: "power2.out",
    });

    const fly = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp01(window.scrollY / max) : 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const edge = vw < 640 ? EDGE_MOB : EDGE_DESK;
      const span = Math.max(0, vw - el.offsetWidth - edge * 2);
      /* a smaller screen gets a lighter passenger */
      const peak = vw < 640 ? 0.3 : vw < 1280 ? 0.35 : 0.4;

      /* serpentine: cosine gives a clean turn at each wall */
      const xn = 0.5 - 0.5 * Math.cos(p * SWEEPS * Math.PI);
      /* and it rides up and down as it crosses */
      const yn = 0.24 + 0.26 * Math.sin(p * 5 * Math.PI + 0.6);

      toX(edge + xn * span);
      toY(yn * vh);
      /* lean into whichever way it is currently travelling */
      toBank(Math.sin(p * SWEEPS * Math.PI) * BANK);
      /* let the hero land clean before it drifts in */
      toO(clamp01((p - 0.015) / 0.045) * peak);
    };

    fly();
    window.addEventListener("scroll", fly, { passive: true });
    window.addEventListener("resize", fly);

    /* ---- secondary motion, each on its own clock ---- */
    const ctx = gsap.context(() => {
      gsap.to(sway.current, {
        rotation: 4.5,
        transformOrigin: "50% 4%",
        duration: 3.1,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        startAt: { rotation: -4.5 },
      });
      /* a real canopy breathes as it takes air */
      gsap.to(canopy.current, {
        scaleX: 1.035,
        scaleY: 0.975,
        transformOrigin: "50% 24%",
        duration: 2.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(tag.current, {
        rotation: 13,
        transformOrigin: "50% 0%",
        duration: 1.25,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        startAt: { rotation: -13 },
      });
      gsap.to(streamer.current, {
        rotation: 7,
        skewX: 5,
        transformOrigin: "0% 0%",
        duration: 1.45,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        startAt: { rotation: -6 },
      });
      gsap.to(lamp.current, {
        opacity: 0.15,
        duration: 0.55,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
        repeatDelay: 0.9,
      });
    }, el);

    return () => {
      window.removeEventListener("scroll", fly);
      window.removeEventListener("resize", fly);
      ctx.revert();
    };
  }, []);

  /* a fixed decorative element that cannot drift has no reason to exist */
  if (prefersReduced()) return null;

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className="drifter pointer-events-none fixed top-0 left-0 z-[6] w-[74px] opacity-0 will-change-transform sm:w-[104px] lg:w-[126px] xl:w-[152px]"
    >
      <div ref={bank}>
        {/* the box has to clear the streamer and the tag, or the load crops */}
        <svg ref={sway} viewBox="0 -8 132 244" fill="none" className="w-full">
          {/* ---------------- canopy ---------------- */}
          <g ref={canopy}>
            <path
              d="M10 62 C10 24 38 8 66 8 C94 8 122 24 122 62
                 A10 10 0 0 1 104 66 A9 9 0 0 1 88 65 A9 9 0 0 1 72 66
                 A9 9 0 0 1 56 65 A9 9 0 0 1 40 66 A10 10 0 0 1 10 62 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="var(--color-paper-2)"
            />

            {/* marked panels: a drop-test canopy is read from the ground */}
            <path
              d="M34 15 C40 34 41 50 39 65 L57 64 C60 48 60 30 56 10 C48 11 41 12 34 15 Z"
              fill="var(--color-warn-bright)"
              fillOpacity="0.2"
              stroke="var(--color-warn)"
              strokeOpacity="0.4"
              strokeWidth="0.9"
            />
            <path
              d="M56 10 C60 30 60 48 57 64 L72 65 C74 46 73 28 68 9 C64 8.5 60 9 56 10 Z"
              fill="var(--color-cobalt)"
              fillOpacity="0.26"
              stroke="var(--color-cobalt)"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
            <path
              d="M98 15 C92 34 91 50 93 65 L72 65 C74 46 73 28 68 9 C79 10 91 12 98 15 Z"
              fill="var(--color-teal-bright)"
              fillOpacity="0.18"
              stroke="var(--color-teal)"
              strokeOpacity="0.4"
              strokeWidth="0.9"
            />

            {/* apex vent, capped, with crown lines radiating off it */}
            <ellipse
              cx="66"
              cy="8.5"
              rx="7"
              ry="2.6"
              stroke="currentColor"
              strokeOpacity="0.6"
              strokeWidth="1"
              fill="var(--color-paper-2)"
            />
            <path d="M59 8.5 Q66 3.5 73 8.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
            <g stroke="currentColor" strokeOpacity="0.3" strokeWidth="0.8">
              <line x1="59" y1="10" x2="54" y2="13" />
              <line x1="73" y1="10" x2="78" y2="13" />
              <line x1="66" y1="11" x2="66" y2="15" />
            </g>

            {/* gore seams and load tapes */}
            <g stroke="currentColor" strokeOpacity="0.38" strokeWidth="1">
              <path d="M13 50 C21 47 27 55 28 65" />
              <path d="M17 38 C25 40 30 52 30 65" />
              <path d="M23 22 C31 38 34 52 33 65" />
              <path d="M34 15 C40 34 41 50 39 65" />
              <path d="M98 15 C92 34 91 50 93 65" />
              <path d="M109 22 C101 38 98 52 99 65" />
              <path d="M115 38 C107 40 102 52 102 65" />
              <path d="M119 50 C111 47 105 55 104 65" />
            </g>

            {/* reinforced hem */}
            <path
              d="M12 64 A9 9 0 0 0 28 67 A8 8 0 0 0 44 68 A8 8 0 0 0 60 68
                 A8 8 0 0 0 76 68 A8 8 0 0 0 92 67 A9 9 0 0 0 120 64"
              stroke="currentColor"
              strokeOpacity="0.3"
              strokeWidth="1"
            />

            {/* the institute mark, stencilled on the skin */}
            <g stroke="var(--color-cobalt)" strokeOpacity="0.5" strokeWidth="0.9" fill="none">
              <polygon points="86,36 92,39.5 92,46.5 86,50 80,46.5 80,39.5" />
              <line x1="83" y1="43" x2="89" y2="43" />
              <line x1="86" y1="40" x2="86" y2="46" />
            </g>
          </g>

          {/* ---------------- rigging ---------------- */}
          {/* attachment loops where every line meets the skirt */}
          <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.8" fill="var(--color-paper-2)">
            {LINES.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
            ))}
          </g>
          <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.85">
            {LINES.map(([x, y, c]) => (
              <line key={`l${x}`} x1={x} y1={y} x2={CASCADE[c]} y2="102" />
            ))}
          </g>
          <g stroke="currentColor" strokeOpacity="0.6" strokeWidth="1">
            {CASCADE.map((x) => (
              <line key={x} x1={x} y1="102" x2="66" y2="126" />
            ))}
          </g>

          {/* riser ring, then the spreader bar that holds the load square */}
          <circle cx="66" cy="129" r="3.4" stroke="var(--color-cobalt)" strokeWidth="1.4" fill="var(--color-paper-2)" />
          <g stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.1">
            <line x1="66" y1="132" x2="52" y2="141" />
            <line x1="66" y1="132" x2="80" y2="141" />
          </g>
          <rect
            x="44"
            y="141"
            width="44"
            height="4.5"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="var(--color-paper-2)"
          />
          <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="1">
            <line x1="50" y1="145.5" x2="50" y2="150" />
            <line x1="82" y1="145.5" x2="82" y2="150" />
          </g>

          {/* ---------------- the specimen crate ---------------- */}
          <g transform="translate(46 150)">
            <rect width="40" height="32" stroke="currentColor" strokeWidth="1.5" fill="var(--color-paper-2)" />
            <g stroke="currentColor" strokeOpacity="0.26" strokeWidth="1">
              <line x1="0" y1="10" x2="40" y2="10" />
              <line x1="0" y1="22" x2="40" y2="22" />
              <line x1="0" y1="0" x2="40" y2="32" />
              <line x1="40" y1="0" x2="0" y2="32" />
            </g>
            {/* cargo webbing, running over the box to the spreader bar */}
            <g stroke="currentColor" strokeOpacity="0.62" strokeWidth="1.1">
              <line x1="4" y1="0" x2="4" y2="32" />
              <line x1="7.5" y1="0" x2="7.5" y2="32" />
              <line x1="32.5" y1="0" x2="32.5" y2="32" />
              <line x1="36" y1="0" x2="36" y2="32" />
            </g>
            <rect
              x="2.5"
              y="14"
              width="6.5"
              height="5"
              stroke="currentColor"
              strokeOpacity="0.7"
              strokeWidth="1"
              fill="var(--color-paper-2)"
            />
            <rect
              x="31"
              y="14"
              width="6.5"
              height="5"
              stroke="currentColor"
              strokeOpacity="0.7"
              strokeWidth="1"
              fill="var(--color-paper-2)"
            />
            {/* corner irons */}
            <g stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.5">
              <path d="M0 6 L0 0 L6 0" />
              <path d="M34 0 L40 0 L40 6" />
              <path d="M40 26 L40 32 L34 32" />
              <path d="M6 32 L0 32 L0 26" />
            </g>
            {/* crosshair seal */}
            <g stroke="var(--color-cobalt)" strokeWidth="1.3">
              <line x1="20" y1="12" x2="20" y2="20" />
              <line x1="16" y1="16" x2="24" y2="16" />
              <circle cx="20" cy="16" r="5.4" strokeOpacity="0.6" fill="none" />
            </g>
            {/* latches on the lid seam */}
            <g stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.1" fill="var(--color-paper-2)">
              <rect x="13" y="8" width="4" height="4" />
              <rect x="23" y="8" width="4" height="4" />
            </g>
            {/* serial stencil */}
            <g stroke="currentColor" strokeOpacity="0.42" strokeWidth="1.1">
              <line x1="13" y1="26" x2="17" y2="26" />
              <line x1="19" y1="26" x2="21" y2="26" />
              <line x1="23" y1="26" x2="27" y2="26" />
            </g>
            {/* telemetry pod with its beacon */}
            <rect x="-8" y="9" width="7" height="11" stroke="currentColor" strokeWidth="1.2" fill="var(--color-paper-2)" />
            <circle ref={lamp} cx="-4.5" cy="12.5" r="1.7" fill="var(--color-flag)" />
            <line x1="-8" y1="16.5" x2="-1" y2="16.5" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.9" />
            {/* antenna whip */}
            <path d="M41 2 C43 -3 44 -6 46 -9" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
            <circle cx="46.4" cy="-9.6" r="1.5" fill="var(--color-cobalt)" />

            {/* crush pad: what a drop test lands on */}
            <rect x="1" y="32" width="38" height="7" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.1" />
            <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <line key={i} x1={3 + i * 4.6} y1="39" x2={6 + i * 4.6} y2="32" />
              ))}
            </g>

            {/* the hanging manifest tag */}
            <g ref={tag} transform="translate(30 39)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.9" />
              <rect x="-7" y="8" width="14" height="10" stroke="currentColor" strokeWidth="1.1" fill="var(--color-paper-2)" />
              <g stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.9">
                <line x1="-4" y1="11.5" x2="4" y2="11.5" />
                <line x1="-4" y1="14.5" x2="1" y2="14.5" />
              </g>
            </g>
            {/* trailing streamer */}
            <g ref={streamer} transform="translate(6 39)">
              <path
                d="M0 0 C-4 7 2 11 -3 18 C-6 22 -1 25 -4 29"
                stroke="var(--color-cobalt)"
                strokeOpacity="0.55"
                strokeWidth="1.4"
                fill="none"
              />
            </g>
          </g>

          <text
            x="66"
            y="228"
            textAnchor="middle"
            style={{ font: "500 6.2px var(--font-mono)", letterSpacing: "0.16em" }}
            fill="currentColor"
            fillOpacity="0.6"
          >
            SPECIMEN · UNDER TEST
          </text>
        </svg>
      </div>
    </div>
  );
}
