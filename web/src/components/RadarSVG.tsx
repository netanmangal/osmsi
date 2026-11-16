import { useMemo } from "react";
import { DIMENSIONS, type DimKey } from "@/lib/data";

const ORDER: DimKey[] = ["jb", "hc", "pi", "uc", "ag", "in"];

export function radarPoint(cx: number, cy: number, r: number, axis: number, v: number) {
  const angle = (axis * 60 - 90) * (Math.PI / 180);
  const rr = (v / 100) * r;
  return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)] as const;
}

export function radarPoints(cx: number, cy: number, r: number, values: number[]) {
  return values
    .map((v, i) => radarPoint(cx, cy, r, i, v).map((n) => n.toFixed(1)).join(","))
    .join(" ");
}

/** Static six-axis radar, used on Safety Cards. Grade colors stay out;
    the polygon is always cobalt; the instrument does not editorialize. */
export default function RadarSVG({
  values,
  size = 240,
  labels = true,
  className,
}: {
  values: Partial<Record<DimKey, { v: number }>> | (number | null)[];
  size?: number;
  labels?: boolean;
  className?: string;
}) {
  const vals = Array.isArray(values) ? values : ORDER.map((k) => values[k]?.v ?? null);
  const c = size / 2;
  const r = size / 2 - (labels ? 30 : 8);

  const rings = useMemo(
    () => [25, 50, 75, 100].map((p) => radarPoints(c, c, r, Array(6).fill(p))),
    [c, r]
  );

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      /* an intrinsic size, or the SVG defaults to 300px and blows out its column */
      width={size}
      height={size}
      style={{ maxWidth: "100%", height: "auto" }}
      className={className}
      role="img"
      aria-label={`Safety radar: ${ORDER.map(
        (_, i) => `${DIMENSIONS[i].abbr} ${vals[i] === null ? "not measured" : Math.round(vals[i]!)}`
      ).join(", ")} out of 100`}
    >
      <g fill="none" stroke="var(--color-ink)">
        {rings.map((pts, i) => (
          <polygon key={i} points={pts} strokeWidth="1" opacity={i === 3 ? 0.3 : 0.12} />
        ))}
        {ORDER.map((_, i) => {
          const [x, y] = radarPoint(c, c, r, i, 100);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} strokeWidth="1" opacity="0.12" />;
        })}
      </g>
      {vals.every((value) => value !== null) && <polygon
        points={radarPoints(c, c, r, vals as number[])}
        fill="color-mix(in srgb, var(--color-cobalt) 17%, transparent)"
        stroke="var(--color-cobalt)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />}
      {vals.map((v, i) => {
        if (v === null) return null;
        const [x, y] = radarPoint(c, c, r, i, v);
        return <circle key={i} cx={x} cy={y} r="2.6" fill="var(--color-cobalt)" />;
      })}
      {labels &&
        ORDER.map((_, i) => {
          const [x, y] = radarPoint(c, c, r + 19, i, 100);
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink-mute"
              style={{
                font: `500 ${Math.max(8.5, size * 0.038)}px var(--font-mono)`,
                letterSpacing: "0.08em",
              }}
            >
              {DIMENSIONS[i].abbr}
            </text>
          );
        })}
    </svg>
  );
}
