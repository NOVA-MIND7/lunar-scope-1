from typing import Literal

from .common import ApiModel, LunarCoordinates

SiteRegion = Literal["south-pole", "north-pole", "near-side", "far-side", "equatorial"]

# historical        - past landing sites
# candidate-region  - regions studied as exploration/landing candidates (feature centres, not targets)
# clps              - NASA Commercial Lunar Payload Services mission target sites
# custom            - user-chosen points (frontend only; never returned by this API)
SiteCategory = Literal["historical", "candidate-region", "clps", "custom"]

# site        - published landing coordinates of a specific site
# approximate - approximate coordinates of a specific site
# regional    - approximate centre of a region/feature; NOT a landing coordinate
LocationPrecision = Literal["site", "approximate", "regional"]


class LandingSite(ApiModel):
    id: str
    name: str
    region: SiteRegion
    category: SiteCategory
    precision: LocationPrecision
    coordinates: LunarCoordinates
    provenance: Literal["sample", "published", "computed", "user"]
    description: str
    notes: str | None = None


class SiteListResponse(ApiModel):
    data_status: Literal["sample"] = "sample"
    disclaimer: str
    count: int
    sites: list[LandingSite]
