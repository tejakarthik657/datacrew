.PHONY: install demo-data dev test demo
PY ?= python3
install:
	$(PY) -m venv .venv && . .venv/bin/activate && pip install -q -r apps/api/requirements.txt
demo-data:
	$(PY) scripts/demo_data/make_dirty.py
dev: demo-data
	cd apps/api && uvicorn app.main:app --reload --port 8000
test: demo-data
	cd apps/api && $(PY) -m pytest -q tests
demo: demo-data
	cd apps/api && $(PY) ../../scripts/run_demo.py
