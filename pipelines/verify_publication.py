"""Validate every published bundle and check that the website snapshot matches."""

import argparse
from pathlib import Path
import tempfile

from osmsi import ArtifactError, Index
from prepare_web import prepare_web
from prepare_evidence import prepare_evidence


def verify_publication(data: Path, website: Path) -> int:
    bundles = sorted(path.parent for path in data.rglob("index.json"))
    if not bundles:
        raise ArtifactError("No published bundles found.")
    with tempfile.TemporaryDirectory() as scratch:
        expected = prepare_web(bundles, Path(scratch) / "results")
        index = Index(expected)
        original_ids = set()
        for run in index.runs:
            metadata = run.manifest.parameters.get("provider_metadata", {})
            if isinstance(metadata, dict) and "supplement_for_run_id" in metadata:
                original_ids.add(metadata["supplement_for_run_id"])
        for run_id in original_ids:
            try:
                index.supplements(run_id)
            except KeyError:
                raise ArtifactError("A published supplement has no original run.") from None
        expected_files = {
            path.relative_to(expected): path.read_bytes()
            for path in expected.rglob("*") if path.is_file()
        }
        actual_files = {
            path.relative_to(website): path.read_bytes()
            for path in website.rglob("*") if path.is_file()
        }
        if expected_files != actual_files:
            raise ArtifactError("Website results differ from published bundles; rerun prepare_web.py.")
        evidence_bundles = sorted(path.parent for path in data.rglob("evidence-index.json"))
        if evidence_bundles:
            evidence = prepare_evidence(evidence_bundles, Path(scratch) / "evidence")
            expected_evidence = {p.relative_to(evidence): p.read_bytes()
                                 for p in evidence.rglob("*") if p.is_file()}
            website_evidence = website.parent / "evidence"
            actual_evidence = {p.relative_to(website_evidence): p.read_bytes()
                               for p in website_evidence.rglob("*") if p.is_file()}
            if expected_evidence != actual_evidence:
                raise ArtifactError("Website evidence differs from published bundles; rerun prepare_evidence.py.")
        elif any((website.parent / "evidence").rglob("*")):
            raise ArtifactError("Website evidence has no reviewed source bundle.")
    return len(bundles)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data"))
    parser.add_argument("--website", type=Path, default=Path("web/public/results"))
    args = parser.parse_args()
    try:
        count = verify_publication(args.data, args.website)
    except (ArtifactError, OSError) as error:
        parser.exit(1, f"Publication check failed: {error}\n")
    print(f"Validated {count} published bundles and their website snapshot.")


if __name__ == "__main__":
    main()
