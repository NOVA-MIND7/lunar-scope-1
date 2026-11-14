from fastapi import APIRouter, HTTPException

from app.schemas.sites import LandingSite, SiteListResponse
from app.services import sites as site_service

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=SiteListResponse, summary="List landing sites (sample metadata)")
def list_sites() -> SiteListResponse:
    items = site_service.list_sites()
    return SiteListResponse(disclaimer=site_service.SAMPLE_DISCLAIMER, count=len(items), sites=items)


@router.get("/{site_id}", response_model=LandingSite, summary="Get one landing site")
def get_site(site_id: str) -> LandingSite:
    site = site_service.get_site(site_id)
    if site is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "site_not_found", "message": f"No landing site with id '{site_id}'."},
        )
    return site
