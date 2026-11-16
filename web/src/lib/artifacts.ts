import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import commonSchema from "../../../sdk/python/src/osmsi/_schemas/v1/common.json";
import cardSchema from "../../../sdk/python/src/osmsi/_schemas/v1/safety-card.json";
import manifestSchema from "../../../sdk/python/src/osmsi/_schemas/v1/run-manifest.json";
import indexSchema from "../../../sdk/python/src/osmsi/_schemas/v1/index.json";
import type { DimKey } from "./data";

export interface ModelIdentity { id: string; revision: string }
export interface Score {
  dimension: DimKey;
  suite_id: string;
  value: number;
  confidence_interval: { low: number; high: number; level: number };
}
export interface CardArtifact {
  schema_version: "1.0";
  run_id: string;
  sample: boolean;
  model: ModelIdentity;
  scores: Score[];
  concerns: string[];
  strengths: string[];
}
export interface ManifestArtifact {
  schema_version: "1.0";
  run_id: string;
  sample: boolean;
  model: ModelIdentity;
  harness: { version: string; revision: string };
  started_at: string;
  completed_at: string;
  seed: number;
  parameters: Record<string, unknown>;
  suites: {
    id: string; dimension: DimKey; version: string; dataset_revision: string;
    scoring_method: string; interval_method: string; parameters: Record<string, unknown>;
  }[];
}
export interface PublishedRun { card: CardArtifact; manifest: ManifestArtifact }
export function describeScope(manifest: ManifestArtifact): string {
  const pilot = manifest.suites.some((suite) => suite.parameters.maturity !== "reviewed");
  const counts = manifest.suites.map((suite) => suite.parameters.n_probes);
  const count = counts.every((n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0)
    ? (counts as number[]).reduce((sum, n) => sum + n, 0) : null;
  return `${pilot ? "pilot" : "measured"}${count === null ? "" : ` · ${count} probes`}`;
}
export interface IndexArtifact {
  schema_version: "1.0";
  entries: { run_id: string; model_id: string; sample: boolean }[];
}

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(commonSchema);
const cardValid = ajv.compile<CardArtifact>(cardSchema);
const manifestValid = ajv.compile<ManifestArtifact>(manifestSchema);
const indexValid = ajv.compile<IndexArtifact>(indexSchema);

export function parseIndex(value: unknown): IndexArtifact {
  if (!indexValid(value)) throw new Error("The published index does not match the artifact schema.");
  if (new Set(value.entries.map((entry) => entry.run_id)).size !== value.entries.length) {
    throw new Error("The published index contains duplicate runs.");
  }
  return value;
}

export function parseRun(card: unknown, manifest: unknown, entry: IndexArtifact["entries"][number]): PublishedRun {
  if (!cardValid(card) || !manifestValid(manifest)) {
    throw new Error("A published card or manifest does not match the artifact schema.");
  }
  if (card.run_id !== entry.run_id || manifest.run_id !== entry.run_id ||
      card.model.id !== entry.model_id || manifest.model.id !== card.model.id ||
      manifest.model.revision !== card.model.revision ||
      card.sample !== entry.sample || manifest.sample !== card.sample) {
    throw new Error("A published run has inconsistent provenance.");
  }
  const dimensions = new Set(card.scores.map((score) => score.dimension));
  const suites = new Map(manifest.suites.map((suite) => [suite.id, suite.dimension]));
  if (dimensions.size !== card.scores.length || suites.size !== manifest.suites.length ||
      new Set(manifest.suites.map((suite) => suite.dimension)).size !== manifest.suites.length ||
      new Set(card.scores.map((score) => score.suite_id)).size !== card.scores.length ||
      suites.size !== card.scores.length ||
      card.scores.some((score) => suites.get(score.suite_id) !== score.dimension ||
        score.confidence_interval.low > score.value || score.value > score.confidence_interval.high) ||
      new Date(manifest.completed_at) < new Date(manifest.started_at)) {
    throw new Error("A published run has inconsistent scores or suite coverage.");
  }
  return { card, manifest };
}

export async function loadResults(signal?: AbortSignal): Promise<PublishedRun[]> {
  const read = async (path: string) => {
    const response = await fetch(`/results/${path}`, { signal, cache: "no-cache" });
    if (!response.ok) throw new Error(`Results request failed (${response.status}).`);
    return response.json() as Promise<unknown>;
  };
  const index = parseIndex(await read("index.json"));
  // Load in modest batches so larger static indexes do not fan out unbounded requests.
  const runs: PublishedRun[] = [];
  for (let offset = 0; offset < index.entries.length; offset += 8) {
    const batch = await Promise.all(index.entries.slice(offset, offset + 8).map(async (entry) => {
      const [card, manifest] = await Promise.all([
        read(`cards/${entry.run_id}.json`), read(`manifests/${entry.run_id}.json`),
      ]);
      return parseRun(card, manifest, entry);
    }));
    runs.push(...batch);
  }
  return runs;
}
