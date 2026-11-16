"""Download hash-addressed evidence reports without weakening their byte digests."""

import json
from http.client import HTTPException
from pathlib import Path
import tempfile
from urllib.parse import urlsplit
from urllib.request import build_opener

from .evidence import EvidenceIndex
from .remote import _NoRedirects
from .validation import ArtifactError, validate_artifact


def fetch_evidence(base_url: str, destination: str | Path, *, max_reports: int = 100,
                   allow_samples: bool = False) -> EvidenceIndex:
    try:
        parsed = urlsplit(base_url)
        valid = (parsed.scheme == "https" or
                 (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1")))
        valid = valid and bool(parsed.hostname) and not (
            parsed.username or parsed.password or parsed.query or parsed.fragment)
        parsed.port
    except ValueError:
        valid = False
    if not valid:
        raise ArtifactError("Evidence URL must use HTTPS or loopback HTTP without credentials or a query.")
    if isinstance(max_reports, bool) or not isinstance(max_reports, int) or max_reports < 1:
        raise ArtifactError("max_reports must be a positive integer.")
    destination = Path(destination)
    if destination.exists():
        raise ArtifactError("Evidence download destination already exists.")
    opener = build_opener(_NoRedirects())

    def download(relative):
        try:
            with opener.open(base_url.rstrip("/") + "/" + relative, timeout=30) as response:
                raw = response.read(5_000_001)
            if len(raw) > 5_000_000:
                raise ArtifactError("Evidence artifact exceeded 5 MB.")
            document = json.loads(raw)
        except (OSError, ValueError, HTTPException):
            raise ArtifactError(f"Could not fetch evidence JSON for {relative}.") from None
        return raw, document

    raw_index, index = download("evidence-index.json")
    validate_artifact("evidence-index", index)
    if len(index["reports"]) > max_reports:
        raise ArtifactError("Evidence index exceeds max_reports.")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".evidence-fetch-", dir=destination.parent) as temp:
        bundle = Path(temp) / "bundle"
        (bundle / "reports").mkdir(parents=True)
        (bundle / "evidence-index.json").write_bytes(raw_index)
        for entry in index["reports"]:
            relative = f'reports/{entry["report_id"]}.json'
            raw, report = download(relative)
            validate_artifact("evidence-report", report)
            (bundle / relative).write_bytes(raw)
        EvidenceIndex(bundle, allow_samples=allow_samples)
        bundle.rename(destination)
    return EvidenceIndex(destination, allow_samples=allow_samples)
