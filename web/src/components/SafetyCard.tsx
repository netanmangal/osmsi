import { DIMENSIONS, REPO_URL } from "@/lib/data";
import { useResults } from "@/lib/results";
import { describeScope, isClosedReference, providerBlocks, unmeasuredSuites, type Score } from "@/lib/artifacts";
import RadarSVG from "@/components/RadarSVG";
import SectionHead from "@/components/SectionHead";
import { Badge } from "@/components/ui/badge";

export default function SafetyCard() {
  const results = useResults();
  const runs = results.runs.filter((entry) => !entry.card.sample);
  const run = runs.find((entry) => entry.card.run_id === results.selectedRun) ?? runs[0];
  if (!run) return <section id="cards" className="scroll-mt-20 px-(--pad-x) py-(--section-gap)">
    <SectionHead clause="04 · safety cards" title="A number, with its evidence."
      lead="Each card links a model revision to its measured evaluation results." />
    {results.status === "loading" ? <p role="status" className="mt-8 text-ink-dim">Loading measured cards…</p>
      : results.status === "error" ? <div role="alert" className="mt-8 text-ink-dim">
        <p>Measured cards could not be loaded. {results.error}</p>
        <button type="button" onClick={results.retry} className="mt-3 cursor-pointer text-cobalt underline">Retry cards</button>
      </div> : <p className="mt-8 text-ink-dim">No measured cards are published yet.</p>}
  </section>;
  const scores: Score[] = run.card.scores;
  const byDimension = new Map(scores.map((score) => [score.dimension, score]));
  const concerns = run.card.concerns;
  const strengths = run.card.strengths ?? [];
  const title = run.card.model.id;

  return (
    <section id="cards" className="scroll-mt-20 px-(--pad-x) py-(--section-gap)">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10">
        <div className="min-w-0">
          <SectionHead clause="04 · safety cards" title="A number, with its evidence."
            lead="Each card links a model revision to its evaluation suites, confidence intervals, and run manifest. Unmeasured dimensions are left open." />
          <div className="mt-10">
            {<label className="mono-label flex flex-col gap-3">Inspect a run
              <select value={run.card.run_id} onChange={(event) => results.selectRun(event.target.value)}
                className="bg-paper-2 text-ink max-w-full rounded-lg border border-(--line-strong) p-3 font-sans text-sm normal-case tracking-normal">
                {runs.map((entry) => <option key={entry.card.run_id} value={entry.card.run_id}>
                  {entry.card.model.id} · {entry.card.run_id}
                </option>)}
              </select>
            </label>}
            <p className="text-ink-dim mt-6 text-sm leading-relaxed">
              The manifest records model and harness revisions, suite definitions, seeds, and sampling parameters. Hosted outputs can vary between reruns.
            </p>
            <a href={`${REPO_URL}/blob/main/docs/methodology.md`} className="mono-label mt-5 inline-block text-cobalt">Read the methodology ↗</a>
            <a href="#evidence" className="mono-label mt-4 block text-cobalt">Capability and weight-access studies ↓</a>
          </div>
        </div>
        <div className="min-w-0 lg:pt-6">
          <div className="bg-paper-2 press-ink relative rounded-xl border border-(--line-strong) p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="mono-label break-all text-[0.6rem]">{run.card.run_id}</p>
              <Badge variant="stamp">measured · research artifact</Badge>
            </div>
            <h3 className="font-display mt-6 break-words text-[1.9rem] leading-tight font-[600]">{title}</h3>
            {isClosedReference(title) && <p className="mono-label mt-3 text-cobalt">Closed-model reference · hosted API</p>}
            <p className="mono-label mt-3 break-all text-[0.6rem]">{`revision · ${run.card.model.revision}`}</p>
            {<p className="text-ink-dim mt-4 rounded-md border border-(--line) p-3 text-sm">
              {describeScope(run.manifest)}. This card describes only the listed probes; it does not establish the model’s overall safety.
            </p>}
            {providerBlocks(run.manifest) > 0 && <p className="mt-3 rounded-md border border-warn/40 p-3 text-sm">
              {providerBlocks(run.manifest)} requests were blocked by the provider. These are excluded from model scores, which describe only unblocked responses.
            </p>}
            <div className="mt-7 grid gap-5 sm:grid-cols-[minmax(0,1fr)_170px]">
              <ul className="border-t border-(--line)">{DIMENSIONS.map((dimension) => {
                const score = byDimension.get(dimension.key);
                return <li key={dimension.key} className="border-b border-(--line) py-3">
                  <div className="flex items-center justify-between gap-4">
                    <abbr title={dimension.name} className="font-mono text-xs no-underline" style={{ color: dimension.hue.ink }}>{dimension.abbr}</abbr>
                    <span className="tnum font-mono text-sm">{score ? score.value.toFixed(1) : "not measured"}</span>
                  </div>
                  {score && <><div className="bg-ink/8 mt-2 h-1 overflow-hidden rounded-full"><div className="h-full" style={{ width: `${score.value}%`, background: dimension.hue.bright }} /></div>
                    <p className="text-ink-mute mt-1 text-right font-mono text-[0.65rem]">{Math.round(score.confidence_interval.level * 100)}% interval: {score.confidence_interval.low.toFixed(1)}–{score.confidence_interval.high.toFixed(1)}</p></>}
                  {!score && unmeasuredSuites(run.manifest).some((suite) => suite.dimension === dimension.key)
                    && <p className="text-ink-dim mt-2 text-xs">Too few unblocked responses to estimate a model score.</p>}
                </li>;
              })}</ul>
              <div className="mx-auto"><RadarSVG values={DIMENSIONS.map((dimension) => byDimension.get(dimension.key)?.value ?? null)} size={170} /></div>
            </div>
            <p className="mono-label mt-7 text-flag">Scope and limitations</p>
            {<p className="text-ink-dim mt-3 text-sm leading-relaxed">
              Scores include failures to follow the required output format. A low score alone does not establish unsafe behavior.{" "}
              <a href={`${REPO_URL}/blob/main/docs/methodology.md#reading-low-scores`} className="text-cobalt underline">Read the scoring notes ↗</a>
            </p>}
            <ul className="text-ink-dim mt-3 space-y-2 text-sm leading-relaxed">{concerns.map((concern) => <li key={concern}>{concern}</li>)}</ul>
            {strengths.length > 0 && <><p className="mono-label mt-6 text-pass">Recorded strengths</p><ul className="mt-3 space-y-2 text-sm">{strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></>}
            {<details className="mt-6 border-t border-(--line) pt-4"><summary className="mono-label cursor-pointer">Suites and provenance</summary>
              <ul className="mt-4 space-y-4 text-sm">{run.manifest.suites.map((suite) => <li key={suite.id}>
                <p className="font-medium">{suite.id} · {suite.version} · {String(suite.parameters.maturity ?? "scope in manifest")}</p>
                <p className="text-ink-dim">{suite.scoring_method}; {suite.interval_method}</p>
              </li>)}</ul>
              <p className="text-ink-mute mt-4 break-all font-mono text-xs">Harness {run.manifest.harness.version} · seed {run.manifest.seed} · completed {run.manifest.completed_at}</p>
            </details>}
            {<div className="mt-6 flex flex-wrap gap-4">
              <a href={`/results/cards/${run.card.run_id}.json`} download className="mono-label text-cobalt">Download card ↗</a>
              <a href={`/results/manifests/${run.card.run_id}.json`} download className="mono-label text-cobalt">Download manifest ↗</a>
            </div>}
          </div>
        </div>
      </div>
    </section>
  );
}
