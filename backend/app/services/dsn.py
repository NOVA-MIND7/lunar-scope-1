"""NASA Deep Space Network (DSN) Ground Stations Service.

Manages the primary deep space communications tracking stations:
  - DSN 01 – Goldstone (California, USA)
  - DSN 02 – Madrid (Spain)
  - DSN 03 – Canberra (Australia)
Provides station geometry, status, and line-of-sight tracking calculations.
"""
from datetime import datetime
import math
from typing import List, Dict, Any

from app.schemas.common import ApiModel, UTCDateTime


class DSNStation(ApiModel):
    id: str
    station_code: str
    name: str
    location: str
    country: str
    latitude_deg: float
    longitude_deg: float
    dish_diameter_m: float
    elevation_m: float
    status: str  # "active", "tracking", "standby"
    description: str


# The 3 primary Deep Space Network complexes separated by ~120 degrees longitude
_DSN_STATIONS: List[DSNStation] = [
    DSNStation(
        id="dsn-01",
        station_code="DSN 01",
        name="DSN 01 – Goldstone",
        location="California, USA",
        country="USA",
        latitude_deg=35.4266,
        longitude_deg=-116.8900,
        dish_diameter_m=70.0,
        elevation_m=1036.0,
        status="active",
        description="Goldstone Deep Space Communications Complex located in the Mojave Desert, California. Features the iconic DSS-14 70m antenna.",
    ),
    DSNStation(
        id="dsn-02",
        station_code="DSN 02",
        name="DSN 02 – Madrid",
        location="Spain",
        country="Spain",
        latitude_deg=40.4314,
        longitude_deg=-4.2480,
        dish_diameter_m=70.0,
        elevation_m=834.0,
        status="active",
        description="Madrid Deep Space Communications Complex located in Robledo de Chavela, Spain. European node featuring the DSS-63 70m antenna.",
    ),
    DSNStation(
        id="dsn-03",
        station_code="DSN 03",
        name="DSN 03 – Canberra",
        location="Australia",
        country="Australia",
        latitude_deg=-35.4014,
        longitude_deg=148.9817,
        dish_diameter_m=70.0,
        elevation_m=650.0,
        status="active",
        description="Canberra Deep Space Communication Complex located in Tidbinbilla, Australia. Southern hemisphere node featuring the DSS-43 70m antenna.",
    ),
]


def list_dsn_stations() -> List[DSNStation]:
    """Return all DSN ground stations."""
    return list(_DSN_STATIONS)


def get_active_tracking_station(dt: datetime) -> Dict[str, Any]:
    """
    Calculate which DSN ground station currently has the highest elevation angle
    to the Moon / sub-Earth point at the given UTC time based on Earth's rotation.
    """
    t_sec = dt.timestamp()
    days = (t_sec - 946728000.0) / 86400.0

    # Greenwich Mean Sidereal Time (GMST) in degrees
    # Earth rotates 360 deg every ~86164.09 sec (~360.9856 deg/day)
    gmst_deg = ((280.4606 + 360.985647366 * days) % 360.0 + 360.0) % 360.0

    # Moon right ascension approximate (advances 360 deg in 27.32166 days)
    moon_ra_deg = ((218.316 + 13.176396 * days) % 360.0 + 360.0) % 360.0

    station_elevations = []
    for station in _DSN_STATIONS:
        # Local hour angle = GMST + Longitude - Moon RA
        station_lon = station.longitude_deg
        lha_deg = ((gmst_deg + station_lon - moon_ra_deg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0

        # Elevation angle estimation above station local horizon
        phi = math.radians(station.latitude_deg)
        cos_ha = math.cos(math.radians(lha_deg))

        # Approximate elevation angle (degrees)
        sin_elev = math.cos(phi) * cos_ha
        elev_deg = math.degrees(math.asin(max(-1.0, min(1.0, sin_elev))))

        is_visible = elev_deg > 6.0  # Station horizon mask (typically 6-10 degrees)
        station_elevations.append({
            "station": station.model_dump(),
            "elevation_deg": round(elev_deg, 2),
            "is_tracking": is_visible,
        })

    # Sort to find primary active tracking station (highest elevation)
    sorted_stations = sorted(station_elevations, key=lambda s: s["elevation_deg"], reverse=True)
    primary = sorted_stations[0]

    return {
        "timestamp_utc": dt.isoformat(),
        "network": "NASA Deep Space Network (DSN)",
        "primary_tracking_station": primary["station"]["name"],
        "primary_station_elevation_deg": primary["elevation_deg"],
        "coverage_summary": "Continuous 24/7 Deep Space Coverage Active",
        "stations": sorted_stations,
    }
