# suites/prompt-injection — Prompt injection

**Status: not yet implemented.**

Measures whether a model serves its user or its attacker when hostile instructions arrive
through data: poisoned documents, hostile tool output, retrieved web content, and indirect
orders embedded in anything the model reads.

Threat model to be written before the first probe lands: the attacker controls content the
model ingests but not the user's prompt or the system prompt. Injection vectors are graded
by privilege tier — what the injected instruction is trying to reach matters as much as
whether it lands.

Design notes carried from the project's constraints:

- Score by vector and privilege tier, not as one rate. "Ignores injected text in a
  document" and "refuses an injected tool call that exfiltrates data" are different claims.
- Instruction-data separation is the property under test; probes should isolate it from
  general refusal behavior.
- Report both directions of failure: obeying the attacker, and becoming unusable because
  the model now distrusts legitimate content.

See `../../CONTRIBUTING.md` for what a suite must supply.
