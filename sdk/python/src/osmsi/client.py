"""Read local result bundles with matching cards, manifests, and index entries."""

from pathlib import Path
import hashlib
import re

from .models import (
    ConfidenceInterval, DimensionScore, EvaluationRun, HarnessIdentity,
    ModelIdentity, RunManifest, SafetyCard, SuiteRun,
)
from .validation import ArtifactError, read_artifact


def artifact_path(root: str | Path, relative: str) -> Path:
    """Resolve a bundle file without allowing paths or symlinks outside it."""
    directory = Path(root).resolve()
    target = (directory / relative).resolve()
    if not target.is_relative_to(directory):
        raise ArtifactError("Artifact path escapes the bundle directory.")
    return target


def load_run(root: str | Path, run_id: str, *, allow_samples: bool = False) -> EvaluationRun:
    """Load a card and its manifest, checking their provenance and dimensions."""
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,127}", run_id):
        raise ArtifactError("Invalid run ID.")
    manifest = read_artifact(artifact_path(root, f"manifests/{run_id}.json"), "run-manifest")
    card = read_artifact(artifact_path(root, f"cards/{run_id}.json"), "safety-card")
    if manifest["run_id"] != run_id or card["run_id"] != run_id:
        raise ArtifactError("Run ID does not match the artifact filename.")
    for field in ("schema_version", "model", "sample"):
        if manifest[field] != card[field]:
            raise ArtifactError(f"Card and manifest disagree on {field}.")
    if manifest["sample"] and not allow_samples:
        raise ArtifactError("Sample run rejected; pass allow_samples=True to inspect fixtures.")
    suites = {suite["id"]: suite["dimension"] for suite in manifest["suites"]}
    scores = {score["suite_id"]: score["dimension"] for score in card["scores"]}
    if suites != scores:
        raise ArtifactError("Card scores do not match the manifest's suites and dimensions.")

    identity = ModelIdentity(**manifest["model"])
    return EvaluationRun(
        manifest=RunManifest(
            **{key: manifest[key] for key in (
                "schema_version", "run_id", "sample", "started_at", "completed_at",
                "seed", "parameters",
            )},
            model=identity,
            harness=HarnessIdentity(**manifest["harness"]),
            suites=tuple(SuiteRun(**suite) for suite in manifest["suites"]),
        ),
        card=SafetyCard(
            schema_version=card["schema_version"], run_id=run_id, sample=card["sample"],
            model=identity,
            scores=tuple(DimensionScore(
                dimension=score["dimension"], suite_id=score["suite_id"], value=score["value"],
                confidence_interval=ConfidenceInterval(**score["confidence_interval"]),
            ) for score in card["scores"]),
            concerns=tuple(card["concerns"]), strengths=tuple(card["strengths"]),
        ),
    )


class Index:
    """A validated local index. Constructing it checks every referenced run."""

    def __init__(self, root: str | Path, *, allow_samples: bool = False):
        self._root = Path(root)
        document = read_artifact(artifact_path(root, "index.json"), "index")
        runs = []
        for entry in document["entries"]:
            run = load_run(root, entry["run_id"], allow_samples=allow_samples)
            if entry["model_id"] != run.card.model.id or entry["sample"] != run.card.sample:
                raise ArtifactError("Index entry does not match its run.")
            runs.append(run)
        self.runs = tuple(runs)

    def get(self, run_id: str) -> EvaluationRun:
        """Find a run by ID; raise KeyError when it is absent from this index."""
        for run in self.runs:
            if run.card.run_id == run_id:
                return run
        raise KeyError(run_id)

    def supplements(self, run_id: str) -> tuple[EvaluationRun, ...]:
        """Return explicitly linked supplements after checking identity and source bytes.

        Scores remain separate runs with their own protocols; this does not
        manufacture a combined card or an overall safety score.
        """
        original = self.get(run_id)
        digest = hashlib.sha256(artifact_path(
            self._root, f"manifests/{run_id}.json").read_bytes()).hexdigest()
        supplements = []
        for candidate in self.runs:
            metadata = candidate.manifest.parameters.get("provider_metadata", {})
            if not isinstance(metadata, dict) or metadata.get("supplement_for_run_id") != run_id:
                continue
            if (candidate.card.model != original.card.model
                    or candidate.card.sample != original.card.sample
                    or candidate.card.run_id == run_id
                    or metadata.get("supplement_base_manifest_sha256") != digest):
                raise ArtifactError("Supplement identity or original manifest digest differs.")
            supplements.append(candidate)
        return tuple(sorted(supplements, key=lambda r: r.manifest.completed_at, reverse=True))
