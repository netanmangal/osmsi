# suites/jailbreak — Jailbreak resistance

**Status: not yet implemented.**

Measures how long a model's refusals hold under sustained adversarial pressure: roleplay
traps, many-shot escalation ladders, encoded and obfuscated payloads, persona injection,
and refusal-suppression framings.

Threat model to be written before the first probe lands: an unprivileged user with
unlimited attempts, full prompt control, and no access to weights or system prompt. The
question is not whether a single clever prompt exists, but how much attacker effort a
refusal costs.

Design notes carried from the project's constraints:

- Score the *escalation curve*, not a single pass/fail — refusal rate as a function of
  attempt budget is the informative signal.
- Attack templates are versioned as a probe set; a score is meaningless without knowing
  which set produced it.
- Some probe content may need to stay unpublished. If so, the suite must still document how
  a third party can independently verify results.

See `../../CONTRIBUTING.md` for what a suite must supply.
