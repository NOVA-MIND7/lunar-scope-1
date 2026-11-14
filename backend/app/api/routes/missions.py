from fastapi import APIRouter

from app.core.errors import NotImplementedPhaseError
from app.schemas.missions import (
    CompareRequest,
    CompareResponse,
    RecommendRequest,
    RecommendResponse,
    WindowsRequest,
    WindowsResponse,
)

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


@router.post("/windows", response_model=WindowsResponse, responses=_NOT_IMPL,
             summary="Find landing windows for a site (not implemented)")
def windows(_: WindowsRequest) -> WindowsResponse:
    raise NotImplementedPhaseError("Landing window search")
