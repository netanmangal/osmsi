"""OSMSI command-line tools for reading, comparing, downloading, and running evaluations."""

import argparse
from dataclasses import asdict
import json
import sys

from .client import Index
from .compare import compare_runs
from .remote import fetch_index
from .evidence import EvidenceIndex
from .remote_evidence import fetch_evidence
from .validation import ArtifactError


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] == "run":
        try:
            from osmsi_harness.cli import main as run
        except ImportError:
            print("Install the harness first: python -m pip install -e sdk/python -e harness", file=sys.stderr)
            return 1
        return run(argv[1:])
    parser = argparse.ArgumentParser(description=__doc__, epilog="Use 'osmsi run --help' for evaluation options.")
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "show", "compare"):
        sub = commands.add_parser(name)
        sub.add_argument("bundle")
        sub.add_argument("--allow-samples", action="store_true")
        if name == "show":
            sub.add_argument("--run-id")
        if name == "compare":
            sub.add_argument("left")
            sub.add_argument("right")
    fetch = commands.add_parser("fetch")
    fetch.add_argument("url")
    fetch.add_argument("--output", required=True)
    fetch.add_argument("--allow-samples", action="store_true")
    fetch.add_argument("--max-runs", type=int, default=100)
    evidence = commands.add_parser("evidence", help="Validate and read scoped capability/interpretability reports.")
    evidence.add_argument("bundle")
    evidence.add_argument("--report-id")
    evidence.add_argument("--allow-samples", action="store_true")
    evidence_fetch = commands.add_parser("fetch-evidence")
    evidence_fetch.add_argument("url")
    evidence_fetch.add_argument("--output", required=True)
    evidence_fetch.add_argument("--allow-samples", action="store_true")
    evidence_fetch.add_argument("--max-reports", type=int, default=100)
    args = parser.parse_args(argv)
    try:
        if args.command == "fetch-evidence":
            index = fetch_evidence(args.url, args.output, allow_samples=args.allow_samples,
                                   max_reports=args.max_reports)
            result = {"bundle": args.output, "reports": len(index.reports)}
        elif args.command == "evidence":
            index = EvidenceIndex(args.bundle, allow_samples=args.allow_samples)
            result = index.get(args.report_id) if args.report_id else index.reports
        elif args.command == "fetch":
            index = fetch_index(args.url, args.output, allow_samples=args.allow_samples, max_runs=args.max_runs)
            result = {"bundle": args.output, "runs": len(index.runs)}
        else:
            index = Index(args.bundle, allow_samples=args.allow_samples)
            if args.command == "validate":
                result = {"valid": True, "runs": len(index.runs)}
            elif args.command == "show":
                result = asdict(index.get(args.run_id)) if args.run_id else [asdict(run) for run in index.runs]
            else:
                result = compare_runs(index.get(args.left), index.get(args.right))
        print(json.dumps(result, indent=2, allow_nan=False))
        return 0
    except (ArtifactError, KeyError, OSError) as error:
        print(f"OSMSI: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
