import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import commonSchema from "../../../sdk/python/src/osmsi/_schemas/v1/common.json";
import indexSchema from "../../../sdk/python/src/osmsi/_schemas/v1/evidence-index.json";
import reportSchema from "../../../sdk/python/src/osmsi/_schemas/v1/evidence-report.json";

export interface EvidenceMetric {
  id: string; label: string; value: number | null; unit: string;
  direction: "descriptive" | "higher_more_capable" | "higher_more_recovery";
  n?: number; note?: string;
  interval?: { low: number; high: number; level: number; method: string };
}
export interface EvidenceReport {
  schema_version: "1.0"; report_id: string; dimension: "hc" | "in"; sample: boolean;
  model: { id: string; revision: string }; created_at: string;
  methodology: { id: string; version: string; description: string; references: string[] };
  metrics: EvidenceMetric[]; findings: string[]; limitations: string[];
  provenance: Record<string, unknown>;
}
interface EvidenceIndex {
  schema_version: "1.0";
  reports: { report_id: string; model_id: string; dimension: "hc" | "in"; sha256: string }[];
}
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(commonSchema);
const validIndex = ajv.compile<EvidenceIndex>(indexSchema);
const validReport = ajv.compile<EvidenceReport>(reportSchema);

export function parseEvidenceReport(value: unknown): EvidenceReport {
  if (!validReport(value)) throw new Error("Evidence report does not match its schema.");
  if (value.sample) throw new Error("Sample evidence is not a published measurement.");
  if (new Set(value.metrics.map((m) => m.id)).size !== value.metrics.length
    || value.metrics.some((m) => m.interval && (m.value === null || m.interval.low > m.value || m.interval.high < m.value))) {
    throw new Error("Evidence metric identities or intervals are inconsistent.");
  }
  return value;
}

export async function loadEvidence(signal?: AbortSignal): Promise<EvidenceReport[]> {
  const response = await fetch("/evidence/evidence-index.json", { signal, cache: "no-cache" });
  if (!response.ok) throw new Error(`Evidence index request failed (${response.status}).`);
  const index: unknown = await response.json();
  if (!validIndex(index) || index.reports.length > 100 || new Set(index.reports.map((r) => r.report_id)).size !== index.reports.length) {
    throw new Error("Evidence index is invalid.");
  }
  const reports: EvidenceReport[] = [];
  for (let offset = 0; offset < index.reports.length; offset += 8) {
    const batch = await Promise.all(index.reports.slice(offset, offset + 8).map(async (entry) => {
      const result = await fetch(`/evidence/reports/${entry.report_id}.json`, { signal, cache: "no-cache" });
      if (!result.ok) throw new Error(`Evidence report request failed (${result.status}).`);
      const bytes = await result.arrayBuffer();
      if (bytes.byteLength > 5_000_000) throw new Error("Evidence report exceeds the download limit.");
      const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (digest !== entry.sha256) throw new Error("Evidence report digest does not match the index.");
      const report = parseEvidenceReport(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
      if (report.report_id !== entry.report_id || report.dimension !== entry.dimension || report.model.id !== entry.model_id) {
        throw new Error("Evidence report and index identities differ.");
      }
      return report;
    }));
    reports.push(...batch);
  }
  return reports;
}
