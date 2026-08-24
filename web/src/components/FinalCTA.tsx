import BandScallop from "@/components/deco/BandScallop";

/** Ink-dark closing band: just the giant two-line ask, ghost over solid.
    Contact lives in the footer directly below, so the whole band plus the
    footer reads as one frame. */
export default function FinalCTA() {
  return (
    <section
      data-band="void"
      className="band-void relative px-(--pad-x) pt-16 pb-12 sm:pt-20"
    >
      <BandScallop className="text-void" />
      <p className="eyebrow mb-5">the ask</p>

      <h2
        className="font-display leading-[0.94] font-[600] tracking-[-0.02em] uppercase"
        style={{ fontSize: "var(--text-giant)" }}
      >
        <span
          data-reveal=""
          className="block text-transparent"
          style={{ WebkitTextStroke: "1.5px color-mix(in srgb, var(--color-cream) 72%, transparent)" }}
        >
          Measure the
        </span>
        <span data-reveal="" data-delay="0.1" className="text-cream block">
          open frontier.
        </span>
      </h2>
    </section>
  );
}
