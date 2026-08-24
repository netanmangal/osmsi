import { useEffect, useRef, useState } from "react";
import { DIMENSIONS } from "@/lib/data";
import { gsap, prefersReduced } from "@/lib/anim";

/* ------------------------------------------------------------------ */
/*  The inspection line: releases flow, scrutiny doesn't keep up.      */
/*  This is section 01's thesis drawn as a machine. Specimen crates    */
/*  ride the belt; the gantry only catches one in four; the rest sail  */
/*  through to deployment with no stamp on them.                       */
/* ------------------------------------------------------------------ */

const W = 1000;
const H = 250;
const BELT_Y = 186; /* top surface of the belt */
const CRATE_W = 56;
const CRATE_H = 46;
const N = 8; /* crates on the loop */
const START_X = -90;
const SPAN = W + 180; /* travel distance, start to fully off-screen */
const STATION_X = 542; /* where the scanner head sits */
const CYCLE = 19; /* seconds for one full lap */
const EVERY = 4; /* one crate in EVERY gets inspected */

/* lap phase at which a crate's centre sits under the scanner */
const STATION_PHASE = (STATION_X - CRATE_W / 2 - START_X) / SPAN;
/* the scanner fires each time an inspected crate arrives */
const FIRE_PERIOD = EVERY / N;
const FIRE_PHASE = ((STATION_PHASE % FIRE_PERIOD) + FIRE_PERIOD) % FIRE_PERIOD;

