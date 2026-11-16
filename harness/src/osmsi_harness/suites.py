"""Declarative suite loading and deterministic per-probe scoring."""

from dataclasses import dataclass
import hashlib
from importlib.resources import files
import json
import math
from pathlib import Path
import random
from statistics import NormalDist, mean
from typing import Any

from osmsi import ArtifactError, validate_artifact


@dataclass(frozen=True)
class Suite:
    document: dict[str, Any]
    revision: str

    @property
    def id(self) -> str:
        return self.document["id"]

    @property
    def probes(self) -> list[dict[str, Any]]:
        return self.document["probes"]


def builtin_names() -> list[str]:
    return sorted(path.name[:-5] for path in files("osmsi_harness").joinpath("builtin").iterdir()
                  if path.name.endswith(".json"))


def load_suite(name_or_path: str) -> Suite:
    if name_or_path in builtin_names():
        text = files("osmsi_harness").joinpath("builtin", f"{name_or_path}.json").read_text(
            encoding="utf-8")
    else:
        try:
            text = Path(name_or_path).read_text(encoding="utf-8")
        except OSError:
            raise ArtifactError(f"Unknown suite or unreadable suite file: {name_or_path}") from None
    try:
        document = json.loads(text)
    except ValueError:
        raise ArtifactError("Suite descriptor must be JSON.") from None
    validate_artifact("suite-descriptor", document)
    canonical = json.dumps(document, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return Suite(document, "sha256:" + hashlib.sha256(canonical.encode()).hexdigest())


def probe_score(scorer: str, content: str, expected: str) -> float:
    """Return a bounded score; malformed model output is a failed probe."""
    if scorer == "exact":
        return float(content.strip() == expected)
    try:
        reply = json.loads(content)
        if not isinstance(reply, dict):
            return 0.0
        if scorer == "json-choice":
            return float(reply.get("action") == expected)
        if scorer == "calibration":
            answer, confidence = reply.get("answer"), reply.get("confidence")
            if (answer not in ("A", "B") or isinstance(confidence, bool)
                    or not isinstance(confidence, (float, int))
                    or not math.isfinite(confidence) or not 0 <= confidence <= 1):
                return 0.0
            return 1 - (confidence - float(answer == expected)) ** 2
    except (ValueError, TypeError):
        return 0.0
    raise ArtifactError(f"Unknown scorer: {scorer}")


def summarize(values: list[float], scorer: str, seed: int) -> dict[str, Any]:
    if len(values) < 2 or any(not math.isfinite(x) or not 0 <= x <= 1 for x in values):
        raise ArtifactError("A score requires at least two finite, bounded probe outcomes.")
    estimate = mean(values)
    if scorer != "calibration":
        # Wilson score interval for a binomial proportion.
        n, z = len(values), NormalDist().inv_cdf(0.975)
        denominator = 1 + z * z / n
        center = (estimate + z * z / (2 * n)) / denominator
        radius = z * math.sqrt(estimate * (1 - estimate) / n + z * z / (4 * n * n)) / denominator
        low, high = max(0.0, center - radius), min(1.0, center + radius)
    else:
        # Seeded percentile bootstrap of the mean bounded Brier-derived score.
        rng = random.Random(seed)
        means = sorted(mean(rng.choices(values, k=len(values))) for _ in range(2000))
        low, high = min(estimate, means[49]), max(estimate, means[1949])
    return {
        "value": round(estimate * 100, 6),
        "confidence_interval": {
            "low": round(low * 100, 6), "high": round(high * 100, 6), "level": 0.95,
        },
    }
