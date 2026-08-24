import { useEffect, useRef, useState } from "react";
import { gsap, prefersReduced } from "@/lib/anim";
import { preloadScenes, webglAvailable } from "@/lib/preload";

const MIN_MS = 900; /* let the count be seen even when everything is cached */
const SAFETY_MS = 10000; /* a stalled chunk must never strand the visitor */

/* what the bar is actually waiting on, and how much of it each is worth */
const STAGES = [
  { key: "fonts", weight: 18, label: "loading typefaces" },
  { key: "load", weight: 20, label: "loading page assets" },
  { key: "scenes", weight: 28, label: "loading instrument" },
  { key: "frame", weight: 34, label: "warming the bench" },
] as const;
type Key = (typeof STAGES)[number]["key"];

/**
 * A real loading screen: it holds until the fonts are in, the document has
 * finished loading, both three.js scene chunks are parsed, and the hero has
 * actually put a frame on screen. Only then does the site come up, so the
 * bench is never caught mid-arrival.
 */
export default function Preloader() {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let done = false;
    const t0 = performance.now();
    const parts: Record<Key, number> = { fonts: 0, load: 0, scenes: 0, frame: 0 };
    const display = { v: 0 };

    const finish = () => {
      if (done) return;
      done = true;
      window.dispatchEvent(new CustomEvent("osmsi:enter"));
      if (prefersReduced() || !rootRef.current) {
        setGone(true);
        return;
      }
      gsap.to(rootRef.current, {
        yPercent: -100,
        duration: 0.75,
        ease: "power4.inOut",
        delay: 0.12,
        onComplete: () => setGone(true),
      });
    };

    const render = () => {
      const target = STAGES.reduce((sum, s) => sum + parts[s.key] * s.weight, 0);
      /* name the thing we are genuinely still waiting for */
      const pending = STAGES.find((s) => parts[s.key] < 1);
      if (stageRef.current) stageRef.current.textContent = pending ? pending.label : "ready";

      gsap.to(display, {
        v: target,
        duration: 0.45,
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => {
          const n = Math.round(display.v);
          if (numRef.current) numRef.current.textContent = String(n).padStart(3, "0");
          if (barRef.current) barRef.current.style.transform = `scaleX(${display.v / 100})`;
        },
        onComplete: () => {
          if (target >= 100) {
            window.setTimeout(finish, Math.max(0, MIN_MS - (performance.now() - t0)));
          }
        },
      });
    };

    const mark = (k: Key) => {
      if (parts[k] === 1) return;
      parts[k] = 1;
      render();
    };

    /* 1. typefaces */
    document.fonts.ready.then(() => mark("fonts"));

    /* 2. the document and its subresources */
    if (document.readyState === "complete") mark("load");
    else window.addEventListener("load", () => mark("load"), { once: true });

    /* 3. the scene chunks, started now rather than when React reaches them */
    preloadScenes().then(() => mark("scenes"));

    /* 4. the hero's first painted frame. Without WebGL that frame will never
          come, so the stage is satisfied as soon as we know that. */
    const onHero = () => mark("frame");
    if (!webglAvailable()) window.setTimeout(onHero, 0);
    else window.addEventListener("osmsi:hero-ready", onHero, { once: true });

    const safety = window.setTimeout(() => {
      STAGES.forEach((s) => (parts[s.key] = 1));
      render();
    }, SAFETY_MS);

    render();

    return () => {
      window.removeEventListener("osmsi:hero-ready", onHero);
      window.clearTimeout(safety);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="bg-paper fixed inset-0 z-(--z-loader) flex flex-col justify-between px-(--pad-x) py-7"
    >
      <div className="mono-label flex items-center justify-between">
        <span>OSMSI · safety instrument</span>
        <span className="hidden sm:block">harness v0.4.2</span>
      </div>

      <div className="flex flex-col items-start gap-5">
        <span ref={stageRef} className="mono-label text-cobalt">
          loading typefaces
        </span>
        <span
          ref={numRef}
          className="text-ink tnum font-mono text-[clamp(4.5rem,14vw,9rem)] leading-none font-light"
        >
          000
        </span>
        <div className="relative h-[9px] w-full max-w-105 overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--line-strong)_0_1px,transparent_1px_10px)]" />
          <div
            ref={barRef}
            className="bg-cobalt absolute inset-y-0 left-0 w-full origin-left"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>

      <div className="mono-label flex items-center justify-between">
        <span>open weights · measured safety</span>
        <span className="tnum">2026-08-08</span>
      </div>
    </div>
  );
}
