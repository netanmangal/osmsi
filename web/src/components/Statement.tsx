import type { ReactNode } from "react";

/** Full-bleed breathing line between dense sections. House move. */
export default function Statement({
  children,
  note,
}: {
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="px-(--pad-x) py-(--statement-gap)">
      <div className="max-w-[1200px]">
        <p
          data-reveal="words"
          className="font-display text-ink max-w-[26ch] font-[560] tracking-[-0.015em]"
          style={{ fontSize: "var(--text-statement)", lineHeight: 1.14 }}
        >
          {children}
        </p>
        {note && <p className="mono-label mt-6">{note}</p>}
      </div>
    </section>
  );
}
