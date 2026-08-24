import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Scalloped band edge: a horizontal revision-cloud rim marking the cut
 * between two paper bands. Colored via currentColor; place inside the
 * LOWER band, poking upward.
 */
export default function BandScallop({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 -top-[13px] h-[14px] w-full", className)}
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={`sc-${id}`} width="34" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 14 A17 15 0 0 1 34 14 Z" fill="currentColor" />
          {/* the pen line along the scallop rim */}
          <path
            d="M0 14 A17 15 0 0 1 34 14"
            fill="none"
            stroke="color-mix(in srgb, var(--color-ink) 22%, transparent)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill={`url(#sc-${id})`} />
    </svg>
  );
}
