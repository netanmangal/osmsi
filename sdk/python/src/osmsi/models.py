"""Typed views of a validated run. Dimension scores are never aggregated."""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ModelIdentity:
    id: str
    revision: str


@dataclass(frozen=True)
class HarnessIdentity:
    version: str
    revision: str


@dataclass(frozen=True)
class SuiteRun:
    id: str
    dimension: str
    version: str
    dataset_revision: str
    scoring_method: str
    interval_method: str
    parameters: dict[str, Any]


@dataclass(frozen=True)
class RunManifest:
    schema_version: str
    run_id: str
    sample: bool
    model: ModelIdentity
    harness: HarnessIdentity
    started_at: str
    completed_at: str
    seed: int
    parameters: dict[str, Any]
    suites: tuple[SuiteRun, ...]


@dataclass(frozen=True)
class ConfidenceInterval:
    low: float
    high: float
    level: float


@dataclass(frozen=True)
class DimensionScore:
    dimension: str
    suite_id: str
    value: float
    confidence_interval: ConfidenceInterval


@dataclass(frozen=True)
class SafetyCard:
    schema_version: str
    run_id: str
    sample: bool
    model: ModelIdentity
    scores: tuple[DimensionScore, ...]
    concerns: tuple[str, ...]
    strengths: tuple[str, ...]


@dataclass(frozen=True)
class EvaluationRun:
    manifest: RunManifest
    card: SafetyCard
