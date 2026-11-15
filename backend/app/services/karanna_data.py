"""Load and serve Karanna project data folders (raw data, processes data).

These datasets are precomputed ephemeris/terrain files bundled with the project.
"""
from __future__ import annotations

import csv
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings

_DATE_FMT = "%Y-%b-%d %H:%M"


def _parse_dt(s: str) -> datetime:
    # e.g. 2000-Apr-01 00:00
    return datetime.strptime(s.strip(), _DATE_FMT).replace(tzinfo=timezone.utc)


def _project_root() -> Path:
    # backend/app/services/karanna_data.py -> project root
    return Path(__file__).resolve().parents[3]


def _data_dir(name: str) -> Path:
    settings = get_settings()
    if name == "raw":
        return Path(settings.raw_data_dir) if settings.raw_data_dir else _project_root() / "raw data"
    return Path(settings.processed_data_dir) if settings.processed_data_dir else _project_root() / "processes data"


@lru_cache(maxsize=8)
def _read_csv(path_str: str) -> list[dict[str, str]]:
    path = Path(path_str)
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def _filter_by_time(rows: list[dict[str, str]], start_utc: datetime | None, end_utc: datetime | None,
                    time_field: str = "date_time_utc") -> list[dict[str, str]]:
    if start_utc is None and end_utc is None:
        return rows
    out = []
    for r in rows:
        try:
            dt = _parse_dt(r[time_field])
        except Exception:
            continue
        if start_utc and dt < start_utc:
            continue
        if end_utc and dt > end_utc:
            continue
        out.append(r)
    return out


def _sample(rows: list[dict[str, Any]], limit: int, step: int = 1) -> list[dict[str, Any]]:
    if step > 1:
        rows = rows[::step]
    if limit > 0:
        rows = rows[:limit]
    return rows


def get_sun_ephemeris(start_utc: datetime | None = None, end_utc: datetime | None = None,
                      limit: int = 500, step: int = 1) -> dict[str, Any]:
    path = _data_dir("processed") / "sun_ephemeris_2000_2030.txt"
    rows = _read_csv(str(path))
    filtered = _filter_by_time(rows, start_utc, end_utc)
    sampled = _sample(filtered, limit, step)
    return {
        "dataset": "sun_ephemeris_2000_2030",
        "source": "Karanna processes data",
        "path": str(path),
        "available": path.exists(),
        "total_rows": len(rows),
        "returned_rows": len(sampled),
        "records": [
            {
                "time_utc": _parse_dt(r["date_time_utc"]).isoformat().replace("+00:00", "Z"),
                "sun_azimuth_deg": float(r["sun_azimuth_deg"]),
                "sun_elevation_deg": float(r["sun_elevation_deg"]),
                "horizons_marker": r.get("horizons_marker", ""),
            }
            for r in sampled if r.get("date_time_utc")
        ],
    }


def get_earth_ephemeris(start_utc: datetime | None = None, end_utc: datetime | None = None,
                        limit: int = 500, step: int = 1) -> dict[str, Any]:
    path = _data_dir("processed") / "earth_ephemeris_2000_2030.txt"
    rows = _read_csv(str(path))
    filtered = _filter_by_time(rows, start_utc, end_utc)
    sampled = _sample(filtered, limit, step)
    return {
        "dataset": "earth_ephemeris_2000_2030",
        "source": "Karanna processes data",
        "path": str(path),
        "available": path.exists(),
        "total_rows": len(rows),
        "returned_rows": len(sampled),
        "records": [
            {
                "time_utc": _parse_dt(r["date_time_utc"]).isoformat().replace("+00:00", "Z"),
                "earth_azimuth_deg": float(r["earth_azimuth_deg"]),
                "earth_elevation_deg": float(r["earth_elevation_deg"]),
                "horizons_marker": r.get("horizons_marker", ""),
            }
            for r in sampled if r.get("date_time_utc")
        ],
    }


def get_lunar_environment(start_utc: datetime | None = None, end_utc: datetime | None = None,
                          limit: int = 500, step: int = 1) -> dict[str, Any]:
    path = _data_dir("processed") / "lunar_environment_ephemeris_2000_2030.txt"
    rows = _read_csv(str(path))
    filtered = _filter_by_time(rows, start_utc, end_utc)
    sampled = _sample(filtered, limit, step)
    return {
        "dataset": "lunar_environment_ephemeris_2000_2030",
        "source": "Karanna processes data",
        "path": str(path),
        "available": path.exists(),
        "total_rows": len(rows),
        "returned_rows": len(sampled),
        "records": [
            {
                "time_utc": _parse_dt(r["date_time_utc"]).isoformat().replace("+00:00", "Z"),
                "sun_azimuth_deg": float(r["sun_azimuth_deg"]),
                "sun_elevation_deg": float(r["sun_elevation_deg"]),
                "earth_azimuth_deg": float(r["earth_azimuth_deg"]),
                "earth_elevation_deg": float(r["earth_elevation_deg"]),
            }
            for r in sampled if r.get("date_time_utc")
        ],
    }


def get_south_pole_terrain(limit: int = 2000) -> dict[str, Any]:
    path = _data_dir("raw") / "south_pole_terrain.txt"
    rows = _read_csv(str(path))
    if limit > 0 and len(rows) > limit:
        total = len(rows)
        # Uniform index stride across the full 2D terrain grid rather than slicing rows[:limit].
        sampled = [rows[(i * total) // limit] for i in range(limit)]
    else:
        sampled = rows
    return {
        "dataset": "south_pole_terrain",
        "source": "Karanna raw data",
        "path": str(path),
        "available": path.exists(),
        "total_rows": len(rows),
        "returned_rows": len(sampled),
        "records": [
            {
                "latitude_deg": float(r["latitude"]),
                "longitude_deg": float(r["longitude"]),
                "elevation_m": float(r["elevation_m"]),
                "slope_deg": float(r["slope_deg"]),
            }
            for r in sampled if r.get("latitude")
        ],
    }


def list_data_assets() -> dict[str, Any]:
    raw = _data_dir("raw")
    proc = _data_dir("processed")
    assets = []
    for name, p, kind in [
        ("sun_ephemeris_2000_2030", proc / "sun_ephemeris_2000_2030.txt", "processed-ephemeris"),
        ("earth_ephemeris_2000_2030", proc / "earth_ephemeris_2000_2030.txt", "processed-ephemeris"),
        ("lunar_environment_ephemeris_2000_2030", proc / "lunar_environment_ephemeris_2000_2030.txt", "processed-ephemeris"),
        ("south_pole_terrain", raw / "south_pole_terrain.txt", "raw-terrain"),
        ("horizons_sun_test", raw / "horizons_sun_test.txt", "raw-ephemeris"),
        ("horizons_earth_test", raw / "horizons_earth_test.txt", "raw-ephemeris"),
    ]:
        assets.append({
            "id": name,
            "kind": kind,
            "path": str(p),
            "exists": p.exists(),
            "size_bytes": p.stat().st_size if p.exists() else 0,
        })
    return {
        "source": "Karanna data folders",
        "raw_data_dir": str(raw),
        "processed_data_dir": str(proc),
        "assets": assets,
    }
