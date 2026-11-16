"""Validate the draft v1 artifact contracts without fetching remote schemas."""

from datetime import datetime
from functools import lru_cache
from importlib.resources import files
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

DIMENSIONS = ("jb", "hc", "pi", "uc", "ag", "in")
SCHEMA_NAMES = ("common", "run-manifest", "safety-card", "index")


class ArtifactError(ValueError):
    """An artifact is malformed, inconsistent, or disallowed by the reader."""


@lru_cache(maxsize=1)
def _validators() -> dict[str, Draft202012Validator]:
    root = files("osmsi").joinpath("_schemas", "v1")
    schemas = {
        name: json.loads(root.joinpath(f"{name}.json").read_text(encoding="utf-8"))
        for name in SCHEMA_NAMES
    }
    registry = Registry().with_resources(
        (schema["$id"], Resource.from_contents(schema)) for schema in schemas.values()
    )
    for schema in schemas.values():
        Draft202012Validator.check_schema(schema)
    return {
        name: Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
        for name, schema in schemas.items()
    }


def _unique(values: list[str], label: str) -> None:
    if len(values) != len(set(values)):
        raise ArtifactError(f"Duplicate {label}.")


def validate_artifact(kind: str, document: dict[str, Any]) -> None:
    """Check schema, finite numbers, and invariants within a single artifact."""
    if kind not in SCHEMA_NAMES or kind == "common":
        raise ArtifactError(f"Unknown artifact kind: {kind}.")
    try:
        json.dumps(document, allow_nan=False)
    except (TypeError, ValueError):
        raise ArtifactError("Artifacts must contain JSON values and finite numbers.") from None
    error = next(_validators()[kind].iter_errors(document), None)
    if error:
        location = ".".join(str(part) for part in error.absolute_path) or "<root>"
        raise ArtifactError(f"{kind}: invalid {location} ({error.validator}).")

    if kind == "run-manifest":
        try:
            start = datetime.fromisoformat(document["started_at"].upper().replace("Z", "+00:00"))
            end = datetime.fromisoformat(document["completed_at"].upper().replace("Z", "+00:00"))
        except ValueError:
            raise ArtifactError("Run timestamps must be supported RFC 3339 instants.") from None
        if end < start:
            raise ArtifactError("Run completion precedes its start.")
        _unique([suite["id"] for suite in document["suites"]], "suite IDs")
        _unique([suite["dimension"] for suite in document["suites"]], "suite dimensions")
    elif kind == "safety-card":
        _unique([score["dimension"] for score in document["scores"]], "score dimensions")
        _unique([score["suite_id"] for score in document["scores"]], "score suite IDs")
        for score in document["scores"]:
            interval = score["confidence_interval"]
            if not interval["low"] <= score["value"] <= interval["high"]:
                raise ArtifactError("Confidence interval must contain its score.")
    elif kind == "index":
        _unique([entry["run_id"] for entry in document["entries"]], "index run IDs")


def read_artifact(path: str | Path, kind: str) -> dict[str, Any]:
    """Read UTF-8 JSON, then apply the same contract used by the pipeline."""
    def unique_members(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate JSON member.")
            result[key] = value
        return result

    try:
        document = json.loads(
            Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique_members,
        )
    except (OSError, UnicodeError, ValueError):
        raise ArtifactError(f"Cannot read {kind} JSON at {path}.") from None
    validate_artifact(kind, document)
    return document
