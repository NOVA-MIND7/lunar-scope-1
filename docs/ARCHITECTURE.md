# Architecture

```
Browser (React SPA, :5173)  --/api (Vite proxy)-->  FastAPI (:8000)  -->  [optional] Supabase/PostgreSQL
                                                         |
                                                         +-- astronomy/ ephemeris/ terrain/ calculations/ recommendations/
```

## Frontend (`frontend/src`)

| Folder | Role |
|---|---|
| `app/` | App shell, router, top-level pages (dashboard, settings) |
| `components/` | Shared UI: `layout`, `navigation`, `dashboard`, `charts`, `common` |
| `features/` | One folder per module (explorer, navigator, solar, earth, timeline, compare, terrain, recommendations, reports). Each owns its page and later its hooks/components |
| `stores/` | Zustand global state (`appStore.ts`) |
| `services/` | HTTP client (`api.ts`) with a typed `ApiError` |
| `hooks/` | TanStack Query hooks (server state) |
| `types/`, `constants/`, `utils/`, `styles/` | Shared types, routes/design tokens, UTC helpers, Tailwind theme |

State split: **Zustand** holds user selection and simulation clock; **TanStack Query** holds server data.
Heavy pages (Three.js) are code-split with `React.lazy`.

## Backend (`backend/app`)

| Folder | Role |
|---|---|
| `api/routes/` | HTTP layer only — validation in, schema out |
| `schemas/` | Pydantic request/response contracts (strict, `extra="forbid"`, UTC-only datetimes) |
| `services/` | Application logic (site metadata today) |
| `astronomy/`, `ephemeris/`, `terrain/`, `calculations/`, `recommendations/` | Scientific code, kept free of HTTP concerns (empty until their phases) |
| `core/` | Settings and the uniform error envelope |
| `database/`, `models/` | Reserved for optional persistence |

Scientific logic never lives in route handlers, so it can be tested and reused without FastAPI.

## Conventions

- Errors: `{"error": {"code", "message", "details?"}}`.
- Unimplemented science: HTTP 501 `not_implemented`; the UI shows an explicit notice with no numbers.
- Sample data is labelled (`data_status: "sample"`, `provenance: "sample"`) end to end.
- Wire format is snake_case on both sides.

## Mission-control UI (Phase 2)

- **Shell:** `components/layout/AppShell` (sidebar + topbar + routed content + toasts). Sidebar is a collapsible rail on tablet/desktop (state in `stores/uiStore`, persisted) and an off-canvas drawer on mobile.
- **Common components:** `MetricCard`, `StatusIndicator`, `DataSourceBadge` / `DataQualityMeter`, `MissionPanel`, `DataRow`, `EmptyState`, `LoadingState`, `ErrorState`, `Toaster`.
- **Dashboard components:** `VisualizationPanel` (wraps the shared `LunarGlobe`), `TimelinePreview`, `MissionControls`, `MissionConditions`.
- **Honesty rules:** metric cards show `—` with a "No data" quality meter until the engine exists. Timeline demo bars appear only after the user turns on "Show demo data", are hatched, and are labelled DEMO DATA. Quality states: `unavailable | demo | sample | computed`.

## 3D Lunar Explorer (Phase 3)

One reusable component, `features/lunar-explorer/globe/LunarGlobe`, is used by the dashboard (`variant="compact"`), Lunar Explorer (`"full"`) and Landing Navigator (`"compact"`). Scene state lives in `globeStore` (zustand) because React context does not cross the R3F `<Canvas>`.

**Coordinate convention** (`utils/lunarCoordinates.ts`, unit-tested): body-fixed, +Y north pole, +Z at lat 0 / lon 0, +X at lon +90 E. `x = r cosφ sinλ`, `y = r sinφ`, `z = r cosφ cosλ`. Longitude is normalised to (-180, 180]. The globe is never rotated; the camera orbits. The equirectangular texture is yawed by `TEXTURE_YAW = -π/2` because `SphereGeometry` puts u = 0.5 on +X; a test checks this against real geometry UVs.

**Selection pipeline:** a globe click, a typed coordinate and a marker click all end in `globeStore.setPending` → `canonicalCoordinates` (4 decimals, wrapped longitude, lon 0 at poles) → the global `selectedCoordinates`. `SELECT THIS LOCATION` calls `confirmPending` → `selectLandingSite(createCustomSite(...))`.

**Surface imagery:** `useMoonTextures` probes the configured URLs (HEAD, must return `image/*`; Vite serves HTML for missing files). If none exist it generates a deterministic procedural surface and labels it "Procedural fallback surface … Not NASA data". See `public/textures/README.md` to install NASA imagery.

**Lighting:** the Sun direction is an illustrative default (`ILLUSTRATIVE_SUN`) passed as a prop; it is labelled "Illustrative light" until the ephemeris engine exists.

**Sites:** every site has a `category` (historical, candidate-region, clps, custom) and `precision` (site, approximate, regional). Regional entries are approximate feature centres and are never presented as landing coordinates.

**Known dev-only message:** in `npm run dev`, React 19 StrictMode with R3F v9 logs "Attempted to synchronously unmount a root while React was already rendering". It does not occur in production builds. `THREE.Clock` deprecation warning comes from inside R3F.

**WebGL e2e:** `PLAYWRIGHT_SOFTWARE_GL=1 npx playwright test` renders in software on GPU-less machines (about 15 s to start).
