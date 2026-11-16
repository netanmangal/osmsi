"""Command-line entry point for local and hosted evaluations."""

import argparse
import json
import os
from pathlib import Path
import sys

from osmsi import ArtifactError

from .providers import AzureProvider, ChatProvider, ProviderError, demo_provider
from .runner import evaluate
from .suites import builtin_names, load_suite


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list-suites", action="store_true")
    parser.add_argument("--provider", choices=["demo", "superlinked", "openai-compatible", "azure"], default="demo")
    parser.add_argument("--model", help="Provider model ID; demo defaults to specimen-demo.")
    parser.add_argument("--revision", help="Pinned model revision for backends without revision headers.")
    parser.add_argument("--base-url", help="Provider origin, optionally ending in /v1.")
    parser.add_argument("--key-env", help="Name of the environment variable containing the API key.")
    parser.add_argument("--deployment", help="Azure deployment name.")
    parser.add_argument("--model-version", help="Azure control-plane model version.")
    parser.add_argument("--suites", nargs="+", default=builtin_names(), help="Built-in names or JSON descriptor paths.")
    parser.add_argument("--output", type=Path, help="New run directory; required unless listing suites.")
    parser.add_argument("--run-id")
    parser.add_argument("--seed", type=int, default=41)
    parser.add_argument("--max-requests", type=int, default=64)
    parser.add_argument("--max-tokens", type=int, default=600)
    parser.add_argument("--max-credits", type=float, help="Stop after reported charges reach this soft limit.")
    parser.add_argument("--limit", type=int, help="Use the first N probes per suite (at least 2).")
    parser.add_argument("--timeout", type=float, default=60)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--retry-failed", action="store_true", help="Authorize retrying failed or uncertain, possibly billed attempts.")
    args = parser.parse_args(argv)
    try:
        if args.list_suites:
            for name in builtin_names():
                suite = load_suite(name)
                print(f"{name}\t{suite.document['dimension']}\t{len(suite.probes)} probes\t{suite.document['maturity']}")
            return 0
        if args.output is None:
            parser.error("--output is required")
        suites = [load_suite(name) for name in args.suites]
        if args.provider == "demo":
            provider = demo_provider(suites, args.model or "specimen-demo")
        elif args.provider == "azure":
            if not all((args.model, args.base_url, args.deployment, args.model_version)):
                parser.error("Azure requires --model, --base-url, --deployment, and --model-version.")
            provider = AzureProvider(args.model, endpoint=args.base_url, deployment=args.deployment,
                                     model_version=args.model_version, timeout=args.timeout,
                                     key_env=args.key_env or "AZURE_AI_API_KEY")
        else:
            if not args.model:
                parser.error("--model is required for a hosted provider")
            if args.provider == "openai-compatible" and not args.base_url:
                parser.error("--base-url is required for an OpenAI-compatible provider")
            provider = ChatProvider(
                args.model,
                base_url=args.base_url or os.environ.get("SUPERLINKED_BASE_URL", "https://api.superlinked.com"),
                key_env=args.key_env or ("SUPERLINKED_API_KEY" if args.provider == "superlinked" else "OSMSI_API_KEY"),
                revision=args.revision, timeout=args.timeout,
            )
        bundle = evaluate(
            provider, suites, args.output, run_id=args.run_id, seed=args.seed,
            max_requests=args.max_requests, max_tokens=args.max_tokens,
            max_credits=args.max_credits, limit=args.limit, resume=args.resume,
            retry_failed=args.retry_failed,
        )
        print(json.dumps({"bundle": str(bundle), "sample": provider.sample}))
        return 0
    except (ArtifactError, ProviderError, OSError) as error:
        print(f"Evaluation failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
