/* Dimension descriptions; production measurements come from published runs. */

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
      "Attempts to override an explicit policy boundary. Does the model preserve the required response under conflicting instructions?",
    probe: "pilot: synthetic policy-boundary probes",
    hue: { ink: "#2036c8", bright: "#2036c8" },
  },
  {
    key: "hc",
    index: "02",
    name: "Harmful capability",
    abbr: "CAP",
    blurb:
      "Cybersecurity knowledge accuracy. Higher means more expressed knowledge, not greater safety; provider filtering and capability limits remain visible.",
    probe: "cloud proxy: 128 fixed WMDP-Cyber questions",
    hue: { ink: "#b03a24", bright: "#d95c40" },
  },
  {
    key: "pi",
    index: "03",
    name: "Prompt injection",
    abbr: "INJ",
    blurb:
      "Instructions embedded in untrusted documents. Does the model preserve the boundary between source text and governing instructions?",
    probe: "pilot: untrusted-document instruction boundaries",
    hue: { ink: "#8f6410", bright: "#c98a1f" },
  },
  {
    key: "uc",
    index: "04",
    name: "Uncertainty calibration",
    abbr: "CAL",
    blurb:
      "Confidence should track correctness. We compare reported confidence with answer accuracy and disclose malformed outputs.",
    probe: "pilot: confidence and Brier loss",
    hue: { ink: "#20706c", bright: "#2f8f8a" },
  },
  {
    key: "ag",
    index: "05",
    name: "Agentic safety",
    abbr: "AGT",
    blurb:
      "Simulated tool requests and permission boundaries. Does the model choose to read, ask for authorization, or stop?",
    probe: "pilot: simulated tool-authorization decisions",
    hue: { ink: "#7c3f73", bright: "#a05893" },
  },
  {
    key: "in",
    index: "06",
    name: "Interpretability",
    abbr: "INT",
    blurb:
      "The cloud index tests rationale selection on controlled problems. Separate weight-access studies examine internal states; the behavioral proxy is not a mechanistic interpretability grade.",
    probe: "cloud proxy: 64 rationale checks; separate activation studies",
    hue: { ink: "#256e47", bright: "#3f9e6b" },
  },
];

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
    blurb: "Collect model candidates from the public registry. Review licensing and backend availability before a run.",
    hue: { ink: "#2036c8", bright: "#2036c8" },
  },
  {
    index: "02",
    name: "Pin",
    blurb: "Record model and harness revisions, versioned probes, seeds, and sampling parameters in the run manifest.",
    hue: { ink: "#8f6410", bright: "#c98a1f" },
  },
  {
    index: "03",
    name: "Run",
    blurb: "Run the selected pilot or contributed suites with explicit request budgets. Failures stay in the attempt journal.",
    hue: { ink: "#b03a24", bright: "#d95c40" },
  },
  {
    index: "04",
    name: "Score",
    blurb: "Report each measured dimension with its interval and limitations. Leave unmeasured dimensions open.",
    hue: { ink: "#20706c", bright: "#2f8f8a" },
  },
  {
    index: "05",
    name: "Publish",
    blurb: "Validate and review the bundle, then publish its cards and manifests to the static index.",
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
  { label: "Evidence", href: "#evidence" },
  { label: "Contribute", href: "#contribute" },
];

/* Opens Gmail compose pre-addressed to us (house contact pattern). */
export const CONTACT_URL =
  "https://mail.google.com/mail/?view=cm&fs=1&to=netan%40disobedientgeometry.com&su=OSMSI%20%C2%B7%20pilots%2C%20suites%2C%20partnerships";

export const REPO_URL = "https://github.com/netanmangal/osmsi";
