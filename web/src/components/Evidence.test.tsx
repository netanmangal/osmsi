import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Evidence from "./Evidence";
import { loadEvidence, type EvidenceReport } from "@/lib/evidence";
vi.mock("@/lib/evidence", () => ({ loadEvidence: vi.fn() }));
vi.mock("@/lib/anim", () => ({ ScrollTrigger: { refresh: vi.fn() } }));
const report: EvidenceReport = {
  schema_version: "1.0", report_id: "test-study", dimension: "in", sample: false,
  model: { id: "test-model", revision: "abc" }, created_at: "2026-11-16T00:00:00Z",
  methodology: { id: "test", version: "1", description: "Measured effect.", references: ["https://example.com/method"] },
  metrics: [{ id: "effect", label: "Patch effect", value: -0.2, unit: "logit difference", direction: "higher_more_recovery" }],
  provenance: {}, findings: ["Observed finding."], limitations: ["Narrow task only."],
};
beforeEach(() => vi.mocked(loadEvidence).mockReset());
describe("evidence presentation", () => {
  it("shows native units, limits, downloads, and distinct model selections", async () => {
    vi.mocked(loadEvidence).mockResolvedValue([report, { ...report, report_id: "other-study", model: { id: "other-model", revision: "def" } }]);
    render(<Evidence />);
    expect(await screen.findByText("Narrow task only.")).toBeInTheDocument();
    expect(screen.getByText("logit difference")).toBeInTheDocument();
    expect(screen.getByText(/-0.2/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "other-study" } });
    expect(screen.getByRole("heading", { name: "other-model" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download evidence/ })).toHaveAttribute("href", "/evidence/reports/other-study.json");
  });
  it("shows request failures and retries without sample substitution", async () => {
    vi.mocked(loadEvidence).mockRejectedValueOnce(new Error("Digest mismatch")).mockResolvedValueOnce([report]);
    render(<Evidence />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Digest mismatch");
    fireEvent.click(screen.getByRole("button", { name: "Retry evidence" }));
    expect(await screen.findByText("Narrow task only.")).toBeInTheDocument();
    expect(loadEvidence).toHaveBeenCalledTimes(2);
  });
});
