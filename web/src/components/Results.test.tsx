import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import cardFixture from "../../../sdk/python/tests/fixtures/sample-run/cards/sample-a-001.json";
import manifestFixture from "../../../sdk/python/tests/fixtures/sample-run/manifests/sample-a-001.json";
import { ResultsContext, type ResultsState } from "@/lib/results";
import { parseRun } from "@/lib/artifacts";
import Leaderboard from "./Leaderboard";
import SafetyCard from "./SafetyCard";
import RadarSVG from "./RadarSVG";
import Hero from "./Hero";

vi.mock("@/lib/anim", () => ({ scrollToHash: vi.fn(), prefersReduced: () => true, gsap: {} }));
vi.mock("@/lib/preload", () => ({
  webglAvailable: () => true,
  importProvingBench: vi.fn(() => Promise.resolve({ default: () => null })),
}));
vi.mock("@/components/deco/BandScallop", () => ({ default: () => null }));
vi.mock("@/components/deco/RevisionCloud", () => ({ default: () => null }));

const sampleRun = parseRun(cardFixture, manifestFixture, {
  run_id: "sample-a-001", model_id: "specimen-a", sample: true,
});
const measuredModel = { ...sampleRun.card.model, id: "measured-model" };
const run = { card: { ...sampleRun.card, sample: false, model: measuredModel },
  manifest: { ...sampleRun.manifest, sample: false, model: measuredModel } };
const state: ResultsState = { status: "ready", runs: [], selectRun: vi.fn(), retry: vi.fn() };

describe("result presentation", () => {
  it("never offers sample specimens on production pages", () => {
    render(<ResultsContext.Provider value={{ ...state, runs: [sampleRun] }}><Leaderboard /><SafetyCard /></ResultsContext.Provider>);
    expect(screen.getByText(/No reviewed model evaluations/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Specimen A")).not.toBeInTheDocument();
    expect(screen.getByText(/No measured cards/)).toBeInTheDocument();
  });
  it("keeps every measured row searchable in a keyboard-scrollable index", () => {
    const runs = Array.from({ length: 25 }, (_, i) => ({ ...run, card: { ...run.card,
      run_id: `measured-${i}`, model: { ...run.card.model, id: `Model ${String(i).padStart(2, "0")}` },
      scores: run.card.scores.map((score) => ({ ...score, value: i })),
    } }));
    render(<ResultsContext.Provider value={{ ...state, runs }}><Leaderboard /></ResultsContext.Provider>);
    expect(screen.getByText(/Top 10 of 25/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Model evaluation index" })).toHaveAttribute("tabindex", "0");
    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Model 24");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Model 00" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Model 00")).toBeInTheDocument();
  });
  it("renders explicit missing measurements and downloadable provenance", () => {
    render(<ResultsContext.Provider value={{ ...state, runs: [run] }}><SafetyCard /></ResultsContext.Provider>);
    expect(screen.getAllByText("not measured")).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Download manifest/ })).toHaveAttribute("href", "/results/manifests/sample-a-001.json");
    expect(screen.queryByText("band")).not.toBeInTheDocument();
  });
  it("shows loading failures and offers retry", () => {
    render(<ResultsContext.Provider value={{ ...state, status: "error", error: "Unavailable" }}><Leaderboard /></ResultsContext.Provider>);
    expect(screen.getByRole("alert")).toHaveTextContent("Unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.retry).toHaveBeenCalled();
  });
  it("does not turn missing radar measurements into zero scores", () => {
    const { container } = render(<RadarSVG values={[null, null, null, 75, null, null]} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(/JBR not measured/);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
    expect(container.querySelectorAll("polygon")).toHaveLength(4);
  });
  it("uses a static hero when reduced motion is requested", () => {
    render(<ResultsContext.Provider value={state}><Hero /></ResultsContext.Provider>);
    expect(screen.getByLabelText("Static six-dimension instrument")).toBeInTheDocument();
  });
  it("discloses provider blocks separately from model scores", () => {
    const filtered = { ...run, manifest: { ...run.manifest, parameters: {
      ...run.manifest.parameters, provider_blocked_requests: 12,
    } } };
    render(<ResultsContext.Provider value={{ ...state, runs: [filtered] }}><SafetyCard /></ResultsContext.Provider>);
    expect(screen.getByText(/12 requests were blocked by the provider/)).toBeInTheDocument();
    expect(screen.getAllByText("not measured")).toHaveLength(5);
  });
  it("explains token-limited outputs without counting provider blocks as model truncations", () => {
    const limited = { ...run, manifest: { ...run.manifest, parameters: {
      ...run.manifest.parameters, max_tokens: 600, observations: [
        { finish_reason: "length", provider_blocked: false },
        { finish_reason: "length", provider_blocked: true },
      ],
    } } };
    render(<ResultsContext.Provider value={{ ...state, runs: [limited] }}><SafetyCard /></ResultsContext.Provider>);
    expect(screen.getByText(/1 response reached the 600-token output limit/)).toBeInTheDocument();
  });
});
