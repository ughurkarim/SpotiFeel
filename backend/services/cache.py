import threading
import time


class TTLCache:
    """Small process-local TTL cache for public track metadata."""

    def __init__(self, ttl, max_items=1000):
        self.ttl = ttl
        self.max_items = max_items
        self._values = {}
        self._lock = threading.RLock()

    def get(self, key):
        with self._lock:
            entry = self._values.get(key)
            if not entry or time.time() - entry[0] >= self.ttl:
                self._values.pop(key, None)
                return None
            return entry[1]

    def set(self, key, value):
        with self._lock:
            if len(self._values) >= self.max_items:
                oldest = min(self._values, key=lambda item: self._values[item][0])
                self._values.pop(oldest, None)
            self._values[key] = (time.time(), value)

    def clear(self):
        with self._lock:
            self._values.clear()
