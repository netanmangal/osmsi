import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Clause header: crosshair eyebrow, serif head, one precise lead sentence. */
export default function SectionHead({
  clause,
  title,
  lead,
  className,
  wide,
}: {
  clause: string;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <header className={cn("max-w-[880px]", wide && "max-w-[1100px]", className)}>
      <p data-reveal="" className="eyebrow">
        {clause}
      </p>
      <h2
        data-reveal="words"
        className="text-current mt-5"
        style={{ fontSize: "var(--text-h2)", lineHeight: 1.06 }}
      >
        {title}
      </h2>
      {lead && (
        <p data-reveal="" className="text-ink-dim mt-6 max-w-[62ch] text-[1.06rem] leading-[1.66]">
          {lead}
        </p>
      )}
      <div data-reveal="" className="tick-rule mt-9" aria-hidden="true" />
    </header>
  );
}
