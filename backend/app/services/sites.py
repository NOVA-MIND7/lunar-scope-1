"""Landing-site metadata service.

SAMPLE DATA: the records below are illustrative metadata for UI development, entered by hand from
public mission descriptions. Coordinates are rounded and NOT survey-grade; "regional" entries are
approximate feature centres, not landing targets. No illumination, visibility or terrain values are
attached. Replace with cited catalogue values before any scientific use.
"""
from app.schemas.common import LunarCoordinates
from app.schemas.sites import LandingSite

SAMPLE_DISCLAIMER = (
    "Sample site metadata for development. Coordinates are approximate, entered by hand from public "
    "descriptions, and must be replaced with published, citable values before any scientific use. "
    "Regional entries are approximate feature centres, not landing coordinates. No computed results are included."
)


def classify_region(lat: float, lon: float) -> str:
    """Coarse region label. Mirrors frontend utils/lunarCoordinates.classifyRegion."""
    if lat >= 80:
        return "north-pole"
    if lat <= -80:
        return "south-pole"
    if abs(lat) < 10:
        return "equatorial"
    return "far-side" if abs(lon) > 90 else "near-side"


def _site(id_: str, name: str, category: str, precision: str, lat: float, lon: float,
          description: str, notes: str | None = None, year: int | None = None) -> LandingSite:
    return LandingSite(
        id=id_,
        name=name,
        region=classify_region(lat, lon),  # type: ignore[arg-type]
        category=category,  # type: ignore[arg-type]
        precision=precision,  # type: ignore[arg-type]
        coordinates=LunarCoordinates(latitude_deg=lat, longitude_deg=lon),
        year=year,
        provenance="sample",
        description=description,
        notes=notes,
    )


_H = "historical"
_R = "candidate-region"
_C = "clps"

_SITES: tuple[LandingSite, ...] = (
    # Historical landing sites (rounded published coordinates).
    _site("apollo-11", "Apollo 11 (Tranquility Base)", _H, "site", 0.674, 23.473, "First crewed landing, 1969, Mare Tranquillitatis.", year=1969),
    _site("apollo-12", "Apollo 12", _H, "site", -3.012, -23.422, "Crewed landing, 1969, Oceanus Procellarum.", year=1969),
    _site("apollo-14", "Apollo 14", _H, "site", -3.645, -17.471, "Crewed landing, 1971, Fra Mauro region.", year=1971),
    _site("apollo-15", "Apollo 15", _H, "site", 26.132, 3.633, "Crewed landing, 1971, Hadley-Apennine.", year=1971),
    _site("apollo-16", "Apollo 16", _H, "site", -8.973, 15.500, "Crewed landing, 1972, Descartes Highlands.", year=1972),
    _site("apollo-17", "Apollo 17", _H, "site", 20.191, 30.772, "Crewed landing, 1972, Taurus-Littrow valley.", year=1972),
    _site("change-3", "Chang'e 3", _H, "site", 44.121, -19.512, "Robotic landing, 2013, Mare Imbrium.", year=2013),
    _site("change-4", "Chang'e 4", _H, "site", -45.446, 177.599, "Robotic landing, 2019, Von Kármán crater on the far side.", year=2019),
    _site("chandrayaan-3", "Chandrayaan-3", _H, "site", -69.373, 32.319, "Robotic landing, 2023, southern highlands.", year=2023),
    _site("slim", "SLIM", _H, "approximate", -13.3, 25.25, "Japanese precision lander, 2024, near Shioli crater.", "Approximate coordinates.", year=2024),
    # Candidate exploration regions near the poles: approximate feature centres, not landing targets.
    _site("shackleton", "Shackleton crater region", _R, "regional", -89.9, 0.0, "Permanently shadowed crater at the south pole; a long-studied exploration region.", "Longitude is not meaningful this close to the pole.", year=2030),
    _site("faustini", "Faustini crater region", _R, "regional", -87.3, 77.0, "South polar crater region.", year=2030),
    _site("de-gerlache", "de Gerlache crater region", _R, "regional", -88.5, -87.1, "South polar crater region.", year=2030),
    _site("amundsen", "Amundsen crater region", _R, "regional", -84.5, 82.8, "South polar crater region.", year=2030),
    _site("nobile", "Nobile crater region", _R, "regional", -85.2, 53.3, "South polar crater region.", year=2030),
    _site("cabeus", "Cabeus crater region", _R, "regional", -84.9, -35.5, "South polar crater region studied by the LCROSS impact (2009).", year=2009),
    _site("south-pole-horizons", "South Pole JPL Horizons (Data CSV)", _R, "regional", -89.23, -30.98, "NASA JPL Horizons 2000-2030 Ephemeris test location (-89.23°S, -30.98°W) from Data/processed CSV files.", "Coordinates matched to Data/processed/sun_ephemeris_2000_2030.csv baseline observer point.", year=2000),
    _site("malapert-massif", "Malapert Massif region", _R, "regional", -85.9, 0.1, "Massif near the south pole with a favourable line of sight to Earth.", year=2030),
    _site("peary", "Peary crater region", _R, "regional", 88.6, 33.0, "North polar crater region.", year=2030),
    # CLPS-related mission target sites: approximate coordinates from public mission announcements.
    _site("clps-im-1", "IM-1 Odysseus (CLPS)", _C, "approximate", -80.13, 1.44, "Intuitive Machines lander, 2024, near Malapert A.", "Approximate; verify against NASA mission sources.", year=2024),
    _site("clps-blue-ghost-1", "Blue Ghost Mission 1 (CLPS)", _C, "approximate", 18.56, 61.81, "Firefly lander, 2025, Mare Crisium.", "Approximate; verify against NASA mission sources.", year=2025),
    _site("clps-im-2", "IM-2 Athena (CLPS)", _C, "approximate", -84.79, 29.2, "Intuitive Machines lander, 2025, Mons Mouton region.", "Approximate; verify against NASA mission sources.", year=2025),
)


def list_sites() -> list[LandingSite]:
    return list(_SITES)


def get_site(site_id: str) -> LandingSite | None:
    return next((s for s in _SITES if s.id == site_id), None)
