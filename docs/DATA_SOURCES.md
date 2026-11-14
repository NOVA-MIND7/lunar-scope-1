# Data sources

| Data | Status | Intended source |
|---|---|---|
| Site metadata | **Sample** — hand-entered, approximate coordinates in `backend/app/services/sites.py` | Replace with cited published catalogues |
| Ephemerides | Not integrated | JPL planetary ephemerides (DE series) via Skyfield; SPICE kernels (NAIF) in a later phase |
| Lunar orientation | Not integrated | NAIF lunar PCK / frame kernels |
| Elevation (DEM) | Not integrated | LRO LOLA gridded products (NASA PDS) |
| Textures | None committed | NASA Scientific Visualization Studio / LRO imagery (check licence before bundling) |

Each dataset added must record: provider, version, licence, retrieval date, and processing steps. Sample records must
stay labelled `provenance: "sample"` until replaced by cited values.

## Lunar surface imagery

No NASA/USGS imagery is bundled; the build environment could not reach those hosts. The Explorer uses a labelled procedural fallback until textures are installed per `frontend/public/textures/README.md`. Credit the source (for example NASA SVS / LRO LROC) in `moonTextureConfig.ts` when you install real imagery.
