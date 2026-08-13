"""Central Spotify/HTTP transport with safe JSON decoding."""

import requests


class APIClient:
    def __init__(self, timeout=10):
        self.timeout = timeout
        self.session = requests.Session()

    def get(self, url, **kwargs):
        kwargs.setdefault("timeout", self.timeout)
        return self.session.get(url, **kwargs)

    def post(self, url, **kwargs):
        kwargs.setdefault("timeout", self.timeout)
        return self.session.post(url, **kwargs)

    def put(self, url, **kwargs):
        kwargs.setdefault("timeout", self.timeout)
        return self.session.put(url, **kwargs)


def safe_json(response):
    try:
        return response.json()
    except (AttributeError, ValueError):
        return None
