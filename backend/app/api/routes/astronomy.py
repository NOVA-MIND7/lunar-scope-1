"""Astronomy endpoints. Contracts are defined; calculations arrive with the Skyfield/SPICE phase."""
from fastapi import APIRouter

from app.core.errors import NotImplementedPhaseError
from app.schemas.astronomy import (
    EarthVisibilityRequest,
    EarthVisibilityResponse,
    PositionsRequest,
    PositionsResponse,
    SunlightRequest,
    SunlightResponse,
)

router = APIRouter(prefix="/astronomy", tags=["astronomy"])
_NOT_IMPL = {501: {"description": "Not implemented yet"}}


@router.post("/positions", response_model=PositionsResponse, responses=_NOT_IMPL,
             summary="Sun/Earth azimuth and elevation at a lunar site (not implemented)")
def positions(_: PositionsRequest) -> PositionsResponse:
    raise NotImplementedPhaseError("Astronomical positions")


@router.post("/sunlight", response_model=SunlightResponse, responses=_NOT_IMPL,
             summary="Sunlit/shadowed intervals at a lunar site (not implemented)")
def sunlight(_: SunlightRequest) -> SunlightResponse:
    raise NotImplementedPhaseError("Sunlight analysis")


@router.post("/earth-visibility", response_model=EarthVisibilityResponse, responses=_NOT_IMPL,
             summary="Earth visibility intervals at a lunar site (not implemented)")
def earth_visibility(_: EarthVisibilityRequest) -> EarthVisibilityResponse:
    raise NotImplementedPhaseError("Earth visibility analysis")
