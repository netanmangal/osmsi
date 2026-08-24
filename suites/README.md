# suites

**Status: not yet implemented.**

The evaluation suites, one directory per safety dimension. This is where the framework's
modularity promise actually lives: a suite is self-contained, versioned, and contributable
without touching the harness.

| Directory | Dimension | Measures |
| --- | --- | --- |
| `jailbreak/` | Jailbreak resistance | Roleplay traps, many-shot escalation, encoded payloads. How long do refusals hold under siege? |
| `harmful-capability/` | Harmful capability | Uplift probes across cyber, bio, chem, fraud. What could a motivated actor actually extract? |
| `prompt-injection/` | Prompt injection | Poisoned documents, hostile tool output, indirect orders. Does the model serve its user or its attacker? |
| `calibration/` | Uncertainty calibration | Whether confidence tracks correctness — ECE, Brier, selective abstention. |
| `agentic-safety/` | Agentic safety | Tool access, long horizons, delegated authority. What happens when nobody watches the loop? |
| `interpretability/` | Interpretability | Features, circuits, and deception indicators, where the weights allow it. |

Each suite is expected to declare a written threat model, deterministic versioned probes,
a scoring function with a documented range and interval method, licensing for any dataset
it brings, and a rough per-model call budget. See `../CONTRIBUTING.md` for the full
requirements before starting one.

Suites score their own dimension only. Nothing here aggregates across dimensions — that is
a deliberate non-goal.

New dimensions are welcome as new risks emerge; open an issue before adding a directory,
since a new dimension changes the Safety Card schema and every published card with it.
