"""Export validated scoped evidence separately from normalized Safety Cards."""

import argparse
from pathlib import Path
import tempfile

from osmsi import ArtifactError, EvidenceIndex, stage_evidence


def prepare_evidence(sources, destination, *, replace=False):
    destination = Path(destination)
    reports = [report for source in sources for report in EvidenceIndex(source).reports]
    if destination.exists():
        if not replace:
            raise ArtifactError("Evidence output exists; replacement must be explicit.")
        current = EvidenceIndex(destination)
        allowed = {"evidence-index.json"} | {f'reports/{r["report_id"]}.json' for r in current.reports}
        actual = {str(p.relative_to(destination)) for p in destination.rglob("*") if p.is_file()}
        if actual != allowed:
            raise ArtifactError("Evidence output contains unrelated files.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".evidence-export-", dir=destination.parent) as temp:
        staged = stage_evidence(reports, Path(temp) / "new")
        previous = Path(temp) / "previous"
        if destination.exists():
            destination.rename(previous)
        try:
            staged.rename(destination)
        except OSError:
            if previous.exists():
                previous.rename(destination)
            raise
    return destination


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("bundles", nargs="+")
    p.add_argument("--destination", default="web/public/evidence")
    p.add_argument("--replace", action="store_true")
    args = p.parse_args()
    print(prepare_evidence(args.bundles, args.destination, replace=args.replace))


if __name__ == "__main__":
    main()
