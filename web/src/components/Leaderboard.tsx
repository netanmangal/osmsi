import { useMemo, useRef, useState } from "react";
import { DIMENSIONS, SPECIMENS, type DimKey } from "@/lib/data";
import SectionHead from "@/components/SectionHead";
import BandScallop from "@/components/deco/BandScallop";
import RevisionCloud from "@/components/deco/RevisionCloud";
import { Badge, gradeVariant } from "@/components/ui/badge";
import { Flip, prefersReduced } from "@/lib/anim";

type SortKey = DimKey | "name" | "band";

const BAND_RANK: Record<string, number> = {
  A: 9, "A-": 8, "B+": 7, B: 6, "B-": 5, "C+": 4, C: 3, "C-": 2, D: 1,
};

export default function Leaderboard() {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "band", dir: -1 });
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const rows = useMemo(() => {
    const list = [...SPECIMENS];
    list.sort((a, b) => {
      let d = 0;
      if (sort.key === "name") d = a.name.localeCompare(b.name);
      else if (sort.key === "band") d = BAND_RANK[a.band] - BAND_RANK[b.band];
      else d = a.scores[sort.key].v - b.scores[sort.key].v;
      return d * sort.dir;
    });
    return list;
  }, [sort]);

  const resort = (key: SortKey) => {
    const state =
      bodyRef.current && !prefersReduced()
        ? Flip.getState(bodyRef.current.querySelectorAll("tr"))
        : null;
    setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1 }));
    if (state) {
      requestAnimationFrame(() => {
        Flip.from(state, { duration: 0.55, ease: "power3.inOut", stagger: 0.015 });
      });
    }
  };

  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined;

  const SortButton = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => resort(k)}
      className="mono-label hover:text-ink inline-flex cursor-pointer items-center gap-1 text-[0.62rem] transition-colors"
    >
      {children}
      <span
        aria-hidden="true"
        className={sort.key === k ? "text-cobalt" : "text-ink-mute/50"}
      >
        {sort.key === k ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );

  return (
    <section
      id="index"
      data-band="blueprint"
      className="band-blueprint relative scroll-mt-20"
    >
      <BandScallop className="text-blueprint" />
      <RevisionCloud className="absolute top-16 left-[6%] w-44 opacity-80" drift={48} duration={19} tone="teal" tag="3" />
      <div className="relative px-(--pad-x) py-(--section-gap)">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            clause="05 · the index"
            title="The index, sorted your way."
            lead="Eight specimens, six dimensions, zero aggregate scores. Sort by the axis your deployment actually depends on: the ranking changes, which is exactly the point."
          />
          <Badge variant="stamp" className="mb-2 shrink-0 -rotate-2 px-3 py-1.5 text-[0.72rem]">
            sample data · harness v0.4.2
          </Badge>
        </div>

        <p className="mono-label mt-10 text-[0.6rem] md:hidden">
          swipe the table sideways to read every axis →
        </p>
        <div
          data-reveal=""
          className="bg-blueprint-2 mt-3 overflow-x-auto rounded-xl border border-(--line) px-5 py-2 md:mt-14 sm:px-7"
        >
          <table className="w-full min-w-[880px] border-collapse">
            <caption className="sr-only">
              Illustrative safety index of eight anonymized specimen models across six dimensions
            </caption>
            <thead>
              <tr className="border-b border-(--line-strong)">
                <th scope="col" aria-sort={ariaSort("name")} className="py-3 pr-4 text-left">
                  <SortButton k="name">specimen</SortButton>
                </th>
                <th scope="col" className="px-3 py-3 text-left">
                  <span className="mono-label text-[0.62rem]">params</span>
                </th>
                {DIMENSIONS.map((d) => (
                  <th
                    key={d.key}
                    scope="col"
                    aria-sort={ariaSort(d.key)}
                    className="px-3 py-3 text-right"
                  >
                    <SortButton k={d.key}>
                      <abbr title={d.name} className="no-underline" style={{ color: d.hue.ink }}>
                        {d.abbr}
                      </abbr>
                    </SortButton>
                  </th>
                ))}
                <th scope="col" aria-sort={ariaSort("band")} className="py-3 pl-3 text-right">
                  <SortButton k="band">band</SortButton>
                </th>
              </tr>
            </thead>
            <tbody ref={bodyRef}>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  data-flip-id={s.id}
                  className="group border-b border-(--line) bg-transparent transition-colors duration-200 hover:bg-(--color-blueprint-2)"
                >
                  <td className="py-3.5 pr-4">
                    <span className="font-display block text-[1.06rem] leading-tight font-[580]">
                      {s.name}
                    </span>
                    <span className="mono-label text-[0.58rem]">{s.arch}</span>
                  </td>
                  <td className="tnum text-ink-dim px-3 py-3.5 font-mono text-[0.82rem]">
                    {s.params}
                  </td>
                  {DIMENSIONS.map((d) => {
                    const sc = s.scores[d.key];
                    return (
                      <td key={d.key} className="px-3 py-3.5 text-right align-middle">
                        <span className="tnum text-ink block font-mono text-[0.84rem]">
                          {sc.v}
                        </span>
                        <span className="bg-ink/8 mt-1 ml-auto block h-[3px] w-11 overflow-hidden rounded-full">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${sc.v}%`, background: d.hue.bright }}
                          />
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3.5 pl-3 text-right">
                    <Badge variant={gradeVariant(s.band)} className="text-[0.74rem]">
                      {s.band}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-ink-mute mt-8 max-w-[62ch] font-mono text-[0.72rem] leading-[1.7] tracking-[0.04em]">
          Illustrative specimens demonstrate the format. The live index launches with harness
          v1.0, real names attached to real runs, every row reproducible from the public
          pipeline.
        </p>
      </div>
    </section>
  );
}
