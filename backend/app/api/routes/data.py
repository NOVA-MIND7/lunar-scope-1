from datetime import datetime
from fastapi import APIRouter, Query

from app.services import karanna_data

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/assets", summary="List available Karanna data assets")
def list_assets():
    return karanna_data.list_data_assets()


@router.get("/ephemeris/sun", summary="Sun ephemeris from processes data")
def sun_ephemeris(
    start_utc: datetime | None = Query(default=None),
    end_utc: datetime | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    step: int = Query(default=1, ge=1, le=1000),
):
    return karanna_data.get_sun_ephemeris(start_utc, end_utc, limit, step)


@router.get("/ephemeris/earth", summary="Earth ephemeris from processes data")
def earth_ephemeris(
    start_utc: datetime | None = Query(default=None),
    end_utc: datetime | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    step: int = Query(default=1, ge=1, le=1000),
):
    return karanna_data.get_earth_ephemeris(start_utc, end_utc, limit, step)


@router.get("/ephemeris/environment", summary="Combined lunar environment ephemeris from processes data")
def lunar_environment(
    start_utc: datetime | None = Query(default=None),
    end_utc: datetime | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
    step: int = Query(default=1, ge=1, le=1000),
):
    return karanna_data.get_lunar_environment(start_utc, end_utc, limit, step)


@router.get("/terrain/south-pole", summary="South pole terrain samples from raw data")
def south_pole_terrain(limit: int = Query(default=2000, ge=1, le=20000)):
    return karanna_data.get_south_pole_terrain(limit)
