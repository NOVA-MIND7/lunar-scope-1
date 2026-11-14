from pydantic import Field

from .common import ApiModel, LunarCoordinates


class HorizonRequest(ApiModel):
    observer: LunarCoordinates
    observer_height_m: float = Field(default=2.0, ge=0, le=1000)
    azimuth_step_deg: float = Field(default=1.0, gt=0, le=45)
    max_distance_km: float = Field(default=50.0, gt=0, le=500)
    dem_source: str = Field(default="unspecified", description="Identifier of the elevation dataset to use.")


class HorizonPoint(ApiModel):
    azimuth_deg: float = Field(ge=0, lt=360)
    elevation_deg: float


class HorizonResponse(ApiModel):
    method: str
    dem_source: str
    profile: list[HorizonPoint]
