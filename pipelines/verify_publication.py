"""Validate every published bundle and check that the website snapshot matches."""

import argparse
from pathlib import Path
import tempfile

from osmsi import ArtifactError
from prepare_web import prepare_web


def verify_publication(data: Path, website: Path) -> int:
    bundles = sorted(path.parent for path in data.rglob("index.json"))
    if not bundles:
        raise ArtifactError("No published bundles found.")
    with tempfile.TemporaryDirectory() as scratch:
        expected = prepare_web(bundles, Path(scratch) / "results")
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
