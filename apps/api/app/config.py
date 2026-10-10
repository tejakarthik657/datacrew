"""Runtime configuration. Everything comes from env; nothing secret lives in the repo."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

# Auto-load .env from ROOT, cwd, or apps/api if present
for _p in (ROOT / ".env", Path.cwd() / ".env", Path(__file__).resolve().parents[1] / ".env"):
    if _p.exists():
        for _line in _p.read_text(encoding="utf-8").splitlines():
            _line = _line.strip()
            if not _line or _line.startswith("#") or "=" not in _line:
                continue
            _k, _v = _line.split("=", 1)
            _k, _v = _k.strip(), _v.strip().strip("'\"")
            if _k not in os.environ:
                os.environ[_k] = _v


def _env(name: str, default: str) -> str:
    return os.getenv(name, default)


@dataclass
class Settings:
    mode: str = field(default_factory=lambda: _env("MODE", "local"))  # local | byo | cloud
    database_url: str = field(default_factory=lambda: _env("DATABASE_URL", f"sqlite:///{ROOT}/data/datacrew.db"))
    storage_dir: str = field(default_factory=lambda: _env("STORAGE_DIR", str(ROOT / "data" / "storage")))
    jwt_secret: str = field(default_factory=lambda: _env("JWT_SECRET", "dev-only-change-me-please-0123456789"))
    jwt_ttl_hours: int = field(default_factory=lambda: int(_env("JWT_TTL_HOURS", "12")))
    llm_provider: str = field(default_factory=lambda: _env("LLM_PROVIDER", "mock"))  # mock | ollama | openai_compat
    ollama_url: str = field(default_factory=lambda: _env("OLLAMA_URL", "http://localhost:11434"))
    ollama_model: str = field(default_factory=lambda: _env("OLLAMA_MODEL", "llama3.1"))
    llm_base_url: str = field(default_factory=lambda: _env("LLM_BASE_URL", ""))
    llm_api_key: str = field(default_factory=lambda: _env("LLM_API_KEY", ""))
    llm_model: str = field(default_factory=lambda: _env("LLM_MODEL", ""))
    max_upload_mb: int = field(default_factory=lambda: int(_env("MAX_UPLOAD_MB", "50")))
    web_dir: str = field(default_factory=lambda: _env("WEB_DIR", str(ROOT / "apps" / "web")))
    schemas_dir: str = field(default_factory=lambda: _env("SCHEMAS_DIR", str(ROOT / "packages" / "schemas")))
    neo4j_uri: str = field(default_factory=lambda: _env("NEO4J_URI", ""))
    neo4j_username: str = field(default_factory=lambda: _env("NEO4J_USERNAME", "neo4j"))
    neo4j_password: str = field(default_factory=lambda: _env("NEO4J_PASSWORD", ""))
    neo4j_database: str = field(default_factory=lambda: _env("NEO4J_DATABASE", "neo4j"))
    google_client_id: str = field(default_factory=lambda: _env("GOOGLE_CLIENT_ID", ""))
    google_client_secret: str = field(default_factory=lambda: _env("GOOGLE_CLIENT_SECRET", ""))
    google_redirect_uri: str = field(default_factory=lambda: _env("GOOGLE_REDIRECT_URI", "https://datacrew-gamma.vercel.app/auth/google/callback"))
    allowed_origins: str = field(default_factory=lambda: _env("ALLOWED_ORIGINS", "https://datacrew-gamma.vercel.app,http://localhost:3000,http://localhost:8000"))

    @property
    def external_llm_allowed(self) -> bool:
        """In local mode nothing ever leaves the machine except to localhost Ollama."""
        return self.mode in ("byo", "cloud")


settings = Settings()
