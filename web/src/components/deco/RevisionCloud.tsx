import { useEffect, useRef } from "react";
import { gsap, prefersReduced } from "@/lib/anim";
import { cn } from "@/lib/utils";

/**
 * A drafting "revision cloud": the scalloped bubble surveyors and engineers
 * draw on blueprints, double-stroked the way a careful hand goes over the
 * line twice. Real revision clouds carry a numbered triangle tag; ours can
 * too. Decorative only; drifts slowly unless the user prefers reduced motion.
 */
export default function RevisionCloud({
  className,
  drift = 46,
  duration = 18,
  delay = 0,
  tone = "ink",
  tag,
}: {
  className?: string;
  drift?: number;
  duration?: number;
  delay?: number;
  tone?: "ink" | "cobalt" | "gold" | "green" | "rust" | "teal";
  tag?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (prefersReduced() || !ref.current) return;
    const x = gsap.to(ref.current, {
      x: drift,
      duration,
      delay,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    const y = gsap.to(ref.current, {
      y: 9,
      duration: duration * 0.62,
      delay,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      x.kill();
      y.kill();
    };
  }, [drift, duration, delay]);

  const stroke =
    {
      ink: "var(--color-ink)",
      cobalt: "var(--color-cobalt)",
      gold: "var(--color-warn-bright)",
      green: "var(--color-pass-bright)",
      rust: "var(--color-flag-bright)",
      teal: "var(--color-teal-bright)",
    }[tone] ?? "var(--color-ink)";

  return (
    <svg
      ref={ref}
      viewBox="0 0 220 92"
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      fill="none"
    >
      <path
        d="M38 66
           a15 15 0 0 1 -16 -22 a16 16 0 0 1 14 -26 a17 17 0 0 1 30 -8
           a18 18 0 0 1 32 -2 a17 17 0 0 1 31 4 a16 16 0 0 1 27 6
           a15 15 0 0 1 15 22 a14 14 0 0 1 -13 24 a15 15 0 0 1 -26 8
           a16 16 0 0 1 -30 3 a17 17 0 0 1 -32 -1 a16 16 0 0 1 -32 -8 Z"
        stroke={stroke}
        strokeOpacity={tone !== "ink" ? 0.34 : 0.3}
        strokeWidth="1.4"
        fill="var(--color-paper-2)"
        fillOpacity="0.55"
      />
      {/* the second pass of the pen, slightly inside the first */}
      <path
        d="M46 58
           a11 11 0 0 1 -11 -17 a12 12 0 0 1 11 -19 a13 13 0 0 1 23 -6
           a14 14 0 0 1 25 -1 a13 13 0 0 1 24 3 a12 12 0 0 1 20 5
           a11 11 0 0 1 10 16 a10 10 0 0 1 -9 18 a11 11 0 0 1 -20 6
           a12 12 0 0 1 -23 2 a13 13 0 0 1 -25 -1 a12 12 0 0 1 -25 -6 Z"
        stroke={stroke}
        strokeOpacity={tone !== "ink" ? 0.18 : 0.15}
        strokeWidth="1"
      />
      {/* revision tag: the numbered triangle from real drawing sets */}
      {tag && (
        <g transform="translate(178 14)">
          <path
            d="M0 14 L8 0 L16 14 Z"
            stroke={stroke}
            strokeOpacity="0.55"
            strokeWidth="1.2"
            fill="var(--color-paper-2)"
          />
          <text
            x="8"
            y="11.5"
            textAnchor="middle"
            style={{ font: "600 7px var(--font-mono)" }}
            fill={stroke}
            fillOpacity="0.75"
          >
            {tag}
          </text>
        </g>
      )}
    </svg>
  );
}
