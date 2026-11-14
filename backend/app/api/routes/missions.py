from fastapi import APIRouter, HTTPException

from app.core.errors import NotImplementedPhaseError
from app.schemas.missions import (
    CompareRequest,
    CompareResponse,
    RecommendRequest,
    RecommendResponse,
    TimelineRequest,
    TimelineResponse,
    WindowsRequest,
    WindowsResponse,
)
from app.services.sites import get_site
from app.services.timeline import find_landing_windows, generate_mission_timeline

router = APIRouter(prefix="/missions", tags=["missions"])
_NOT_IMPL = {501: {"description": "Not implemented yet"}}


@router.post("/compare", response_model=CompareResponse, responses=_NOT_IMPL,
             summary="Compare mission scenarios (not implemented)")
def compare(_: CompareRequest) -> CompareResponse:
    raise NotImplementedPhaseError("Scenario comparison")


@router.post("/recommend", response_model=RecommendResponse, responses=_NOT_IMPL,
             summary="Recommend sites and landing times (not implemented)")
def recommend(_: RecommendRequest) -> RecommendResponse:
    raise NotImplementedPhaseError("Mission recommendations")


@router.post("/windows", response_model=WindowsResponse,
             summary="Find landing windows for a site")
def windows(req: WindowsRequest) -> WindowsResponse:
    site = get_site(req.site_id)
    if site is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "site_not_found", "message": f"No landing site with id '{req.site_id}'."},
        )
    return find_landing_windows(
        site=site,
        search_start_utc=req.search_start_utc,
        search_end_utc=req.search_end_utc,
        mission_duration_days=req.mission_duration_days,
        constraints=req.constraints,
    )


@router.post("/timeline", response_model=TimelineResponse,
             summary="Generate mission timeline tracks, intervals and phases")
def timeline(req: TimelineRequest) -> TimelineResponse:
    site = get_site(req.site_id)
    if site is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "site_not_found", "message": f"No landing site with id '{req.site_id}'."},
        )
    return generate_mission_timeline(
        site=site,
        landing_time_utc=req.landing_time_utc,
        duration_days=req.mission_duration_days,
    )
