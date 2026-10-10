# Remaining work
## P0 (blocks the demo)
- [P0] Real-browser pass of `apps/web/index.html`: DOM flow is tested in jsdom; missing: visual/layout/mobile review; finish: `make dev`, walk the demo path, fix styling; effort S.
## P1 (wow / deep features not finished)
- [P1] Live-test URL ingest and Postgres/MySQL connectors; add a DB-import UI and scheduled re-scrape (Arq cron); effort S-M.
- [P1] Wow layer (v0.7): chat-to-clean + target schema mapping not built (executors `restructure_to_schema` and plan schema are ready); add LLM/heuristic NL→plan-step endpoint; effort M.
- [P1] Red Team agent + Safety Score, Synthetic Twin (v0.8): not built; effort M each.
- [P1] Fuzzy dedupe at scale + merge review UI + lineage graph (v0.9): `fuzzy_dedupe` executor exists (blocked rapidfuzz + networkx components); missing review UI, Splink, graph viz, Neo4j; effort M.
- [P1] LLM path live test: Ollama / OpenAI-compatible adapters unverified against a real model; effort S.
- [P1] LangGraph + Langfuse: crew is a plain state machine; port nodes if the graph library is wanted; effort S.
- [P1] statsforecast/Prophet backend for forecasts; Forecast Accountability UI; effort S.
- [P1] Large-file path (chunked upload, DuckDB/Polars lazy), Postgres + Arq worker mode; effort M.
## P2 (roadmap, design notes)
MCP business connectors (use MCP client per connector, land into the upload path); API/webhook ingest, email-in, watched folders, scheduled re-scrape (Arq cron); Ops autopilot and scheduling; auto-enrichment; Plain-English Governance; Data Time Machine (versions exist, add time-travel UI); Drift Sentinel (compare profiles per upload); Money Leak Finder / KPI Truth Layer (extend Strategist); Impact Tracker; billing/usage metering; DPDP/SOC 2 work. Effort L in aggregate.
## Next versions
v0.7 chat-to-clean → v0.8 deep four → v0.9 graph dedupe → v1.0 polish (browser pass, perf, docs).
