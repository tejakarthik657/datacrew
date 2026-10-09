import os
import sys
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="datacrew_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["STORAGE_DIR"] = f"{_tmp}/storage"
os.environ["MODE"] = "local"
os.environ["LLM_PROVIDER"] = "mock"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
DEMO = ROOT / "data" / "demo" / "dirty_customers.csv"


@pytest.fixture(scope="session")
def client():
    from app.main import app
    return TestClient(app)


def _register(client, email):
    r = client.post("/auth/register", json={"email": email, "password": "password123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}, r.json()


@pytest.fixture(scope="session")
def alice(client):
    return _register(client, "alice@example.com")[0]


@pytest.fixture(scope="session")
def bob(client):
    return _register(client, "bob@example.com")[0]


@pytest.fixture(scope="session")
def demo_bytes():
    if not DEMO.exists():
        import subprocess
        subprocess.check_call([sys.executable, str(ROOT / "scripts" / "demo_data" / "make_dirty.py")])
    return DEMO.read_bytes()
