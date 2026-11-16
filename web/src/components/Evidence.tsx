import { useEffect, useState } from "react";
import SectionHead from "@/components/SectionHead";
import { loadEvidence, type EvidenceReport } from "@/lib/evidence";
import { REPO_URL } from "@/lib/data";
import { ScrollTrigger } from "@/lib/anim";

function number(value: number | null) {
  return value === null ? "not identifiable" : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export default function Evidence() {
  const [reports, setReports] = useState<EvidenceReport[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    loadEvidence(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setReports(result); setStatus("ready"); }
    }).catch((reason) => {
      if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Unavailable"); setStatus("error"); }
    });
    return () => controller.abort();
  }, [retry]);
  const report = reports.find((r) => r.report_id === selected) ?? reports[0];
  useEffect(() => {
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [status, report?.report_id]);
  return (
    <section id="evidence" className="scroll-mt-20 px-(--pad-x) py-(--section-gap)">
      <SectionHead clause="06 · scoped studies" title="Capability and causal evidence."
        lead="Hazard-related knowledge and activation interventions need their own units, controls, and limits. Inspect the measured effect alongside its method." />
      <p className="text-ink-dim mt-6 max-w-[75ch] text-sm leading-relaxed">
        Higher knowledge accuracy indicates more capability. Causal recovery describes one tested behavior.
        Neither is a model-wide safety grade, and these studies do not fill unrelated runs’ missing scores.
      </p>
      {status === "loading" && <p role="status" className="mt-8 text-ink-dim">Loading scoped evidence…</p>}
      {status === "error" && <div role="alert" className="mt-8 rounded-lg border border-flag/40 p-4">
        <p>Scoped evidence could not be loaded. {error}</p>
        <button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-2 cursor-pointer text-cobalt underline">Retry evidence</button>
      </div>}
      {status === "ready" && !report && <p className="mt-8 text-ink-dim">No scoped evidence reports are published yet.</p>}
      {status === "ready" && report && <>
        <label className="mono-label mt-9 flex max-w-xl flex-col gap-3">
          Inspect a scoped study
          <select value={report.report_id} onChange={(e) => setSelected(e.target.value)}
            className="bg-paper-2 text-ink max-w-full rounded-lg border border-(--line-strong) p-3 font-sans text-sm normal-case tracking-normal">
            {reports.map((r) => <option key={r.report_id} value={r.report_id}>
              {r.dimension === "hc" ? "Capability" : "Causal tracing"} · {r.model.id}
            </option>)}
          </select>
        </label>
        <article className="bg-paper-2 mt-7 rounded-xl border border-(--line-strong) p-5 sm:p-8">
          <p className="mono-label break-all text-[0.65rem]">{report.report_id}</p>
          <h3 className="font-display mt-4 break-words text-2xl">{report.model.id}</h3>
          <p className="text-ink-dim mt-4 max-w-[85ch] text-sm leading-relaxed">{report.methodology.description}</p>
          <dl className="mt-7 grid gap-4 md:grid-cols-2">
            {report.metrics.map((metric) => <div key={metric.id} className="rounded-lg border border-(--line) p-4">
              <dt className="text-ink-dim text-sm">{metric.label}</dt>
              <dd className="mt-2 break-words font-mono text-xl">{number(metric.value)}
                {metric.value !== null && <span className="text-ink-mute ml-2 text-xs">{metric.unit}</span>}
              </dd>
              {metric.n !== undefined && <p className="text-ink-mute mt-2 font-mono text-xs">n = {metric.n.toLocaleString()}</p>}
              {metric.interval && <p className="text-ink-dim mt-2 text-xs">
                {Math.round(metric.interval.level * 100)}% interval: {number(metric.interval.low)}–{number(metric.interval.high)}
              </p>}
              {metric.note && <p className="text-ink-dim mt-2 text-xs leading-relaxed">{metric.note}</p>}
            </div>)}
          </dl>
          <p className="mono-label mt-8">Observed findings</p>
          <ul className="text-ink-dim mt-3 max-w-[90ch] list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {report.findings.map((finding) => <li key={finding}>{finding}</li>)}
          </ul>
          <p className="mono-label mt-7 text-flag">Scope and limitations</p>
          <ul className="text-ink-dim mt-3 max-w-[90ch] list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
          <p className="text-ink-mute mt-7 break-all font-mono text-xs">Model revision · {report.model.revision}</p>
          <details className="mt-5 border-t border-(--line) pt-4">
            <summary className="mono-label cursor-pointer">Method references</summary>
            <ul className="mt-3 space-y-2 text-sm">{report.methodology.references.map((ref) => <li key={ref}>
              {ref.startsWith("https://") ? <a className="break-all text-cobalt underline" href={ref} target="_blank" rel="noreferrer">{ref}</a> : ref}
            </li>)}</ul>
          </details>
          <div className="mt-7 flex flex-wrap gap-5">
            <a href={`/evidence/reports/${report.report_id}.json`} download className="mono-label text-cobalt">Download evidence JSON ↗</a>
            <a href={`${REPO_URL}/tree/main/data/evidence`} className="mono-label text-cobalt">Read the study reports ↗</a>
          </div>
        </article>
      </>}
    </section>
  );
}
