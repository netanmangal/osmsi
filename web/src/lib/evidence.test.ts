import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEvidence, parseEvidenceReport, type EvidenceReport } from "./evidence";

export const fixture: EvidenceReport = {
  schema_version: "1.0", report_id: "test-evidence", dimension: "in", sample: false,
  model: { id: "test-model", revision: "test-revision" }, created_at: "2026-11-16T00:00:00Z",
  methodology: { id: "test", version: "1", description: "Controlled fixture.", references: ["https://example.com/method"] },
  metrics: [{ id: "recovery", label: "Recovery", value: -0.2, unit: "logits", direction: "higher_more_recovery" }],
  provenance: {}, findings: ["An effect."], limitations: ["Fixture only."],
};
afterEach(() => vi.unstubAllGlobals());

describe("scoped evidence", () => {
  it("preserves negative native units without introducing a safety grade", () => {
    expect(parseEvidenceReport(fixture).metrics[0].value).toBe(-0.2);
    expect(() => parseEvidenceReport({ ...fixture, sample: true })).toThrow(/Sample/);
    expect(() => parseEvidenceReport({ ...fixture, safety_score: 100 })).toThrow(/schema/);
  });
  it("verifies the report bytes and indexed identity", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const bytes = new TextEncoder().encode(JSON.stringify(fixture));
    const hash = Buffer.from(await webcrypto.subtle.digest("SHA-256", bytes)).toString("hex");
    const index = { schema_version: "1.0", reports: [{
      report_id: fixture.report_id, model_id: fixture.model.id, dimension: "in", sha256: hash,
    }] };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => index })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => bytes.buffer });
    vi.stubGlobal("fetch", fetcher);
    expect(await loadEvidence()).toEqual([fixture]);
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => index })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(fixture) + "\n").buffer });
    await expect(loadEvidence()).rejects.toThrow(/digest/);
    index.reports[0].model_id = "wrong-model";
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => index })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => bytes.buffer });
    await expect(loadEvidence()).rejects.toThrow(/identities/);
  });
});
