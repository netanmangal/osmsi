import SectionHead from "@/components/SectionHead";
import InspectionLine from "@/components/deco/InspectionLine";

const GAPS = [
  {
    tag: "benchmarks",
    hue: "#8f6410",
    body: "Leaderboards measure what a model can do. Almost none measure what it refuses to do, or how much pressure that refusal survives.",
    exhibit: "capability ≠ safety",
  },
  {
    tag: "model cards",
    hue: "#b03a24",
    body: "Safety sections are self-reported, rarely reproducible, and almost never re-tested after the hundredth community fine-tune.",
    exhibit: "claims without pipelines",
  },
  {
    tag: "downstream",
    hue: "#20706c",
    body: "Developers deploy weights they cannot audit. Policymakers cite evals they cannot rerun. Everyone quotes numbers nobody can check.",
    exhibit: "trust by citation chain",
  },
];

const BAD_OPTIONS = ["Trust the vendor's card", "Run your own red team", "Ship and hope"];

export default function Problem() {
  return (
    <section
      id="problem"
      className="relative scroll-mt-20 overflow-hidden px-(--pad-x) py-(--section-gap)"
    >
      <SectionHead
        clause="01 · the problem"
        title="Open weights ship faster than scrutiny."
        lead="Hundreds of open-weight models land every year, forked and fine-tuned within days. The tooling to compare their safety never arrived: evaluations stay scattered, one-off and unreproducible."
      />

      {/* the thesis, drawn as a machine */}
      <div data-reveal="" className="mt-12 md:mt-14">
        <InspectionLine />
        <p className="mono-label mt-3 text-[0.58rem] sm:text-[0.62rem]">
          fig. 02 · the line runs faster than the gantry
        </p>
      </div>

      <div className="mt-16 grid gap-x-8 gap-y-12 lg:grid-cols-12">
        {GAPS.map(({ tag, hue, body, exhibit }, i) => (
          <article
            key={tag}
            data-reveal=""
            data-delay={String(i * 0.08)}
            className={
              i === 0
                ? "lg:col-span-5"
                : i === 1
                  ? "lg:col-span-4 lg:mt-14"
                  : "lg:col-span-3 lg:mt-28"
            }
          >
            <p className="mono-label" style={{ color: hue }}>
              {tag}
            </p>
            <p className="text-ink mt-4 max-w-[38ch] text-[1.13rem] leading-[1.55] font-medium">
              {body}
            </p>
            <p className="mono-label mt-5 text-[0.62rem]">exhibit · {exhibit}</p>
          </article>
        ))}
      </div>

      {/* the three bad options: earn the index by exhausting the alternatives */}
      <div data-reveal="" className="mt-24 max-w-[1100px]">
        <p className="mono-label mb-5">your options today</p>
        <div className="grid border border-(--line) sm:grid-cols-3">
          {BAD_OPTIONS.map((opt, i) => (
            <div
              key={opt}
              className="flex items-baseline gap-4 border-b border-(--line) p-6 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
            >
              <span
                className="tnum font-mono text-sm font-medium"
                style={{ color: ["#8f6410", "#b03a24", "#20706c"][i] }}
              >
                {i + 1}.
              </span>
              <span className="font-display text-ink text-[1.35rem] font-[560]">{opt}.</span>
            </div>
          ))}
        </div>
        <p className="text-ink-dim mt-8 max-w-[52ch] text-[1.06rem] leading-[1.6]">
          The first is unverifiable, the second is unaffordable, the third is the industry
          standard. None of them scale. <span className="text-ink font-medium">An index does.</span>
        </p>
      </div>
    </section>
  );
}
