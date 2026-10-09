"""Notifier adapter: console + file log (email/Slack are optional and not implemented)."""
from __future__ import annotations

import datetime as dt
from pathlib import Path

from .config import settings


def notify(workspace_id: str, message: str) -> None:
    line = f"{dt.datetime.now(dt.timezone.utc).isoformat()} [{workspace_id}] {message}"
    print("NOTIFY", line)
    log = Path(settings.storage_dir) / "notifications.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
