"""Request/response contracts for astronomy endpoints.

Response models describe the *future* shape of the data. Until the calculations are
implemented (Skyfield / SPICE phase), the endpoints answer HTTP 501 and return no results.
"""
from typing import Literal

from pydantic import Field

from .common import ApiModel, LunarCoordinates, TimeRange, UTCDateTime

Body = Literal["sun", "earth"]


class PositionsRequest(ApiModel):
    observer: LunarCoordinates
    time_range: TimeRange
    bodies: list[Body] = Field(default_factory=lambda: ["sun", "earth"], min_length=1)


class BodyPosition(ApiModel):
    time_utc: UTCDateTime
    body: Body
    azimuth_deg: float
    elevation_deg: float


class PositionsResponse(ApiModel):
    method: str
    ephemeris: str
    positions: list[BodyPosition]


class SunlightRequest(ApiModel):
    observer: LunarCoordinates
    time_range: TimeRange
    use_terrain_horizon: bool = False


class SunlightInterval(ApiModel):
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    state: Literal["sunlit", "shadowed"]


class SunlightResponse(ApiModel):
    method: str
    ephemeris: str
    intervals: list[SunlightInterval]
    illuminated_fraction: float = Field(ge=0, le=1)


class EarthVisibilityRequest(ApiModel):
    observer: LunarCoordinates
    time_range: TimeRange
    use_terrain_horizon: bool = False
    min_elevation_deg: float = Field(default=0.0, ge=-90, le=90)


class VisibilityInterval(ApiModel):
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    visible: bool


class EarthVisibilityResponse(ApiModel):
    method: str
    ephemeris: str
    intervals: list[VisibilityInterval]
    visible_fraction: float = Field(ge=0, le=1)
