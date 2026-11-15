from pydantic import Field, model_validator

from .common import ApiModel, LunarCoordinates, UTCDateTime


class MissionScenario(ApiModel):
    id: str
    label: str
    site_id: str | None = None
    coordinates: LunarCoordinates
    landing_time_utc: UTCDateTime
    mission_duration_days: float = Field(gt=0, le=3650)


class CompareRequest(ApiModel):
    scenarios: list[MissionScenario] = Field(min_length=2, max_length=8)


class ScenarioMetrics(ApiModel):
    scenario_id: str
    sunlit_fraction: float = Field(ge=0, le=1)
    earth_visible_fraction: float = Field(ge=0, le=1)
    longest_darkness_hours: float = Field(ge=0)


class CompareResponse(ApiModel):
    method: str
    results: list[ScenarioMetrics]


class MissionConstraints(ApiModel):
    min_sunlit_fraction: float = Field(default=0.0, ge=0, le=1)
    min_earth_visible_fraction: float = Field(default=0.0, ge=0, le=1)
    max_darkness_hours: float | None = Field(default=None, gt=0)


class WindowsRequest(ApiModel):
    site_id: str
    search_start_utc: UTCDateTime
    search_end_utc: UTCDateTime
    mission_duration_days: float = Field(gt=0, le=3650)
    constraints: MissionConstraints = Field(default_factory=MissionConstraints)

    @model_validator(mode="after")
    def _ordered(self) -> "WindowsRequest":
        if self.search_end_utc <= self.search_start_utc:
            raise ValueError("search_end_utc must be after search_start_utc")
        return self


class LandingWindow(ApiModel):
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    sunlit_fraction: float = Field(ge=0, le=1)
    earth_visible_fraction: float = Field(ge=0, le=1)


class WindowsResponse(ApiModel):
    method: str
    windows: list[LandingWindow]


class TimelinePhase(ApiModel):
    name: str
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    description: str


class TimelineInterval(ApiModel):
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    state: str  # "sunlit", "shadowed", "visible", "occluded"


class TimelineTrack(ApiModel):
    label: str
    kind: str  # "sunlight", "earth-visibility"
    fraction: float = Field(ge=0, le=1)
    intervals: list[TimelineInterval]


class TimelineRequest(ApiModel):
    site_id: str
    landing_time_utc: UTCDateTime
    mission_duration_days: float = Field(gt=0, le=3650)


class TimelineResponse(ApiModel):
    method: str
    site_id: str
    site_name: str
    coordinates: LunarCoordinates
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    duration_days: float
    sunlit_fraction: float = Field(ge=0, le=1)
    earth_visible_fraction: float = Field(ge=0, le=1)
    longest_darkness_hours: float = Field(ge=0)
    sunlight_track: TimelineTrack
    earth_track: TimelineTrack
    phases: list[TimelinePhase]

