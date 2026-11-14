from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Query
from pydantic import Field

from app.schemas.common import ApiModel, UTCDateTime
from app.calculations.physics import (
    calculate_gravity,
    calculate_orbital_velocity,
    calculate_escape_velocity,
    calculate_weight,
    get_earth_moon_comparison,
    G_CONSTANT,
    EARTH_MASS_KG,
    EARTH_RADIUS_M,
    MOON_MASS_KG,
    MOON_RADIUS_M,
)
from app.services.dsn import list_dsn_stations, get_active_tracking_station, DSNStation

router = APIRouter(tags=["physics-and-stations"])


class GravityCalcRequest(ApiModel):
    mass_kg: float = Field(gt=0, description="Mass of the central body in kg")
    radius_m: float = Field(gt=0, description="Radius in meters")
    object_mass_kg: float = Field(default=60.0, gt=0, description="Mass of test object in kg")


class GravityCalcResponse(ApiModel):
    formula: str
    gravity_ms2: float
    escape_velocity_kms: float
    object_mass_kg: float
    object_weight_n: float


class OrbitalVelocityRequest(ApiModel):
    body: str = Field(default="earth", description="'earth' or 'moon' or 'custom'")
    altitude_km: float = Field(ge=0, description="Altitude above surface in kilometers")
    custom_mass_kg: float | None = None
    custom_radius_km: float | None = None


class OrbitalVelocityResponse(ApiModel):
    formula: str
    body: str
    altitude_km: float
    total_orbital_radius_km: float
    orbital_velocity_kms: float
    orbital_velocity_ms: float
    orbital_period_minutes: float


@router.get("/physics/comparison", summary="Earth vs Moon gravity and physics comparison")
def physics_comparison(test_mass_kg: float = Query(default=60.0, gt=0)) -> Dict[str, Any]:
    """Return the physical and gravitational comparison between Earth and Moon."""
    return get_earth_moon_comparison(test_mass_kg)


@router.post("/physics/gravity", response_model=GravityCalcResponse, summary="Calculate gravity g = GM / r^2")
def compute_gravity(req: GravityCalcRequest) -> GravityCalcResponse:
    """Calculate gravitational acceleration and object weight."""
    g = calculate_gravity(req.mass_kg, req.radius_m)
    v_esc = calculate_escape_velocity(req.mass_kg, req.radius_m) / 1000.0
    w = calculate_weight(req.object_mass_kg, g)

    return GravityCalcResponse(
        formula="g = GM / r²",
        gravity_ms2=round(g, 3),
        escape_velocity_kms=round(v_esc, 2),
        object_mass_kg=req.object_mass_kg,
        object_weight_n=round(w, 2),
    )


@router.post("/physics/orbital-velocity", response_model=OrbitalVelocityResponse, summary="Calculate orbital velocity v = sqrt(GM / r)")
def compute_orbital_velocity(req: OrbitalVelocityRequest) -> OrbitalVelocityResponse:
    """Calculate satellite circular orbital velocity and period."""
    if req.body.lower() == "moon":
        mass = MOON_MASS_KG
        r_body_m = MOON_RADIUS_M
        body_name = "Moon"
    elif req.body.lower() == "earth":
        mass = EARTH_MASS_KG
        r_body_m = EARTH_RADIUS_M
        body_name = "Earth"
    else:
        mass = req.custom_mass_kg or EARTH_MASS_KG
        r_body_m = (req.custom_radius_km or 6371.0) * 1000.0
        body_name = "Custom Body"

    orbital_r_m = r_body_m + (req.altitude_km * 1000.0)
    v_ms = calculate_orbital_velocity(mass, orbital_r_m)
    v_kms = v_ms / 1000.0

    # Period T = 2 * pi * r / v (in seconds -> minutes)
    period_sec = (2.0 * 3.1415926535 * orbital_r_m) / v_ms
    period_min = period_sec / 60.0

    return OrbitalVelocityResponse(
        formula="v = sqrt(GM / r)",
        body=body_name,
        altitude_km=req.altitude_km,
        total_orbital_radius_km=round(orbital_r_m / 1000.0, 1),
        orbital_velocity_kms=round(v_kms, 3),
        orbital_velocity_ms=round(v_ms, 1),
        orbital_period_minutes=round(period_min, 1),
    )


@router.get("/stations/dsn", response_model=List[DSNStation], summary="List Deep Space Network stations")
def list_stations() -> List[DSNStation]:
    """Return all 3 NASA Deep Space Network complexes (Goldstone, Madrid, Canberra)."""
    return list_dsn_stations()


@router.get("/stations/dsn/tracking", summary="Get active DSN tracking station")
def tracking_status(time_utc: datetime | None = None) -> Dict[str, Any]:
    """Calculate active DSN tracking complex for the specified or current UTC time."""
    dt = time_utc or datetime.now(timezone.utc)
    return get_active_tracking_station(dt)
