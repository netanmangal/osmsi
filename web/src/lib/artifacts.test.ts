import { afterEach, describe, expect, it, vi } from "vitest";
import cardFixture from "../../../sdk/python/tests/fixtures/sample-run/cards/sample-a-001.json";
import manifestFixture from "../../../sdk/python/tests/fixtures/sample-run/manifests/sample-a-001.json";
import indexFixture from "../../../sdk/python/tests/fixtures/sample-run/index.json";
import { describeScope, loadResults, parseIndex, parseRun, protocolKey } from "./artifacts";

afterEach(() => vi.unstubAllGlobals());

describe("shared artifact contracts", () => {
  it("reads the same sample bundle as the Python SDK", () => {
    const index = parseIndex(indexFixture);
    const run = parseRun(cardFixture, manifestFixture, index.entries[0]);
    expect(run.card.scores[0].dimension).toBe("uc");
    expect(run.card.sample).toBe(true);
  });
  it("rejects inconsistent revisions", () => {
    const card = structuredClone(cardFixture);
    card.model.revision = "changed";
    expect(() => parseRun(card, manifestFixture, parseIndex(indexFixture).entries[0])).toThrow(/provenance/);
  });
  it("rejects duplicate dimensions and impossible intervals", () => {
    const card = structuredClone(cardFixture);
    card.scores.push(card.scores[0]);
    expect(() => parseRun(card, manifestFixture, parseIndex(indexFixture).entries[0])).toThrow();
    card.scores.pop();
    card.scores[0].confidence_interval.low = 99;
    expect(() => parseRun(card, manifestFixture, parseIndex(indexFixture).entries[0])).toThrow(/scores/);
  });
  it("rejects aggregate scores and unknown versions", () => {
    expect(() => parseRun({ ...cardFixture, aggregate_score: 100 }, manifestFixture, parseIndex(indexFixture).entries[0])).toThrow();
    expect(() => parseIndex({ ...indexFixture, schema_version: "2.0" })).toThrow();
  });
  it("loads linked artifacts and surfaces failed requests", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => indexFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => cardFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => manifestFixture });
    vi.stubGlobal("fetch", fetcher);
    expect(await loadResults()).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
    fetcher.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(loadResults()).rejects.toThrow("503");
  });
  it("keeps different protocols separate and counts filtered-only suites in scope", () => {
    const run = parseRun(cardFixture, manifestFixture, parseIndex(indexFixture).entries[0]);
    const changed = structuredClone(run.manifest);
    changed.suites[0].dataset_revision = "different-probes";
    expect(protocolKey(changed)).not.toBe(protocolKey(run.manifest));
    changed.suites[0].parameters.n_probes = 2;
    changed.parameters.unmeasured_suites = [{ id: "blocked", dimension: "pi", n_probes: 8, dataset_revision: "sha256:blocked" }];
    expect(describeScope(changed)).toBe("pilot · 10 probes");
  });
});
