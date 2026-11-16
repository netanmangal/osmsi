"""Merge reviewed bundles into the website's static results directory."""

import argparse
from dataclasses import asdict
import json
from pathlib import Path
import sys
import tempfile

from osmsi import ArtifactError, Index


def prepare_web(sources, destination, *, allow_samples=False, replace=False):
    runs = {}
    for source in sources:
        for run in Index(source, allow_samples=allow_samples).runs:
            if run.card.run_id in runs:
                raise ArtifactError(f"Duplicate run ID across bundles: {run.card.run_id}")
            runs[run.card.run_id] = run
    destination = Path(destination).resolve()
    if destination.exists():
        if not replace:
            raise ArtifactError("Results directory exists. Use --replace after reviewing the new bundles.")
        if {path.name for path in destination.iterdir()} - {"index.json", "cards", "manifests"}:
            raise ArtifactError("Refusing to replace a directory containing unrelated files.")
        existing = Index(destination, allow_samples=True)
        expected = {"index.json", "cards", "manifests"}
        expected.update(f"{folder}/{run.card.run_id}.json"
                        for run in existing.runs for folder in ("cards", "manifests"))
        if any(str(path.relative_to(destination)) not in expected for path in destination.rglob("*")):
            raise ArtifactError("Refusing to replace a directory containing unrelated nested files.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".osmsi-web-", dir=destination.parent) as scratch:
        staged = Path(scratch) / "results"
        (staged / "cards").mkdir(parents=True)
        (staged / "manifests").mkdir()
        entries = []
        for run_id, run in sorted(runs.items()):
            for folder, artifact in (("cards", run.card), ("manifests", run.manifest)):
                (staged / folder / f"{run_id}.json").write_text(
                    json.dumps(asdict(artifact), indent=2, allow_nan=False) + "\n", encoding="utf-8")
            entries.append({"run_id": run_id, "model_id": run.card.model.id, "sample": run.card.sample})
        (staged / "index.json").write_text(json.dumps(
            {"schema_version": "1.0", "entries": entries}, indent=2) + "\n", encoding="utf-8")
        Index(staged, allow_samples=allow_samples)
        previous = Path(scratch) / "previous"
        if destination.exists():
            destination.rename(previous)
        try:
            staged.rename(destination)
        except OSError:
            if previous.exists():
                previous.rename(destination)
            raise
    return destination


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundles", nargs="+")
    parser.add_argument("--destination", default="web/public/results")
    parser.add_argument("--allow-samples", action="store_true")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = prepare_web(args.bundles, args.destination,
                             allow_samples=args.allow_samples, replace=args.replace)
    except (ArtifactError, OSError) as error:
        print(f"Website export failed: {error}", file=sys.stderr)
        return 1
    print(f"Prepared static results: {result}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
