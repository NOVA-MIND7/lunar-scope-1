from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Service health check")
def health() -> HealthResponse:
    settings = get_settings()
    # Database integration is optional in this phase; a configured URL is reported as
    # "unreachable" until a real connectivity check is implemented, never as a false "connected".
    database = "unreachable" if settings.database_enabled else "disabled"
    return HealthResponse(
        service=settings.app_name,
        version=settings.app_version,
        time_utc=datetime.now(timezone.utc),
        database=database,
    )
