# DataCrew: Autonomous AI Data Operations Platform

> Messy Data In, Trusted Data Out.

DataCrew is an enterprise-grade, autonomous AI data agent platform designed for automated data cleaning, compliance auditing, financial forecasting, and strategic decision support. By combining a deterministic data transformations engine with an autonomous multi-agent hierarchy (Supervisor, Cleaner, Analyst, Forecaster, Strategist), DataCrew transforms unstructured and raw datasets into standardized, verifiable, and actionable data assets.

---

## Technical Architecture

```
                               +-------------------------+
                               |   Next.js 15 Web App    |
                               | (Vercel / React 19 / TS)|
                               +------------+------------+
                                            | REST API / JWT Cookie
                                            v
                               +-------------------------+
                               |   FastAPI Python API    |
                               |   (Render / Async IO)   |
                               +------+-----------+------+
                                      |           |
                      +---------------+--+     +--+---------------+
                      | SQLite / Postgres |     | Neo4j Graph DB   |
                      |   (Relational)    |     | (Data Lineage)   |
                      +-------------------+     +------------------+
```

### System Components

- **Frontend Application (`apps/web`)**: Next.js 15 App Router built with React 19, TypeScript, Tailwind CSS, Radix UI primitives, TanStack Query, and Recharts visualization.
- **Backend Service (`apps/api`)**: FastAPI service running asynchronous Python core routines, tenant-isolated data pipelines, SQL security guardrails, and Neo4j graph provenance drivers.
- **Data Persistence**: Relational storage for tenant metadata, dataset versions, and hash-chained audit ledgers, paired with Neo4j AuraDB for graph-based dataset lineage.
- **Deployment Infrastructure**: Pre-configured blueprints for Vercel (Frontend) and Render (Backend API).

---

## Core Capabilities

### 1. Multi-Agent AI Crew
DataCrew orchestrates five specialized agents to process data sequentially and interactively:
- **Supervisor Agent**: Manages pipeline state, coordinates agent handoffs, and enforces approval gates.
- **Cleaner Agent**: Scans datasets for anomalies and generates schema-validated cleaning proposals.
- **Analyst Agent**: Executes natural language data queries using a strict `SELECT`-only SQL parser guard.
- **Forecaster Agent**: Analyzes historical metrics to produce trend models and predictive forecasts.
- **Strategist Agent**: Ranks business opportunities and quantifies financial impact.

### 2. Deterministic Data Cleaning Engine
- **14 Transformation Step Types**: Deduplication, outlier filtering, missing value imputation, type standardization, regex cleanup, and PII masking.
- **Granular Control**: Toggle individual cleaning steps, preview changes on sample subsets, and review before/after diffs prior to full execution.
- **Reproducible Recipes**: Export executed cleaning pipelines as standalone Python scripts, SQL queries, or JSON schemas.
- **Version Management**: Complete snapshot history supporting one-click version rollbacks.

### 3. Trust, Security & Compliance
- **Tenant Isolation**: Workspace-scoped database queries and authorization token enforcement.
- **Authentication**: Email/password authentication and Google OAuth ("Continue with Google") flow.
- **Cryptographic Audit Ledger**: Immutable, hash-chained logs recording every dataset modification.
- **PII Detection**: Automatic identification and masking of sensitive personal information.
- **Neo4j Provenance Graph**: Interactive DAG visualization tracking dataset origin and downstream transformations.

### 4. Lifecycle Management & Exports
- **Dataset Deletion**: Secure soft and hard deletion endpoints for dataset removal.
- **Multi-Format Export**: Export cleaned data as CSV, XLSX, or Parquet files.

---

## Repository Structure

```
datacrew/
|-- apps/
|   |-- api/                     # FastAPI Backend Application
|   |   |-- app/
|   |   |   |-- main.py          # Application entrypoint & REST routes
|   |   |   |-- auth.py          # Authentication & Google OAuth handlers
|   |   |   |-- services.py      # Business logic & tenant orchestration
|   |   |   |-- graph.py         # Neo4j AuraDB graph driver
|   |   |   `-- core/            # Cleaning engine, planner, SQL guard, analyst
|   |   `-- tests/               # Pytest test suite (54/54 passing)
|   `-- web/                     # Next.js 15 Web Application
|       |-- src/                 # React components, hooks, and app routes
|       `-- package.json         # Managed via pnpm (Next.js 15.5.27)
|-- docs/                        # Specifications and deployment documentation
|-- render.yaml                  # Render deployment configuration
|-- README.md                    # Project documentation
`-- STATUS.md                    # System status and build verification
```

---

## Local Development Setup

### Prerequisites
- Python 3.11 or higher
- Node.js 20 or higher
- `pnpm` package manager
- Git

### 1. Backend Service Setup

```bash
# Navigate to API directory
cd apps/api

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run test suite
pytest

# Start development server
uvicorn app.main:app --reload --port 8000
```
Backend API will be available at `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).

### 2. Frontend Application Setup

```bash
# Navigate to Web directory
cd apps/web

# Install dependencies
npx pnpm install

# Start development server
npx pnpm dev
```
Frontend application will be available at `http://localhost:3000`.

---

## Production Deployment

DataCrew includes production deployment configurations:

| Component | Host Platform | Configuration File |
| :--- | :--- | :--- |
| **Frontend Application** | Vercel | `apps/web/vercel.json` |
| **Backend Service** | Render | `render.yaml` |
| **Graph Database** | Neo4j AuraDB | Managed Cloud Instance |

Detailed deployment guides and environment variable specifications are available in [`docs/DEPLOYMENT.md`](file:///c:/Programming/Projects/05_Social-Impact/datacrew%20%281%29/datacrew/docs/DEPLOYMENT.md).

---

## Testing & Quality Assurance

- **Backend Unit Tests**: Run `pytest` inside `apps/api` (54/54 tests passing).
- **Frontend Type Checking**: Run `npx pnpm typecheck` inside `apps/web`.
- **Frontend Linting**: Run `npx pnpm lint` inside `apps/web`.
- **Production Build Validation**: Run `npx pnpm run build` inside `apps/web`.

---

## License

MIT License. See LICENSE for details.