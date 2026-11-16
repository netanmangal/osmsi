"""Create a pinned candidate list from the public Hugging Face model registry."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


def discover(limit=20):
    if not 1 <= limit <= 100:
        raise ValueError("Discovery limit must be between 1 and 100.")
    query = urlencode({"pipeline_tag": "text-generation", "sort": "lastModified",
                       "direction": "-1", "limit": limit, "full": "true"})
    with urlopen("https://huggingface.co/api/models?" + query, timeout=30) as response:
        raw = response.read(5_000_001)
    if len(raw) > 5_000_000:
        raise ValueError("Registry response exceeded 5 MB.")
    models = json.loads(raw)
    if not isinstance(models, list):
        raise ValueError("Registry did not return a model list.")
    candidates = []
    for model in models:
        if not isinstance(model, dict) or model.get("private") or not model.get("sha"):
            continue
        if not isinstance(model.get("id"), str) or not isinstance(model["sha"], str):
            continue
        candidates.append({
            "model_id": model["id"], "revision": model["sha"],
            "last_modified": model.get("lastModified"),
            "license_tags": [tag[8:] for tag in model.get("tags", [])
                             if isinstance(tag, str) and tag.startswith("license:")],
        })
    return {"discovered_at": datetime.now(timezone.utc).isoformat(), "source": "huggingface",
            "review_required": True, "candidates": candidates}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        document = discover(args.limit)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, URLError) as error:
        print(f"Discovery failed: {error}", file=sys.stderr)
        return 1
    print(f"Recorded {len(document['candidates'])} candidates. Review licensing and backend availability before evaluating.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
