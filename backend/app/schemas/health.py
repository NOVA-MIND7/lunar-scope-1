from datetime import datetime
from typing import Literal

from .common import ApiModel


class HealthResponse(ApiModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    time_utc: datetime
    database: Literal["disabled", "connected", "unreachable"]
