# Interpretability

The hosted chat adapter has no access to weights or activations. The index's
[64-case rationale check](../cap-int-v1/README.md) is explicitly a behavioral
proxy: selecting the correct explanation of a controlled toy mechanism.
It does not establish mechanistic interpretability or faithful hidden reasoning.

The artifact contract supports dimension `in`. A contribution should specify the
weight revision, activation collection procedure, probe or circuit method, and
what its normalized score actually means. External results can be validated and
published through the same pipeline. The separate
[controlled activation study](../causal-ioi-v1/README.md) reports native causal
effects; those effects are not normalized into the hosted-model score.
