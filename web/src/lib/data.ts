/* All specimen figures are illustrative: they demonstrate the index format.
   House rule: no fabricated statistics attached to real model names, so real
   names appear only when real harness runs publish. */

export type DimKey = "jb" | "hc" | "pi" | "uc" | "ag" | "in";

export interface Hue {
  ink: string; /* text-safe on paper */
  bright: string; /* bars, marks, fills */
}

export interface Dimension {
  key: DimKey;
  index: string;
  name: string;
  abbr: string;
  blurb: string;
  probe: string;
  hue: Hue;
}

export const DIMENSIONS: Dimension[] = [
  {
    key: "jb",
    index: "01",
    name: "Jailbreak resistance",
    abbr: "JBR",
    blurb:
      "Roleplay traps, many-shot escalation, encoded payloads. How long do refusals hold under siege?",
    probe: "2,400 attack templates · 6 escalation ladders",
    hue: { ink: "#2036c8", bright: "#2036c8" },
  },
  {
    key: "hc",
    index: "02",
    name: "Harmful capability",
    abbr: "CAP",
    blurb:
      "Uplift probes across cyber, bio, chem and fraud. What could a motivated actor actually extract?",
    probe: "capability ceilings measured, not assumed",
    hue: { ink: "#b03a24", bright: "#d95c40" },
  },
  {
    key: "pi",
    index: "03",
    name: "Prompt injection",
    abbr: "INJ",
    blurb:
      "Poisoned documents, hostile tool output, indirect orders. Does the model serve its user or its attacker?",
    probe: "142 injection vectors · 3 privilege tiers",
    hue: { ink: "#8f6410", bright: "#c98a1f" },
  },
  {
    key: "uc",
    index: "04",
    name: "Uncertainty calibration",
    abbr: "CAL",
    blurb:
      "Confidence should track correctness. We score the gap between what a model knows and what it claims.",
    probe: "ECE · Brier · selective abstention",
    hue: { ink: "#20706c", bright: "#2f8f8a" },
  },
  {
    key: "ag",
    index: "05",
    name: "Agentic safety",
    abbr: "AGT",
    blurb:
      "Tool access, long horizons, delegated authority. What happens when nobody watches the loop?",
    probe: "sandboxed agent runs · 40 task families",
    hue: { ink: "#7c3f73", bright: "#a05893" },
  },
  {
    key: "in",
    index: "06",
    name: "Interpretability",
    abbr: "INT",
    blurb:
      "Open weights should buy understanding. We probe features, circuits and deception indicators.",
    probe: "sparse autoencoders · linear probe battery",
    hue: { ink: "#256e47", bright: "#3f9e6b" },
  },
];

export interface DimScore {
  v: number; // 0 to 100
  ci: number; // ± interval
  grade: string;
}

export interface Specimen {
  id: string;
  name: string;
  arch: string;
  params: string;
  license: string;
  band: string;
  scores: Record<DimKey, DimScore>;
  flags?: string[];
  strengths?: string[];
  hash?: string;
}

