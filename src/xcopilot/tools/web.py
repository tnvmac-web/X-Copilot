"""Web tool — fetch URLs and extract content."""

from __future__ import annotations

from dataclasses import dataclass

from xcopilot.permission.pipeline import PermissionAction, PermissionResult


@dataclass
class WebResponse:
    """HTTP response from a web fetch."""

    status_code: int
    text: str
    headers: dict
    url: str

    def json(self) -> dict:
        """Parse response as JSON."""
        import json
        return json.loads(self.text)


class WebTool:
    """Fetch URLs with permission checks."""

    def __init__(self, pipeline=None) -> None:
        self.pipeline = pipeline

    def fetch(
        self,
        url: str,
        timeout: int = 15,
        method: str = "GET",
    ) -> WebResponse:
        """
        Fetch a URL and return the response.
        Checks network permission.
        """
        # Check permission
        if self.pipeline:
            result = self.pipeline.check(
                PermissionAction.NETWORK_REQUEST,
                {"url": url},
            )
            if result == PermissionResult.DENY:
                raise PermissionError(f"Network request denied: {url}")

        import urllib.error
        import urllib.request

        try:
            req = urllib.request.Request(
                url,
                method=method,
                headers={"User-Agent": "X-Copilot/0.1.0"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                text = resp.read().decode("utf-8", errors="ignore")
                headers = dict(resp.headers)
                return WebResponse(
                    status_code=resp.status,
                    text=text,
                    headers=headers,
                    url=url,
                )
        except urllib.error.URLError as e:
            raise ConnectionError(f"Failed to fetch {url}: {e}")

    def extract(self, url: str) -> str:
        """Fetch URL and extract clean markdown/text content."""
        response = self.fetch(url)
        text = response.text

        # Strip HTML tags for basic extraction
        import re
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text