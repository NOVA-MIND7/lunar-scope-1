# API documentation

Base URL (dev): `http://localhost:8000/api` (via the Vite proxy: `http://localhost:5173/api`).
Interactive docs: `/api/docs`. OpenAPI: `/api/openapi.json`.

All timestamps are UTC ISO-8601 with `Z`; naive or non-UTC offsets are rejected with 422.
Errors use `{"error": {"code": "...", "message": "...", "details": ...}}`.

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/health` | Implemented | `status`, `service`, `version`, `time_utc`, `database` |
| GET | `/sites` | Implemented (sample) | `data_status: "sample"`, `disclaimer`, `count`, `sites[]` |
| GET | `/sites/{site_id}` | Implemented (sample) | 404 `site_not_found` if unknown |
| POST | `/astronomy/positions` | 501 | Sun/Earth azimuth & elevation over a time range |
| POST | `/astronomy/sunlight` | 501 | Sunlit/shadowed intervals |
| POST | `/astronomy/earth-visibility` | 501 | Earth visibility intervals |
| POST | `/terrain/horizon` | 501 | Horizon elevation profile by azimuth |
| POST | `/missions/compare` | 501 | 2–8 scenarios |
| POST | `/missions/recommend` | 501 | Ranked sites/times under constraints |
| POST | `/missions/windows` | 501 | Landing windows for a site |

501 responses mean the contract is fixed but the calculation does not exist yet. Request/response schemas for these
endpoints are in `backend/app/schemas/` and in the OpenAPI document.

## Example

```
GET /api/sites/shackleton-rim
{ "id": "shackleton-rim", "name": "Shackleton Crater Rim", "region": "south-pole",
  "coordinates": { "latitude_deg": -89.9, "longitude_deg": 0.0 }, "provenance": "sample", ... }
```

## Site fields (Phase 3)

`GET /api/sites` entries now include `category` (`historical | candidate-region | clps`) and `precision` (`site | approximate | regional`). All entries have `provenance: "sample"`; `regional` entries are approximate feature centres, not landing coordinates.
