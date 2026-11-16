import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest

from osmsi import ArtifactError, fetch_evidence
from test_evidence import report


class RemoteEvidenceTests(unittest.TestCase):
    def test_preserves_original_bytes_and_rejects_tampering_atomically(self):
        document = report()
        document["sample"] = False
        raw = json.dumps(document, separators=(",", ":")).encode()
        index = {"schema_version": "1.0", "reports": [{
            "report_id": document["report_id"], "model_id": document["model"]["id"],
            "dimension": "in", "sha256": hashlib.sha256(raw).hexdigest(),
        }]}
        content = {"/evidence-index.json": json.dumps(index).encode(),
                   "/reports/sample-evidence.json": raw}

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(content[self.path])

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as temp:
                url = f"http://127.0.0.1:{server.server_port}"
                dest = Path(temp) / "verified"
                self.assertEqual(len(fetch_evidence(url, dest).reports), 1)
                self.assertEqual((dest / "reports/sample-evidence.json").read_bytes(), raw)
                content["/reports/sample-evidence.json"] = raw + b"\n"
                with self.assertRaisesRegex(ArtifactError, "digest"):
                    fetch_evidence(url, Path(temp) / "tampered")
                self.assertFalse((Path(temp) / "tampered").exists())
                self.assertFalse(list(Path(temp).glob(".evidence-fetch-*")))
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_rejects_unsafe_urls_before_network(self):
        for url in ("http://example.com", "https://user:secret@example.com", "https://example.com?key=x"):
            with self.assertRaises(ArtifactError):
                fetch_evidence(url, "unused")
