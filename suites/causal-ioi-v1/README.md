# Causal IOI diagnostic, v1

This is a small weight-access experiment inspired by the
[GPT-2 indirect-object identification study](https://arxiv.org/abs/2211.00593).
It tests whether a particular residual state carries information needed for a
two-name completion. It is not a full circuit replication or an interpretability grade.

`cases.json` contains 64 discovery prompts and 128 evaluation prompts. Their name
pools are disjoint. Each split balances two templates. The corrupt prompt changes
only the repeated subject name, reversing which name should receive the object.
Tokenization must confirm that exactly one token changed and both candidate names
are single tokens; otherwise the run fails.

The frozen procedure is:

1. Load exact local GPT-2 safetensor weights in float32, with eager attention and
   dropout disabled. Record the repository revision and file digest.
2. Measure the next-token logit difference: indirect object minus subject.
3. On discovery prompts, replace the corrupted subject-position residual state
   with its clean counterpart at each block output. Choose the block with the
   greatest mean restoration; the lower block wins a tie.
4. Evaluate that fixed block on held-out names. Compare matched donors with the
   first disjoint-name donor in each fixed batch of 16 prompts.
5. Verify unchanged-prefix and self-patch negative controls, plus a final-state
   positive control, at absolute logit tolerance `1e-4`.
6. Measure clean-name preference in an untrained matching architecture initialized
   with seed 1729. Report this control separately.

Report raw paired logit effects, a 2,000-resample prompt bootstrap (seed 41), and
an unclipped aggregate recovery ratio when the mean clean/corrupt gap exceeds
0.1 logit. Never select the block using held-out responses. Passing the final-state
control only verifies the intervention code; it is not a discovery.

Prompts share names and templates, so intervals do not establish population-wide
generalization. Early state replacement can restore token identity without
isolating a semantic feature. Matched and mismatched donor results must be read
together. No deception measurement or claim about unrelated hosted models follows.

Regenerate the original Apache-2.0 prompts with:

```bash
python pipelines/build_ioi_cases.py
```

The runner is `pipelines/evaluate_causal_ioi.py`; optional dependencies are in
`pipelines/requirements-evidence.txt`. No downloaded model code is executed.
