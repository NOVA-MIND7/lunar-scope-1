from fastapi import APIRouter

from app.core.errors import NotImplementedPhaseError
from app.schemas.terrain import HorizonRequest, HorizonResponse

router = APIRouter(prefix="/terrain", tags=["terrain"])


@router.post("/horizon", response_model=HorizonResponse, responses={501: {"description": "Not implemented yet"}},
             summary="Terrain horizon profile at a lunar site (not implemented)")
def horizon(_: HorizonRequest) -> HorizonResponse:
    raise NotImplementedPhaseError("Terrain horizon analysis")
