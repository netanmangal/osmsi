"""One-request Superlinked connectivity check. No third-party dependencies."""

import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirects(HTTPRedirectHandler):
    """Do not forward the bearer token to a redirected endpoint."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(path, payload=None):
    key = os.environ.get("SUPERLINKED_API_KEY", "").strip()
    if not key:
        raise ValueError("Set SUPERLINKED_API_KEY before running the check.")
    base = os.environ.get("SUPERLINKED_BASE_URL", "https://api.superlinked.com").rstrip("/")
    url = urlsplit(base)
    if (url.scheme != "https" or not url.hostname or url.username is not None
            or url.password is not None or url.query or url.fragment or url.path):
        raise ValueError("SUPERLINKED_BASE_URL must be an HTTPS origin without credentials.")
    request = Request(
        base + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with build_opener(NoRedirects()).open(request, timeout=60) as response:
            body = json.load(response)
    except HTTPError as error:
        # Error bodies can echo credentials or prompts; never print them.
        status = error.code
        error.close()
        raise ValueError(f"Provider returned HTTP {status}; no retry was attempted.") from None
    except (URLError, TimeoutError, OSError):
        raise ValueError("Provider connection failed or timed out; no retry was attempted.") from None
    except (ValueError, UnicodeError):
        raise ValueError("Provider returned invalid JSON.") from None
    if not isinstance(body, dict):
        raise ValueError("Expected a JSON object from the provider.")
    return body


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", help="Send one chat request instead of listing models.")
    args = parser.parse_args(argv)
    try:
        if args.model:
            body = request_json("/v1/chat/completions", {
                "model": args.model,
                "messages": [{"role": "user", "content": "Reply with the word online."}],
                "max_tokens": 600,
                "temperature": 0,
            })
            choices = body.get("choices")
            if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
                raise ValueError("Chat response has no completion.")
            message = choices[0].get("message")
            content = message.get("content") if isinstance(message, dict) else None
            if not isinstance(content, str) or not content.strip():
                raise ValueError("Chat response has no visible text.")
            print(f"Chat succeeded ({len(content)} characters returned).")
        else:
            body = request_json("/v1/models")
            models = body.get("data")
            if (not isinstance(models, list) or not models
                    or any(not isinstance(model, dict)
                           or not isinstance(model.get("id"), str) for model in models)):
                raise ValueError("Model response has no valid model list.")
            print(f"{len(models)} models available:")
            for model in models:
                print(model["id"])
    except ValueError as error:
        print(f"Check failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
