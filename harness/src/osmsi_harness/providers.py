"""Small OpenAI-compatible chat adapter; no automatic retries or redirects."""

from dataclasses import dataclass, field
import hashlib
import http.client
import json
import math
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class ProviderError(RuntimeError):
    def __init__(self, message: str, *, credits: float | None = None):
        super().__init__(message)
        self.credits = credits


@dataclass(frozen=True)
class Completion:
    content: str
    revision: str
    execution_identity: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    credits: float | None = None
    finish_reason: str | None = None


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _number(value):
    try:
        number = float(value)
        return number if math.isfinite(number) and number >= 0 else None
    except (ValueError, TypeError):
        return None


def _tokens(value):
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


class ChatProvider:
    sample = False

    def __init__(self, model: str, *, base_url: str = "https://api.superlinked.com",
                 key_env: str = "SUPERLINKED_API_KEY", revision: str | None = None,
                 timeout: float = 60):
        self.model, self.revision, self.timeout = model, revision, timeout
        self.base_url = base_url.rstrip("/")
        try:
            parsed = urlsplit(self.base_url)
            local = parsed.hostname in ("localhost", "127.0.0.1", "::1")
            valid = (parsed.scheme == "https" or (parsed.scheme == "http" and local))
            valid = valid and bool(parsed.hostname) and not (
                parsed.username or parsed.password or parsed.query or parsed.fragment)
            valid = valid and parsed.path in ("", "/v1")
            parsed.port
        except ValueError:
            valid = False
        if not valid:
            raise ProviderError("Provider URL must use HTTPS (or loopback HTTP) and an optional /v1 path.")
        self.key = os.environ.get(key_env, "").strip()
        if not self.key and not local:
            raise ProviderError(f"Set {key_env} before using this provider.")
        if any(ord(char) < 33 or ord(char) > 126 for char in self.key):
            raise ProviderError("Provider credential contains invalid characters.")
        if not math.isfinite(timeout) or not 0 < timeout <= 300:
            raise ProviderError("Timeout must be greater than zero and at most 300 seconds.")

    def complete(self, messages: list[dict[str, str]], *, seed: int, max_tokens: int) -> Completion:
        url = self.base_url + ("/chat/completions" if self.base_url.endswith("/v1")
                               else "/v1/chat/completions")
        headers = {"Content-Type": "application/json"}
        if self.key:
            headers["Authorization"] = f"Bearer {self.key}"
        request = Request(url, data=json.dumps({
            "model": self.model, "messages": messages, "temperature": 0,
            "seed": seed, "max_tokens": max_tokens,
        }).encode(), headers=headers)
        try:
            with build_opener(NoRedirects()).open(request, timeout=self.timeout) as response:
                headers = response.headers
                # Bound response memory even if a provider ignores the requested token cap.
                raw = response.read(2_000_001)
                if len(raw) > 2_000_000:
                    raise ProviderError("Provider response exceeded 2 MB.",
                                        credits=_number(headers.get("X-Sie-Credits-Debited")))
                body = json.loads(raw)
        except HTTPError as error:
            code, credits = error.code, _number(error.headers.get("X-Sie-Credits-Debited"))
            error.close()
            raise ProviderError(f"Provider returned HTTP {code}; request was not retried.",
                                credits=credits) from None
        except (URLError, TimeoutError, OSError, http.client.HTTPException):
            raise ProviderError("Provider connection failed; billing status may be unknown.") from None
        except (ValueError, UnicodeError):
            raise ProviderError("Provider response was not valid JSON.") from None
        if not isinstance(body, dict):
            raise ProviderError("Provider response must be a JSON object.")
        usage = body.get("usage") if isinstance(body.get("usage"), dict) else {}
        credits = _number(headers.get("X-Sie-Credits-Debited"))
        if credits is None:
            credits = _number(usage.get("credits_charged"))
        choices = body.get("choices")
        choice = choices[0] if isinstance(choices, list) and choices else None
        message = choice.get("message") if isinstance(choice, dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str) or not content.strip():
            raise ProviderError("Provider returned no visible completion.", credits=credits)
        observed = headers.get("X-Sie-Model-Revision")
        if self.revision and observed and self.revision != observed:
            raise ProviderError("Provider model revision changed or disagrees with the pinned revision.",
                                credits=credits)
        revision = observed or self.revision
        if not revision:
            raise ProviderError("Provider did not report a revision; configure a pinned --revision.",
                                credits=credits)
        self.revision = revision
        return Completion(
            content, revision, headers.get("X-Sie-Execution-Identity-Sha256"),
            _tokens(usage.get("prompt_tokens")), _tokens(usage.get("completion_tokens")),
            credits, choice.get("finish_reason"),
        )


@dataclass
class DemoProvider:
    """Deterministic fixture adapter. It can only produce labeled sample runs."""

    answers: dict[str, str]
    model: str = "specimen-demo"
    revision: str = "synthetic-v1"
    sample: bool = field(default=True, init=False)

    def complete(self, messages: list[dict[str, str]], *, seed: int, max_tokens: int) -> Completion:
        key = hashlib.sha256(json.dumps(messages, sort_keys=True).encode()).hexdigest()
        return Completion(self.answers[key], self.revision, "synthetic", 0, 0, 0, "stop")


def demo_provider(suites, model="specimen-demo") -> DemoProvider:
    answers = {}
    for suite in suites:
        for probe in suite.probes:
            scorer = suite.document["scorer"]
            expected = probe["expected"]
            content = (json.dumps({"answer": expected, "confidence": 0.85})
                       if scorer == "calibration" else
                       json.dumps({"action": expected}) if scorer == "json-choice" else expected)
            key = hashlib.sha256(json.dumps(probe["messages"], sort_keys=True).encode()).hexdigest()
            answers[key] = content
    return DemoProvider(answers, model=model)