const SCAN_UP = 44;
const SCAN_DOWN = 118;
const TREAD = 26;
const ROLLER_R = 9;

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** one specimen crate: planked, corner-ironed, sealed in its own ink */
function Crate({ hue, inspected }: { hue: string; inspected: boolean }) {
  return (
    <g>
      <rect
        width={CRATE_W}
        height={CRATE_H}
        fill="var(--color-paper-2)"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
      <g stroke="var(--color-ink)" strokeOpacity="0.28" strokeWidth="1">
        <line x1="0" y1="15" x2={CRATE_W} y2="15" />
        <line x1="0" y1="31" x2={CRATE_W} y2="31" />
      </g>
      <g stroke="var(--color-ink)" strokeOpacity="0.85" strokeWidth="1.5" fill="none">
        <path d={`M0 8 L0 0 L8 0`} />
        <path d={`M${CRATE_W - 8} 0 L${CRATE_W} 0 L${CRATE_W} 8`} />
        <path d={`M${CRATE_W} ${CRATE_H - 8} L${CRATE_W} ${CRATE_H} L${CRATE_W - 8} ${CRATE_H}`} />
        <path d={`M8 ${CRATE_H} L0 ${CRATE_H} L0 ${CRATE_H - 8}`} />
      </g>
      {/* the specimen seal, in this crate's dimension ink */}
      <polygon
        points="28,12 37,17.5 37,28.5 28,34 19,28.5 19,17.5"
        fill={hue}
        fillOpacity="0.16"
        stroke={hue}
        strokeWidth="1.4"
      />
      <g stroke={hue} strokeWidth="1.4">
        <line x1="22.5" y1="23" x2="33.5" y2="23" />
        <line x1="28" y1="17.5" x2="28" y2="28.5" />
      </g>
      {/* the audit stamp, earned only under the gantry */}
      {inspected && (
        <g data-stamp opacity="0">
          <circle
            cx={CRATE_W - 9}
            cy="9"
            r="8.5"
            fill="var(--color-paper-2)"
            stroke="var(--color-pass)"
            strokeWidth="1.5"
          />
          <path
            d={`M${CRATE_W - 13} 9 l3 3.2 l5.4 -6.4`}
            fill="none"
            stroke="var(--color-pass)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </g>
  );
}

export default function InspectionLine() {
  const wrap = useRef<HTMLDivElement>(null);
  /* a 1000-wide elevation drawn at 335px is unreadable, so small screens
     get a crop centred on the gantry: the part that carries the argument */
  const [tight, setTight] = useState(false);
  const crates = useRef<(SVGGElement | null)[]>([]);
  const stamps = useRef<(SVGGElement | null)[]>([]);
  const treads = useRef<SVGGElement>(null);
  const rollers = useRef<(SVGGElement | null)[]>([]);
  const head = useRef<SVGGElement>(null);
  const beam = useRef<SVGGElement>(null);
  const sweep = useRef<SVGLineElement>(null);
  const lens = useRef<SVGCircleElement>(null);
  const trace = useRef<SVGPolylineElement>(null);
  const statusLamp = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setTight(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    /* the stamp lives inside its crate, so bind to it after mount:
       fading the crate group itself would fade the whole crate */
    stamps.current = crates.current.map(
      (g) => g?.querySelector<SVGGElement>("[data-stamp]") ?? null
    );

    const paint = (t: number) => {
      /* crates ride the loop, evenly spaced, wrapping seamlessly */
      for (let i = 0; i < N; i++) {
        const ph = (t + i / N) % 1;
        const x = START_X + ph * SPAN;
        crates.current[i]?.setAttribute("transform", `translate(${x.toFixed(1)} ${BELT_Y - CRATE_H})`);
        const st = stamps.current[i];
        if (st) {
          /* the stamp lands the moment the crate clears the gantry */
          st.setAttribute("opacity", clamp01((ph - STATION_PHASE) / 0.035).toFixed(3));
        }
      }

      /* belt tread and rollers share the crates' speed */
      const travel = t * SPAN;
      treads.current?.setAttribute("transform", `translate(${(travel % TREAD).toFixed(2)} 0)`);
      const spin = ((travel / (2 * Math.PI * ROLLER_R)) * 360) % 360;
      rollers.current.forEach((r) => r?.setAttribute("transform", `rotate(${spin.toFixed(1)})`));

      /* the gantry descends on the beat of every fourth crate */
      const u = (((t - FIRE_PHASE) % FIRE_PERIOD) + FIRE_PERIOD) % FIRE_PERIOD / FIRE_PERIOD;
      const dist = Math.min(u, 1 - u);
      const d = smooth(clamp01(1 - dist / 0.3));
      head.current?.setAttribute(
        "transform",
        `translate(${STATION_X} ${(SCAN_UP + d * (SCAN_DOWN - SCAN_UP)).toFixed(1)})`
      );
      beam.current?.setAttribute("opacity", (d * 0.9).toFixed(3));
      lens.current?.setAttribute("opacity", (0.25 + d * 0.75).toFixed(3));
      /* the read-out line sweeps across the crate while the head is down */
      if (sweep.current) {
        const s = clamp01((d - 0.55) / 0.45);
        sweep.current.setAttribute("opacity", (s > 0 ? 1 : 0).toFixed(0));
        sweep.current.setAttribute("x1", (STATION_X - 26 + s * 52).toFixed(1));
        sweep.current.setAttribute("x2", (STATION_X - 26 + s * 52).toFixed(1));
      }

      /* the console keeps a trace, and it spikes while a crate is read */
      if (trace.current) {
        const amp = 2 + d * 6;
        let pts = "";
        for (let i = 0; i <= 20; i++) {
          const y = 16 + Math.sin(i * 0.62 + t * 46) * amp * (i % 5 === 0 ? 1 : 0.55);
          pts += `${(1 + i * 2).toFixed(1)},${y.toFixed(1)} `;
        }
        trace.current.setAttribute("points", pts.trim());
      }
      /* amber while idle, green the moment it reads */
      statusLamp.current?.setAttribute(
        "fill",
        d > 0.5 ? "var(--color-pass-bright)" : "var(--color-warn-bright)"
      );
    };

    if (prefersReduced()) {
      paint(STATION_PHASE); /* a still frame, mid-inspection */
      return;
    }

    const proxy = { t: 0 };
    const tween = gsap.to(proxy, {
      t: 1,
      duration: CYCLE,
      ease: "none",
      repeat: -1,
      onUpdate: () => paint(proxy.t),
    });

    /* the line only runs while you are watching it */
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? tween.play() : tween.pause()),
      { threshold: 0.05 }
    );
    if (wrap.current) io.observe(wrap.current);

    return () => {
      io.disconnect();
      tween.kill();
    };
  }, []);

  return (
    <div ref={wrap} aria-hidden="true" className="w-full">
      <svg
        viewBox={tight ? `330 6 400 236` : `0 0 ${W} ${H}`}
        className="w-full"
        fill="none"
      >
        <defs>
          <clipPath id="beltClip">
            <rect x="0" y={BELT_Y} width={W} height="13" />
          </clipPath>
        </defs>

        {/* datum line under the whole machine */}
        <line
          x1="0"
          y1={BELT_Y + 46}
          x2={W}
          y2={BELT_Y + 46}
          stroke="var(--color-ink)"
          strokeOpacity="0.16"
          strokeWidth="1"
        />

        {/* trestles carrying the belt */}
        {[112, 292, 792, 934].map((x) => (
          <g key={x} stroke="var(--color-ink)" strokeOpacity="0.42" strokeWidth="1.2" fill="none">
            <path d={`M${x - 13} ${BELT_Y + 44} L${x} ${BELT_Y + 13} L${x + 13} ${BELT_Y + 44}`} />
            <line x1={x - 7} y1={BELT_Y + 30} x2={x + 7} y2={BELT_Y + 30} />
          </g>
        ))}

        {/* the feed hopper: releases arrive faster than anyone asked for */}
        <g stroke="var(--color-ink)" strokeWidth="1.4" fill="var(--color-paper-2)">
          <path d={`M-4 ${BELT_Y - 118} L104 ${BELT_Y - 118} L74 ${BELT_Y - 52} L26 ${BELT_Y - 52} Z`} />
        </g>
        <g stroke="var(--color-ink)" strokeOpacity="0.3" strokeWidth="1">
          <line x1="10" y1={BELT_Y - 100} x2="90" y2={BELT_Y - 100} />
          <line x1="18" y1={BELT_Y - 82} x2="82" y2={BELT_Y - 82} />
        </g>
        {/* crates tumbling in the throat of the hopper */}
        <g stroke="var(--color-ink)" strokeOpacity="0.45" strokeWidth="1.1" fill="none">
          <rect x="34" y={BELT_Y - 112} width="15" height="13" transform={`rotate(-14 41 ${BELT_Y - 105})`} />
          <rect x="56" y={BELT_Y - 108} width="13" height="12" transform={`rotate(11 62 ${BELT_Y - 102})`} />
          <rect x="42" y={BELT_Y - 90} width="14" height="12" transform={`rotate(5 49 ${BELT_Y - 84})`} />
        </g>
        <g stroke="var(--color-ink)" strokeWidth="1.3" fill="var(--color-paper-2)">
          <rect x="24" y={BELT_Y - 52} width="52" height="9" />
        </g>

        {/* the exit gate to deployment */}
        <g stroke="var(--color-ink)" strokeWidth="1.4" fill="var(--color-paper-2)">
          <rect x={W - 74} y={BELT_Y - 84} width="9" height="84" />
          <rect x={W - 6} y={BELT_Y - 84} width="9" height="84" />
          <rect x={W - 80} y={BELT_Y - 96} width="92" height="13" />
        </g>
        <g stroke="var(--color-pass)" strokeOpacity="0.5" strokeWidth="1.2" fill="none">
          <line x1={W - 62} y1={BELT_Y - 89} x2={W - 18} y2={BELT_Y - 89} />
        </g>

        {/* the gantry: legs, crossbeam, ladder bracing */}
        <g stroke="var(--color-ink)" strokeWidth="1.5" fill="var(--color-paper-2)">
          <rect x={STATION_X - 82} y={BELT_Y - 4} width="11" height="4" />
          <rect x={STATION_X + 71} y={BELT_Y - 4} width="11" height="4" />
          <rect x={STATION_X - 80} y="30" width="7" height={BELT_Y - 30} />
          <rect x={STATION_X + 73} y="30" width="7" height={BELT_Y - 30} />
          <rect x={STATION_X - 92} y="18" width="184" height="14" />
        </g>
        <circle ref={statusLamp} cx={STATION_X - 80} cy="25" r="3.4" fill="var(--color-warn-bright)" />
        <circle
          cx={STATION_X - 80}
          cy="25"
          r="3.4"
          stroke="var(--color-ink)"
          strokeOpacity="0.5"
          strokeWidth="1"
          fill="none"
        />
        <g stroke="var(--color-ink)" strokeOpacity="0.3" strokeWidth="1">
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={STATION_X - 73}
              y1={54 + i * 26}
              x2={STATION_X - 80}
              y2={67 + i * 26}
            />
          ))}
        </g>
        {/* hazard hatching at the foot of each leg */}
        <g stroke="var(--color-warn-bright)" strokeOpacity="0.65" strokeWidth="1.4">
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1={STATION_X - 80}
                y1={BELT_Y - 26 + i * 6}
                x2={STATION_X - 73}
                y2={BELT_Y - 32 + i * 6}
              />
              <line
                x1={STATION_X + 73}
                y1={BELT_Y - 26 + i * 6}
                x2={STATION_X + 80}
                y2={BELT_Y - 32 + i * 6}
              />
            </g>
          ))}
        </g>
        {/* rail the head hangs from */}
        <line
          x1={STATION_X - 74}
          y1="38"
          x2={STATION_X + 74}
          y2="38"
          stroke="var(--color-ink)"
          strokeOpacity="0.45"
          strokeWidth="1"
        />

        {/* station footprint marked on the deck */}
        <rect
          x={STATION_X - 44}
          y={BELT_Y - 62}
          width="88"
          height="62"
          stroke="var(--color-cobalt)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="5 5"
        />

        {/* the belt */}
        <rect
          x="0"
          y={BELT_Y}
          width={W}
          height="13"
          fill="var(--color-paper-2)"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
        />
        <g clipPath="url(#beltClip)">
          <g ref={treads} stroke="var(--color-ink)" strokeOpacity="0.26" strokeWidth="1">
            {Array.from({ length: Math.ceil(W / TREAD) + 3 }).map((_, i) => (
              <line
                key={i}
                x1={-TREAD + i * TREAD}
                y1={BELT_Y + 1}
                x2={-TREAD + i * TREAD - 5}
                y2={BELT_Y + 12}
              />
            ))}
          </g>
        </g>

        {/* rollers */}
        {Array.from({ length: Math.floor(W / 82) + 1 }).map((_, i) => {
          const cx = 42 + i * 82;
          return (
            <g key={i} transform={`translate(${cx} ${BELT_Y + 22})`}>
              <circle
                r={ROLLER_R}
                fill="var(--color-paper-2)"
                stroke="var(--color-ink)"
                strokeWidth="1.2"
                strokeOpacity="0.55"
              />
              <g
                ref={(el) => {
                  rollers.current[i] = el;
                }}
                stroke="var(--color-ink)"
                strokeOpacity="0.4"
                strokeWidth="1"
              >
                <line x1={-ROLLER_R} y1="0" x2={ROLLER_R} y2="0" />
                <line x1="0" y1={-ROLLER_R} x2="0" y2={ROLLER_R} />
              </g>
            </g>
          );
        })}

        {/* the operator console, wired back to the gantry */}
        <g transform={`translate(742 ${BELT_Y - 96})`}>
          <line x1="12" y1="30" x2="12" y2="96" stroke="var(--color-ink)" strokeOpacity="0.45" strokeWidth="1.2" />
          <line x1="48" y1="30" x2="48" y2="96" stroke="var(--color-ink)" strokeOpacity="0.45" strokeWidth="1.2" />
          <rect
            x="-6"
            y="0"
            width="72"
            height="32"
            stroke="var(--color-ink)"
            strokeWidth="1.4"
            fill="var(--color-paper-2)"
          />
          <rect
            x="0"
            y="5"
            width="42"
            height="22"
            stroke="var(--color-ink)"
            strokeOpacity="0.5"
            strokeWidth="1"
            fill="var(--color-blueprint-2)"
          />
          {/* a live trace on the console screen */}
          <polyline
            ref={trace}
            points=""
            stroke="var(--color-cobalt)"
            strokeWidth="1.2"
            fill="none"
          />
          <g fill="var(--color-ink)" fillOpacity="0.4">
            <circle cx="52" cy="11" r="2.6" />
            <circle cx="59" cy="11" r="2.6" />
            <circle cx="52" cy="21" r="2.6" />
            <circle cx="59" cy="21" r="2.6" />
          </g>
        </g>
        {/* cable tray from the console up and over to the gantry head */}
        <path
          d={`M742 ${BELT_Y - 96} L742 ${BELT_Y - 130} L${STATION_X + 92} ${BELT_Y - 130} L${STATION_X + 92} 32`}
          stroke="var(--color-ink)"
          strokeOpacity="0.3"
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="1 4"
          strokeLinecap="round"
        />

        {/* the specimens */}
        {Array.from({ length: N }).map((_, i) => (
          <g
            key={i}
            ref={(el) => {
              crates.current[i] = el;
            }}
          >
            <Crate hue={DIMENSIONS[i % DIMENSIONS.length].hue.bright} inspected={i % EVERY === 0} />
          </g>
        ))}

        {/* the scanning head, hanging from its rail */}
        <g ref={beam} opacity="0">
          <path
            d={`M${STATION_X - 24} 0 L${STATION_X + 24} 0 L${STATION_X + 40} ${BELT_Y} L${STATION_X - 40} ${BELT_Y} Z`}
            fill="var(--color-cobalt)"
            fillOpacity="0.07"
          />
          <line
            ref={sweep}
            x1={STATION_X - 26}
            y1={BELT_Y - 50}
            x2={STATION_X - 26}
            y2={BELT_Y - 2}
            stroke="var(--color-cobalt)"
            strokeWidth="1.6"
            opacity="0"
          />
        </g>
        <g ref={head} transform={`translate(${STATION_X} ${SCAN_UP})`}>
          <line x1="0" y1={-SCAN_UP + 38} x2="0" y2="-2" stroke="var(--color-ink)" strokeOpacity="0.5" strokeWidth="1" />
          <rect
            x="-30"
            y="-2"
            width="60"
            height="26"
            fill="var(--color-paper-2)"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />
          <rect
            x="-22"
            y="24"
            width="44"
            height="5"
            fill="var(--color-paper-2)"
            stroke="var(--color-ink)"
            strokeWidth="1.2"
          />
          <circle ref={lens} cx="0" cy="11" r="6" fill="var(--color-cobalt)" opacity="0.25" />
          <g stroke="var(--color-ink)" strokeOpacity="0.35" strokeWidth="1">
            <line x1="-24" y1="4" x2="-14" y2="4" />
            <line x1="14" y1="4" x2="24" y2="4" />
          </g>
        </g>

        {/* the labels that make it a diagram */}
        <g
          fill="var(--color-ink-mute)"
          style={{ font: "500 10px var(--font-mono)", letterSpacing: "0.18em" }}
        >
          <text x="4" y={BELT_Y + 40}>
            OPEN-WEIGHT RELEASES
          </text>
          <text x={W - 4} y={BELT_Y + 40} textAnchor="end">
            DEPLOYED
          </text>
        </g>
        <text
          x={STATION_X}
          y="12"
          textAnchor="middle"
          fill="var(--color-cobalt)"
          style={{ font: "600 10px var(--font-mono)", letterSpacing: "0.2em" }}
        >
          INSPECTION
        </text>
        <g stroke="var(--color-ink)" strokeOpacity="0.4" strokeWidth="1.2" fill="none">
          <line x1="222" y1={BELT_Y + 32} x2="256" y2={BELT_Y + 32} />
          <path d={`M248 ${BELT_Y + 36} l9 -4 l-9 -4`} />
          <line x1={W - 256} y1={BELT_Y + 32} x2={W - 222} y2={BELT_Y + 32} />
          <path d={`M${W - 230} ${BELT_Y + 36} l9 -4 l-9 -4`} />
        </g>
      </svg>
    </div>
  );
}
