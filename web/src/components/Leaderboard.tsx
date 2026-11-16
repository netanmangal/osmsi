import { useMemo, useState } from "react";
import { DIMENSIONS, SPECIMENS, type DimKey } from "@/lib/data";
import { useResults } from "@/lib/results";
import { describeScope, protocolKey, protocolLabel, providerBlocks } from "@/lib/artifacts";
import { scrollToHash } from "@/lib/anim";
import SectionHead from "@/components/SectionHead";
import BandScallop from "@/components/deco/BandScallop";
import RevisionCloud from "@/components/deco/RevisionCloud";
import { Badge } from "@/components/ui/badge";

type SortKey = DimKey | "name";
type Row = { id: string; name: string; sample: boolean; published: boolean; scope: string; scores: Partial<Record<DimKey, number>> };

export default function Leaderboard() {
  const results = useResults();
  const [preview, setPreview] = useState(false);
  const [query, setQuery] = useState("");
  const [chosenProtocol, setChosenProtocol] = useState("");
  const protocols = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; count: number }>();
    results.runs.filter((run) => preview || !run.card.sample).forEach(({ manifest }) => {
      const key = protocolKey(manifest);
      const group = groups.get(key);
      if (group) group.count++;
      else groups.set(key, { key, label: protocolLabel(manifest), count: 1 });
    });
    return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [results.runs, preview]);
  const activeProtocol = protocols.some((protocol) => protocol.key === chosenProtocol)
    ? chosenProtocol : protocols[0]?.key ?? "";
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const rows = useMemo(() => {
    const published: Row[] = results.runs.filter((run) => (preview || !run.card.sample)
      && protocolKey(run.manifest) === activeProtocol).map(({ card, manifest }) => ({
      id: card.run_id, name: card.model.id, sample: card.sample, published: true,
      scope: `${describeScope(manifest)}${providerBlocks(manifest) ? ` · ${providerBlocks(manifest)} provider blocks` : ""}`,
      scores: Object.fromEntries(card.scores.map((score) => [score.dimension, score.value])),
    }));
    const samples: Row[] = preview && !results.runs.some((run) => run.card.sample) ? SPECIMENS.map((specimen) => ({
      id: specimen.id, name: specimen.name, sample: true, published: false,
      scope: "format preview",
      scores: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.key, specimen.scores[dimension.key].v])),
    })) : [];
    return [...published, ...samples].filter((row) => row.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * sort.dir;
      const first = a.scores[sort.key], second = b.scores[sort.key];
      if (first === undefined) return second === undefined ? a.name.localeCompare(b.name) : 1;
      if (second === undefined) return -1;
      return (first - second) * sort.dir || a.name.localeCompare(b.name);
    });
  }, [results.runs, preview, query, sort, activeProtocol]);
  const changeSort = (key: SortKey) => setSort((current) => ({ key,
    dir: current.key === key ? (current.dir === 1 ? -1 : 1) : key === "name" ? 1 : -1 }));
  const ariaSort = (key: SortKey) => sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined;

  return (
    <section id="index" data-band="blueprint" className="band-blueprint relative scroll-mt-20">
      <BandScallop className="text-blueprint" />
      <RevisionCloud className="absolute top-16 left-[6%] w-44 opacity-80" drift={48} duration={19} tone="teal" tag="3" />
      <div className="relative px-(--pad-x) py-(--section-gap)">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead clause="05 · the index" title="The index, sorted your way."
            lead="Compare the measured dimensions. Read the run behind each number. Missing measurements stay missing; there is no overall safety rank." />
          <Badge variant="stamp">{results.runs.filter((run) => !run.card.sample && protocolKey(run.manifest) === activeProtocol).length} measured runs</Badge>
        </div>
        <div className="mt-10 flex flex-wrap items-end gap-5">
          {protocols.length > 0 && <label className="mono-label flex max-w-full flex-col gap-2">
            Evaluation protocol
            <select value={activeProtocol} onChange={(event) => setChosenProtocol(event.target.value)}
              className="text-ink bg-paper max-w-full rounded-md border border-(--line-strong) px-3 py-2 font-sans text-sm normal-case tracking-normal">
              {protocols.map((protocol) => <option key={protocol.key} value={protocol.key}>{protocol.label} · {protocol.count} runs</option>)}
            </select>
          </label>}
          <label className="mono-label flex flex-col gap-2">
            Find a model
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search"
              placeholder="Model name" className="text-ink bg-paper w-64 max-w-full rounded-md border border-(--line-strong) px-3 py-2 font-sans text-sm normal-case tracking-normal" />
          </label>
          <label className="text-ink-dim flex cursor-pointer items-center gap-2 py-2 text-sm">
            <input type="checkbox" checked={preview} onChange={(event) => setPreview(event.target.checked)} />
            Include sample specimens
          </label>
          <a href="/results/index.json" download className="mono-label py-2 text-cobalt">Download index JSON ↗</a>
        </div>
        {results.status === "loading" && <p role="status" className="mt-6 text-ink-dim">Loading published results…</p>}
        {results.status === "error" && <div role="alert" className="mt-6 rounded-lg border border-flag/40 p-4 text-ink">
          <p>Published results could not be loaded. {results.error}</p>
          <button type="button" onClick={results.retry} className="mt-2 cursor-pointer text-cobalt underline">Try again</button>
        </div>}
        {results.status === "ready" && !results.runs.some((run) => !run.card.sample) && <p className="mt-6 max-w-2xl text-ink-dim">
          No reviewed model evaluations are published yet. You can inspect the format using sample specimens, or run the open pilot suites on your own backend.
        </p>}
        {rows.length > 0 ? <div className="bg-blueprint-2 mt-8 overflow-x-auto rounded-xl border border-(--line) px-5 py-2 sm:px-7">
          <table className="w-full min-w-[880px] border-collapse">
            <caption className="sr-only">Model safety measurements by dimension. Sample rows are illustrative.</caption>
            <thead><tr className="border-b border-(--line-strong)">
              <th scope="col" aria-sort={ariaSort("name")} className="py-3 text-left">
                <button onClick={() => changeSort("name")} className="mono-label cursor-pointer">Model {sort.key === "name" ? (sort.dir === 1 ? "↑" : "↓") : "↕"}</button>
              </th>
              {DIMENSIONS.map((dimension) => <th key={dimension.key} scope="col" aria-sort={ariaSort(dimension.key)} className="px-3 py-3 text-right">
                <button onClick={() => changeSort(dimension.key)} className="mono-label cursor-pointer" aria-label={`Sort by ${dimension.name}`}>
                  <abbr title={dimension.name} className="no-underline" style={{ color: dimension.hue.ink }}>{dimension.abbr}</abbr>
                  {sort.key === dimension.key ? (sort.dir === 1 ? " ↑" : " ↓") : " ↕"}
                </button>
              </th>)}
              <th scope="col" className="mono-label py-3 pl-3 text-right">Evidence</th>
            </tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-(--line)">
              <td className="py-4 pr-4"><span className="font-display block text-lg">{row.name}</span>
                <span className="mono-label text-[0.6rem]">{row.sample ? "SAMPLE · illustrative" : row.scope}</span></td>
              {DIMENSIONS.map((dimension) => <td key={dimension.key} className="tnum px-3 py-4 text-right font-mono text-sm">
                {row.scores[dimension.key] === undefined ? <span className="text-ink-mute text-xs">not measured</span> : row.scores[dimension.key]!.toFixed(1)}
              </td>)}
              <td className="py-4 pl-3 text-right">{row.published ? <button type="button" className="mono-label cursor-pointer text-cobalt underline" onClick={() => {
                results.selectRun(row.id); scrollToHash("#cards");
              }}>Inspect run ↗</button> : <span className="mono-label text-ink-mute">format only</span>}</td>
            </tr>)}</tbody>
          </table>
        </div> : results.status === "ready" && query && <p className="mt-8 text-ink-dim">No models match this search.</p>}
        <p className="text-ink-mute mt-8 max-w-[70ch] font-mono text-xs leading-relaxed">
          Each view uses a shared evaluation protocol. Scores apply to unblocked responses and include output-format failures; provider filters may leave different scored subsets. These are research artifacts, not certifications. Review each card’s evidence before comparing results.
        </p>
      </div>
    </section>
  );
}
