from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def _require_utc(value: datetime) -> datetime:
    """Scientific calculations are UTC-only: reject naive or non-UTC timestamps."""
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("timestamp must include a timezone; use UTC (e.g. 2027-01-01T00:00:00Z)")
    if value.utcoffset().total_seconds() != 0:  # type: ignore[union-attr]
        raise ValueError("timestamp must be in UTC (offset +00:00 / 'Z')")
    return value.astimezone(timezone.utc)


UTCDateTime = Annotated[datetime, AfterValidator(_require_utc)]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LunarCoordinates(ApiModel):
    """Selenographic coordinates in degrees (planetocentric, east-positive longitude)."""

    latitude_deg: float = Field(ge=-90, le=90)
    longitude_deg: float = Field(ge=-180, le=180)


class TimeRange(ApiModel):
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    step_seconds: int = Field(default=3600, ge=1, le=86_400 * 30)
