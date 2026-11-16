"""Per-dimension comparisons; incompatible evaluations never get a numeric delta."""

from .models import EvaluationRun


def _scored_cohort(run, suite_id):
    observations = run.manifest.parameters.get("observations")
    if not isinstance(observations, list):
        return None
    selected = []
    for observation in observations:
        if not isinstance(observation, dict) or observation.get("suite_id") != suite_id:
            continue
        if observation.get("score") is not None and not observation.get("provider_blocked", False):
            probe_id = observation.get("probe_id")
            if not isinstance(probe_id, str):
                return None
            selected.append(probe_id)
    return tuple(sorted(selected)) if len(selected) == len(set(selected)) else None


def compare_runs(left: EvaluationRun, right: EvaluationRun) -> list[dict]:
    left_scores = {score.dimension: score for score in left.card.scores}
    right_scores = {score.dimension: score for score in right.card.scores}
    left_suites = {suite.dimension: suite for suite in left.manifest.suites}
    right_suites = {suite.dimension: suite for suite in right.manifest.suites}
    comparisons = []
    for dimension in sorted(left_scores.keys() | right_scores.keys()):
        first, second = left_scores.get(dimension), right_scores.get(dimension)
        reason = None
        if first is None or second is None:
            reason = "Dimension is unmeasured in one run."
        elif left.card.sample != right.card.sample:
            reason = "Sample and measured runs cannot be compared."
        elif left.manifest.harness != right.manifest.harness:
            reason = "Harness version or revision differs."
        elif any(left.manifest.parameters.get(key) != right.manifest.parameters.get(key)
                 for key in ("temperature", "max_tokens")):
            reason = "Sampling parameters differ."
        else:
            a, b = left_suites[dimension], right_suites[dimension]
            if (a.id, a.version, a.dataset_revision, a.scoring_method, a.parameters) != (
                b.id, b.version, b.dataset_revision, b.scoring_method, b.parameters
            ):
                reason = "Suite definition, probe selection, or scoring configuration differs."
            elif _scored_cohort(left, a.id) != _scored_cohort(right, b.id):
                reason = "Provider filtering left different scored probe cohorts."
            elif (a.parameters.get("provider_blocked") or b.parameters.get("provider_blocked")) and (
                _scored_cohort(left, a.id) is None or _scored_cohort(right, b.id) is None
            ):
                reason = "The scored probe cohorts cannot be verified."
        comparisons.append({
            "dimension": dimension,
            "left": first.value if first else None,
            "right": second.value if second else None,
            "delta": round(second.value - first.value, 6) if reason is None else None,
            "comparable": reason is None, "reason": reason,
        })
    return comparisons
