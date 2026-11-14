# Scientific methodology

**Phase 1 implements no scientific calculations.** This document records the intended approach so later phases are
built consistently. Nothing here is a result.

## Principles

1. No fabricated values: if a quantity cannot be computed from a cited source, the API returns 501 and the UI says so.
2. UTC everywhere; conversion to other time scales (TDB/TT for ephemerides) happens inside the scientific layer.
3. Every output names its method and data source (`method`, `ephemeris` fields in the response contracts).
4. Coordinates are selenographic latitude/longitude in degrees, east-positive longitude; the reference frame
   (mean-Earth/polar-axis) and lunar reference radius will be stated explicitly when implemented.

## Planned modules

| Module | Intended method | Inputs |
|---|---|---|
| Sun/Earth positions | Ephemerides (Skyfield with JPL kernels; SPICE later), transformed to the local horizon frame of the site | Site lat/lon, UTC times |
| Sunlight | Sun elevation vs. local horizon; intervals by root-finding on elevation crossings | Positions, horizon profile |
| Earth visibility | Earth elevation above horizon (and minimum elevation) over time | Positions, horizon profile |
| Terrain horizon | Ray/line-of-sight sweep over a DEM for each azimuth | DEM, observer height |
| Windows / compare / recommend | Aggregations of the above under user constraints | Constraints, weights |

## Known limitations to address

- Libration and the Moon's orientation model must come from a published lunar orientation model (e.g. SPICE PCK/frame kernels).
- Without a terrain horizon, "sunlit" means above the *mathematical* horizon only; this must be stated in outputs.
- Sun is an extended disk (~0.27° radius); the treatment of partial occultation must be documented.

Validation plan: compare against published tools/data for reference sites and record tolerances in tests.
