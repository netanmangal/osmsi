"""Validate completed runs and stage a new local bundle for review."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import tempfile
import sys

from osmsi import ArtifactError, Index, load_run, validate_artifact


def stage_results(source: str | Path, destination: str | Path, *,
                  allow_samples: bool = False) -> Path:
    """Write a new bundle only after every card/manifest pair passes validation."""
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if destination.exists():
        raise ArtifactError("Destination already exists; use a new directory for each bundle.")
    if not (source / "cards").is_dir() or not (source / "manifests").is_dir():
        raise ArtifactError("Source must contain cards/ and manifests/ directories.")
    cards = {path.stem for path in (source / "cards").glob("*.json")}
    manifests = {path.stem for path in (source / "manifests").glob("*.json")}
    if not cards or cards != manifests:
        raise ArtifactError("Source must contain at least one run, with a card and manifest for each.")

    # Validate all input before creating output; retain the validated snapshot.
    runs = [load_run(source, run_id, allow_samples=allow_samples) for run_id in sorted(cards)]
    index = {"schema_version": "1.0", "entries": [
        {"run_id": run.card.run_id, "model_id": run.card.model.id, "sample": run.card.sample}
        for run in runs
    ]}
    validate_artifact("index", index)

    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".osmsi-stage-", dir=destination.parent) as scratch:
        staged = Path(scratch) / "bundle"
        (staged / "cards").mkdir(parents=True)
        (staged / "manifests").mkdir()
        for run in runs:
            for folder, artifact in (("cards", run.card), ("manifests", run.manifest)):
                (staged / folder / f"{run.card.run_id}.json").write_text(
                    json.dumps(asdict(artifact), indent=2, allow_nan=False) + "\n",
                    encoding="utf-8",
                )
        (staged / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
        # Verify the serialized bundle using the end-user reader before exposing it.
        Index(staged, allow_samples=allow_samples)
        staged.rename(destination)
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Directory containing cards/ and manifests/.")
    parser.add_argument("--destination", required=True, type=Path, help="New local bundle directory.")
    parser.add_argument("--allow-samples", action="store_true", help="Allow labeled specimen fixtures.")
    args = parser.parse_args(argv)
    try:
        result = stage_results(args.source, args.destination, allow_samples=args.allow_samples)
    except (ArtifactError, OSError) as error:
        print(f"Staging failed: {error}", file=sys.stderr)
        return 1
    print(f"Validated bundle: {result}")
    if args.allow_samples:
        print("Sample artifacts were permitted. This is not a publication approval.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
