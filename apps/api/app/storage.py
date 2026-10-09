"""StorageAdapter interface + local-disk implementation (cloud adapters are optional, see REMAINING.md)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from .config import settings


class StorageAdapter(ABC):
    @abstractmethod
    def put(self, key: str, data: bytes) -> None: ...
    @abstractmethod
    def get(self, key: str) -> bytes: ...
    @abstractmethod
    def exists(self, key: str) -> bool: ...
    @abstractmethod
    def delete(self, key: str) -> None: ...


class LocalStorage(StorageAdapter):
    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root not in p.parents:
            raise ValueError("path traversal blocked")
        return p

    def put(self, key: str, data: bytes) -> None:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def exists(self, key: str) -> bool:
        return self._path(key).exists()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


def get_storage() -> StorageAdapter:
    # STUB: Supabase / HF dataset / GitHub adapters not implemented; local disk is the only backend.
    return LocalStorage(settings.storage_dir)
