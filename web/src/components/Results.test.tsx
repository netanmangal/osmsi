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

const run = parseRun(cardFixture, manifestFixture, {
  run_id: "sample-a-001", model_id: "specimen-a", sample: true,
});
const state: ResultsState = { status: "ready", runs: [], selectRun: vi.fn(), retry: vi.fn() };

describe("result presentation", () => {
  it("keeps sample rows behind an explicit preview choice", () => {
    render(<ResultsContext.Provider value={state}><Leaderboard /></ResultsContext.Provider>);
    expect(screen.getByText(/No reviewed model evaluations/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Include sample specimens"));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Specimen A")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Specimen F" } });
    expect(screen.getByText("Specimen F")).toBeInTheDocument();
    expect(screen.queryByText("Specimen A")).not.toBeInTheDocument();
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
});
