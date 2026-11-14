# LUNAR SCOPE

Lunar landing-site intelligence and mission-planning platform — NASA Space Apps Challenge 2026.

**Status: Phase 3 (interactive 3D Lunar Explorer).** Mission-control UI and the 3D Moon (rotate, zoom, pan, click or
type coordinates, markers, South Pole mode) are working. The scientific modules (sun position, illumination, Earth
visibility, terrain horizon, comparison, recommendations) are still documented interfaces that return **HTTP 501**; no
results are invented. The Moon uses a labelled procedural surface until you add NASA textures (see
`frontend/public/textures/README.md`).

## Stack

Frontend: React, TypeScript, Vite, Tailwind CSS 4, Three.js / React Three Fiber / Drei, React Router, Zustand, TanStack Query, Recharts, Framer Motion, Lucide.
Backend: Python, FastAPI, Pydantic, NumPy, SciPy, Skyfield, Astropy (SPICE planned). Database: optional Supabase/PostgreSQL.
Tests: Vitest + React Testing Library, Pytest, Playwright.

## Prerequisites

- Node.js 20+ (developed on 22) and npm
- Python 3.11+ (developed on 3.13)

## Quick start (two terminals)

### Terminal 1 — backend (port 8000)

**Windows PowerShell**

```powershell
cd backend
python -m venv .venv
# If activation is blocked, run once:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

**macOS / Linux**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs · Health: http://localhost:8000/api/health

### Terminal 2 — frontend (port 5173)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend, so no CORS setup is needed in the browser.

## Scripts

| Where | Command | Purpose |
|---|---|---|
| frontend | `npm run dev` | Dev server on 5173 |
| frontend | `npm run build` | Type-check and production build |
| frontend | `npm test` | Vitest unit/component tests |
| frontend | `npm run test:e2e` | Playwright (first run: `npx playwright install chromium`) |
| backend | `python -m pytest` | Backend tests |

## Configuration

Copy `backend/.env.example` to `backend/.env` and (optionally) `frontend/.env.example` to `frontend/.env.local`.
Never commit `.env` files or credentials; `.gitignore` excludes them. The database is optional and disabled when
`DATABASE_URL` is empty.

## Time standard

All scientific timestamps are **UTC** (ISO-8601 with `Z`). The API rejects naive or non-UTC timestamps, and the UI labels times as UTC.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Scientific methodology](docs/SCIENTIFIC_METHODOLOGY.md)
- [Data sources](docs/DATA_SOURCES.md)
- [API documentation](docs/API_DOCUMENTATION.md)

## Docker (optional)

`docker compose up` starts both servers using the same commands as above.
