"""Download a static result bundle and validate it before exposing local files."""

import json
import http.client
from pathlib import Path
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, build_opener

from .client import Index
from .validation import ArtifactError, validate_artifact


class _NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_index(base_url: str, destination: str | Path, *,
                allow_samples: bool = False, max_runs: int = 100) -> Index:
    """Fetch index.json and its referenced runs. No API key is involved."""
    try:
        parsed = urlsplit(base_url)
        valid = (parsed.scheme == "https" or (
            parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1")))
        valid = valid and bool(parsed.hostname) and not (
            parsed.username or parsed.password or parsed.query or parsed.fragment)
        parsed.port
    except ValueError:
        valid = False
    if not valid:
        raise ArtifactError("Index URL must use HTTPS or loopback HTTP, without credentials or a query.")
    if not isinstance(max_runs, int) or max_runs < 1:
        raise ArtifactError("max_runs must be a positive integer.")
    destination = Path(destination)
    if destination.exists():
        raise ArtifactError("Download destination already exists.")
    opener = build_opener(_NoRedirects())

    def download(relative):
        try:
            with opener.open(base_url.rstrip("/") + "/" + relative, timeout=30) as response:
                content = response.read(5_000_001)
                if len(content) > 5_000_000:
                    raise ArtifactError("Remote artifact exceeded 5 MB.")
                document = json.loads(content)
        except (HTTPError, URLError, OSError, ValueError, http.client.HTTPException):
            raise ArtifactError(f"Could not fetch valid JSON for {relative}.") from None
        return document, content

    index, index_bytes = download("index.json")
    validate_artifact("index", index)
    if len(index["entries"]) > max_runs:
        raise ArtifactError("Remote index exceeds max_runs; increase the limit explicitly.")
    if not allow_samples and any(entry["sample"] for entry in index["entries"]):
        raise ArtifactError("Remote index contains samples; opt in to fetch fixtures.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".osmsi-fetch-", dir=destination.parent) as scratch:
        staged = Path(scratch) / "bundle"
        (staged / "cards").mkdir(parents=True)
        (staged / "manifests").mkdir()
        for entry in index["entries"]:
            for folder, kind in (("cards", "safety-card"), ("manifests", "run-manifest")):
                relative = f"{folder}/{entry['run_id']}.json"
                document, content = download(relative)
                validate_artifact(kind, document)
                # Retain exact source bytes: linked supplements authenticate the
                # original manifest's digest, including its serialization.
                (staged / relative).write_bytes(content)
        (staged / "index.json").write_bytes(index_bytes)
        Index(staged, allow_samples=allow_samples)
        staged.rename(destination)
    return Index(destination, allow_samples=allow_samples)
