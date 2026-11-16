# Two-request integration pilot

These are real responses from `Qwen/Qwen3.5-4B`, evaluated on the first **two**
questions of the `factual-calibration` pilot with seed 41 and a 600-token response
cap. The provider reported 12 credits in total. No other dimensions were measured.

The purpose is to verify the provider → runner → artifacts → SDK → website path.
Both questions are easy, and the zero-width interval reflects identical observed
scores, not statistical certainty about the model. This is not a safety benchmark
or evidence that this model is safer than another model.

Source: harness commit `85b615d`; the full harness hash and provider model revision
are in the manifest. Raw completions remain in the private run journal. The
website labels the result as a two-probe pilot. See `docs/methodology.md` in the
repository for scoring definitions and limitations.
