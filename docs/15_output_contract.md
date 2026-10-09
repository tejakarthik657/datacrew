# PART 15: OUTPUT CONTRACT (WHAT YOU MUST DELIVER)

## 15.1 Repository layout (final)
```
datacrew/
├─ README.md  STATUS.md  REMAINING.md  CHANGELOG.md  .env.example  Makefile  docker-compose.yml
├─ apps/web/                  frontend
├─ apps/api/                  FastAPI, agents, workers, tests
├─ packages/schemas/          JSON schemas (plan step, passport)
├─ scripts/demo_data/         make_dirty.py, make_contract.py, outputs in data/demo/
├─ infra/                     compose files, GitHub Actions (CI + keep-alive)
└─ docs/                      the spec parts
```

## 15.2 STATUS.md format
```
# Status: vX.Y (date)
## Run it
<exact commands>
## Module status
| Module | Version | State (done/partial/stub) | Tests | Notes |
## Demo checklist
- [ ] upload dirty file → score ~42 ...
## Known issues
```

## 15.3 REMAINING.md format
```
# Remaining work
## P0 (blocks the demo)
## P1 (wow / deep features not finished)
## P2 (roadmap: connectors, ops autopilot, governance, time machine, drift, money leak, KPI layer, impact tracker, billing, compliance)
Each item: what exists | what is missing | how to finish | rough effort (S/M/L)
## Next versions
v1.1 ... v1.x plan
```

## 15.4 Zip
Create `datacrew.zip` at the output location (excluding `node_modules`, `.venv`, `__pycache__`, runtime `data/` except `data/demo/`). Verify by listing the zip contents.

## 15.5 Final message to the user
State: version reached; how to run in 3 commands; what works end to end; what is stubbed or left (point to `REMAINING.md`); which cloud services were not configured; any assumptions; next recommended step.

## 15.6 Start now
Begin with **v0.1**. Do not ask clarifying questions unless something blocks you completely; make reasonable assumptions, record them in `STATUS.md`, and keep building until you reach the highest version you can complete cleanly.
