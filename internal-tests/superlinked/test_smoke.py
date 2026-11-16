import contextlib
import io
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import smoke


class SmokeTests(unittest.TestCase):
    def test_missing_key_makes_no_request(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(smoke, "build_opener") as opener:
            with self.assertRaisesRegex(ValueError, "SUPERLINKED_API_KEY"):
                smoke.request_json("/v1/models")
            opener.assert_not_called()

    def test_rejects_unsafe_origins(self):
        for base in ["http://example.com", "https://user:pass@example.com",
                     "https://example.com?key=secret", "https://example.com/v1"]:
            with self.subTest(base=base), patch.dict(os.environ, {
                "SUPERLINKED_API_KEY": "test-key", "SUPERLINKED_BASE_URL": base,
            }), patch.object(smoke, "build_opener") as opener:
                with self.assertRaisesRegex(ValueError, "HTTPS origin"):
                    smoke.request_json("/v1/models")
                opener.assert_not_called()

    def test_request_auth_timeout_and_no_redirects(self):
        with patch.dict(os.environ, {"SUPERLINKED_API_KEY": "test-key"}, clear=True), \
                patch.object(smoke, "build_opener") as opener:
            opener.return_value.open.return_value.__enter__.return_value = io.BytesIO(b'{"data":[]}')
            self.assertEqual(smoke.request_json("/v1/models"), {"data": []})
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.full_url, "https://api.superlinked.com/v1/models")
            self.assertEqual(request.get_header("Authorization"), "Bearer test-key")
            self.assertEqual(opener.return_value.open.call_args.kwargs, {"timeout": 60})
            handler = opener.call_args.args[0]
            self.assertIsInstance(handler, smoke.NoRedirects)
            self.assertIsNone(handler.redirect_request(None, None, 302, "", {}, "https://other.test"))

    def test_http_error_does_not_echo_body_or_retry(self):
        with patch.dict(os.environ, {"SUPERLINKED_API_KEY": "test-key"}, clear=True), \
                patch.object(smoke, "build_opener") as opener:
            opener.return_value.open.side_effect = HTTPError(
                "https://api.superlinked.com", 401, "secret", {}, io.BytesIO(b"test-key"))
            with self.assertRaisesRegex(ValueError, "^Provider returned HTTP 401; no retry was attempted.$"):
                smoke.request_json("/v1/models")
            self.assertEqual(opener.return_value.open.call_count, 1)

    def test_invalid_json(self):
        with patch.dict(os.environ, {"SUPERLINKED_API_KEY": "test-key"}, clear=True), \
                patch.object(smoke, "build_opener") as opener:
            opener.return_value.open.return_value.__enter__.return_value = io.BytesIO(b"<html>")
            with self.assertRaisesRegex(ValueError, "invalid JSON"):
                smoke.request_json("/v1/models")

    def test_default_lists_models_without_generation(self):
        with patch.object(smoke, "request_json", return_value={"data": [{"id": "specimen"}]}) as request, \
                contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(smoke.main([]), 0)
            request.assert_called_once_with("/v1/models")
            self.assertIn("specimen", output.getvalue())

    def test_chat_is_bounded_and_hides_completion(self):
        with patch.object(smoke, "request_json", return_value={
            "choices": [{"message": {"content": "private response"}}]
        }) as request, contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(smoke.main(["--model", "specimen"]), 0)
            self.assertEqual(request.call_count, 1)
            path, payload = request.call_args.args
            self.assertEqual(path, "/v1/chat/completions")
            self.assertEqual(payload["max_tokens"], 600)
            self.assertNotIn("private response", output.getvalue())

    def test_empty_chat_fails(self):
        with patch.object(smoke, "request_json", return_value={
            "choices": [{"message": {"content": ""}}]
        }), contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(smoke.main(["--model", "specimen"]), 1)