export const SPECIMENS: Specimen[] = [
  {
    id: "specimen-a",
    name: "Specimen A",
    arch: "dense",
    params: "70B",
    license: "permissive",
    band: "B",
    scores: {
      jb: { v: 82, ci: 3, grade: "B+" },
      hc: { v: 74, ci: 4, grade: "B" },
      pi: { v: 61, ci: 5, grade: "C+" },
      uc: { v: 78, ci: 3, grade: "B" },
      ag: { v: 66, ci: 5, grade: "B-" },
      in: { v: 71, ci: 4, grade: "B" },
    },
    flags: [
      "Injection resistance degrades in long contexts",
      "Refusal drift after light fine-tuning",
    ],
    strengths: [
      "Refusals stable under many-shot pressure",
      "Reproduces within ±1.2 across seeds",
    ],
    hash: "run:9f3c…a41e",
  },
  {
    id: "specimen-b",
    name: "Specimen B",
    arch: "sparse MoE",
    params: "8×22B",
    license: "permissive",
    band: "C+",
    scores: {
      jb: { v: 68, ci: 4, grade: "B-" },
      hc: { v: 71, ci: 5, grade: "B" },
      pi: { v: 49, ci: 6, grade: "C" },
      uc: { v: 74, ci: 4, grade: "B" },
      ag: { v: 52, ci: 6, grade: "C" },
      in: { v: 58, ci: 5, grade: "C+" },
    },
  },
  {
    id: "specimen-c",
    name: "Specimen C",
    arch: "dense · edge",
    params: "9B",
    license: "copyleft",
    band: "B-",
    scores: {
      jb: { v: 77, ci: 3, grade: "B" },
      hc: { v: 88, ci: 2, grade: "A-" },
      pi: { v: 72, ci: 4, grade: "B" },
      uc: { v: 55, ci: 5, grade: "C" },
      ag: { v: 70, ci: 4, grade: "B" },
      in: { v: 64, ci: 4, grade: "B-" },
    },
  },
  {
    id: "specimen-d",
    name: "Specimen D",
    arch: "code-tuned",
    params: "34B",
    license: "permissive",
    band: "C",
    scores: {
      jb: { v: 59, ci: 5, grade: "C+" },
      hc: { v: 66, ci: 4, grade: "B-" },
      pi: { v: 44, ci: 6, grade: "C-" },
      uc: { v: 69, ci: 4, grade: "B-" },
      ag: { v: 47, ci: 6, grade: "C-" },
      in: { v: 61, ci: 5, grade: "C+" },
    },
  },
  {
    id: "specimen-e",
    name: "Specimen E",
    arch: "frontier preview",
    params: "120B",
    license: "restricted",
    band: "B",
    scores: {
      jb: { v: 86, ci: 2, grade: "A-" },
      hc: { v: 79, ci: 3, grade: "B+" },
      pi: { v: 70, ci: 4, grade: "B" },
      uc: { v: 84, ci: 2, grade: "A-" },
      ag: { v: 58, ci: 5, grade: "C+" },
      in: { v: 76, ci: 3, grade: "B" },
    },
    flags: [
      "Pursues sub-goals under delegated tool access",
      "Deception probes trigger at 2.1× base rate",
    ],
    strengths: [
      "Best-in-index calibration, ECE 0.06",
      "Transparent reasoning under audit prompts",
    ],
    hash: "run:5b7d…c803",
  },
  {
    id: "specimen-f",
    name: "Specimen F",
    arch: "on-device",
    params: "3B",
    license: "permissive",
    band: "B-",
    scores: {
      jb: { v: 90, ci: 2, grade: "A" },
      hc: { v: 92, ci: 2, grade: "A" },
      pi: { v: 78, ci: 3, grade: "B+" },
      uc: { v: 48, ci: 6, grade: "C-" },
      ag: { v: 74, ci: 4, grade: "B" },
      in: { v: 52, ci: 5, grade: "C" },
    },
    flags: [
      "Overconfident when wrong: ECE 0.31",
      "Interpretability probes inconclusive at this scale",
    ],
    strengths: [
      "Highest refusal integrity in class",
      "Near-zero measured harmful uplift",
    ],
    hash: "run:e21a…77f4",
  },
  {
    id: "specimen-g",
    name: "Specimen G",
    arch: "vision-language",
    params: "45B",
    license: "permissive",
    band: "C+",
    scores: {
      jb: { v: 71, ci: 4, grade: "B" },
      hc: { v: 76, ci: 3, grade: "B" },
      pi: { v: 57, ci: 5, grade: "C+" },
      uc: { v: 71, ci: 4, grade: "B" },
      ag: { v: 62, ci: 5, grade: "B-" },
      in: { v: 55, ci: 5, grade: "C" },
    },
  },
  {
    id: "specimen-h",
    name: "Specimen H",
    arch: "reasoning-tuned",
    params: "20B",
    license: "copyleft",
    band: "B",
    scores: {
      jb: { v: 80, ci: 3, grade: "B+" },
      hc: { v: 72, ci: 4, grade: "B" },
      pi: { v: 66, ci: 4, grade: "B-" },
      uc: { v: 81, ci: 3, grade: "B+" },
      ag: { v: 64, ci: 5, grade: "B-" },
      in: { v: 79, ci: 3, grade: "B+" },
    },
  },
];

export const CARD_SPECIMENS = ["specimen-a", "specimen-f", "specimen-e"] as const;

export interface PipelineStep {
  index: string;
  name: string;
  blurb: string;
  hue: Hue;
}

export const PIPELINE: PipelineStep[] = [
  {
    index: "01",
    name: "Watch",
    blurb: "New open-weight releases are detected within hours, straight from the hubs and registries.",
    hue: { ink: "#2036c8", bright: "#2036c8" },
  },
  {
    index: "02",
    name: "Pin",
    blurb: "Weights, tokenizer, harness and seeds are version-locked. Every run is addressable forever.",
    hue: { ink: "#8f6410", bright: "#c98a1f" },
  },
  {
    index: "03",
    name: "Run",
    blurb: "Six suites execute in sandboxed pipelines. Same hardware class, same budgets, no cherry-picking.",
    hue: { ink: "#b03a24", bright: "#d95c40" },
  },
  {
    index: "04",
    name: "Score",
    blurb: "Each dimension ships with confidence intervals and failure exhibits. Never a single aggregate.",
    hue: { ink: "#20706c", bright: "#2f8f8a" },
  },
  {
    index: "05",
    name: "Publish",
    blurb: "A Safety Card and an index row go public, with diffs against the previous harness version.",
    hue: { ink: "#256e47", bright: "#3f9e6b" },
  },
];

export const MARQUEE_FAMILIES = [
  "LLAMA",
  "QWEN",
  "MISTRAL",
  "GEMMA",
  "DEEPSEEK",
  "PHI",
  "OLMO",
  "FALCON",
  "NEMOTRON",
  "AYA",
  "GRANITE",
  "INTERNLM",
];

export const MARQUEE_SUITES = [
  "JAILBREAK RESISTANCE",
  "HARMFUL CAPABILITY",
  "PROMPT INJECTION",
  "CALIBRATION",
  "AGENTIC SAFETY",
  "INTERPRETABILITY",
];

export interface Partner {
  name: string;
  href: string;
  src: string;
  /** width / height of the artwork, so the mask keeps its proportions */
  aspect: number;
}

/* Real partners only. The strip starts looping on its own once there are
   three or more; see components/Partners.tsx. */
export const PARTNERS: Partner[] = [
  {
    name: "BlueDot Impact",
    href: "https://bluedot.org/",
    src: "/partners/bluedot-impact.svg",
    aspect: 1003 / 133,
  },
];

export const NAV_LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "Dimensions", href: "#dimensions" },
  { label: "Method", href: "#method" },
  { label: "Cards", href: "#cards" },
  { label: "Index", href: "#index" },
  { label: "Contribute", href: "#contribute" },
];

/* Opens Gmail compose pre-addressed to us (house contact pattern). */
export const CONTACT_URL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=netan%40disobedientgeometry.com&su=OSMSI%20%C2%B7%20pilots%2C%20suites%2C%20partnerships";

export const REPO_URL = "https://github.com/netanmangal/osmsi";
