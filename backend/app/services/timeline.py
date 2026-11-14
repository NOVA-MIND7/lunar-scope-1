"""Scientific Timeline and Landing Window Calculations for Lunar Missions.

Provides ephemeris-based analytical illumination, Earth visibility,
and landing window search algorithms for arbitrary lunar surface coordinates.
"""
from datetime import datetime, timedelta, timezone
import math
from typing import Tuple, List

from app.schemas.common import LunarCoordinates
from app.schemas.missions import (
    LandingWindow,
    MissionConstraints,
    TimelineInterval,
    TimelinePhase,
    TimelineResponse,
    TimelineTrack,
    WindowsResponse,
)
from app.schemas.sites import LandingSite

J2000_TIMESTAMP = 946728000.0  # 2000-01-01 12:00:00 UTC
LUNAR_SYNODIC_MONTH = 29.530588853  # Earth days (New Moon to New Moon)
LUNAR_SIDEREAL_MONTH = 27.321661  # Earth days (Orbital period)
LUNAR_OBLIQUITY_DEG = 1.5424  # Moon axial tilt to ecliptic
SUN_ANGULAR_RADIUS_DEG = 0.26  # Semi-diameter of Sun disk from Moon


def calculate_solar_elevation(lat_deg: float, lon_deg: float, dt: datetime) -> float:
    """Calculate solar elevation angle (degrees above horizon) at a selenographic location."""
    t_sec = dt.timestamp()
    days = (t_sec - J2000_TIMESTAMP) / 86400.0

    # Solar declination on the Moon varies with the Earth-Moon orbit around Sun (365.25 days)
    # Obliquity to ecliptic is ~1.54 degrees
    sun_declination = LUNAR_OBLIQUITY_DEG * math.sin(2.0 * math.pi * (days - 80.0) / 365.25)

    # Subsolar longitude advances westward across lunar longitudes by ~360 deg per synodic month
    subsolar_lon = (218.316 - 360.0 * (days / LUNAR_SYNODIC_MONTH)) % 360.0

    phi = math.radians(lat_deg)
    delta = math.radians(sun_declination)
    h_angle = math.radians(lon_deg - subsolar_lon)

    sin_elev = math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.cos(h_angle)
    sin_elev = max(-1.0, min(1.0, sin_elev))
    return math.degrees(math.asin(sin_elev))


def calculate_earth_elevation(lat_deg: float, lon_deg: float, dt: datetime) -> float:
    """Calculate Earth center elevation angle (degrees above horizon) at a selenographic location."""
    t_sec = dt.timestamp()
    days = (t_sec - J2000_TIMESTAMP) / 86400.0

    # Optical & physical librations oscillate sub-Earth point within ~[-6.7, +6.7] lat, ~[-7.9, +7.9] lon
    lib_lat = 6.68 * math.sin(2.0 * math.pi * days / LUNAR_SIDEREAL_MONTH)
    lib_lon = 7.91 * math.sin(2.0 * math.pi * (days - 5.0) / LUNAR_SIDEREAL_MONTH)

    phi = math.radians(lat_deg)
    delta_e = math.radians(lib_lat)
    h_earth = math.radians(lon_deg - lib_lon)

    cos_z = math.sin(phi) * math.sin(delta_e) + math.cos(phi) * math.cos(delta_e) * math.cos(h_earth)
    cos_z = max(-1.0, min(1.0, cos_z))
    return math.degrees(math.asin(cos_z))


def _sample_elevations(
    lat_deg: float, lon_deg: float, start_dt: datetime, end_dt: datetime, step_hours: float = 1.0
) -> List[Tuple[datetime, float, float]]:
    """Sample solar and Earth elevations at regular time intervals."""
    samples = []
    current = start_dt
    step = timedelta(hours=step_hours)
    while current <= end_dt:
        sun_elev = calculate_solar_elevation(lat_deg, lon_deg, current)
        earth_elev = calculate_earth_elevation(lat_deg, lon_deg, current)
        samples.append((current, sun_elev, earth_elev))
        current += step
    return samples


def _build_intervals(
    samples: List[Tuple[datetime, float, float]], kind: str
) -> Tuple[List[TimelineInterval], float, float]:
    """Condense elevation samples into contiguous intervals, total fraction, and max darkness."""
    if not samples:
        return [], 0.0, 0.0

    intervals: List[TimelineInterval] = []
    total_seconds = (samples[-1][0] - samples[0][0]).total_seconds()
    if total_seconds <= 0:
        total_seconds = 1.0

    active_seconds = 0.0
    longest_darkness_sec = 0.0
    current_darkness_sec = 0.0

    current_state = None
    interval_start = samples[0][0]

    for i in range(len(samples)):
        dt, sun_elev, earth_elev = samples[i]

        if kind == "sunlight":
            # Sun upper limb above horizon counts as sunlit
            state = "sunlit" if sun_elev > -SUN_ANGULAR_RADIUS_DEG else "shadowed"
        else:
            state = "visible" if earth_elev > 0.0 else "occluded"

        if current_state is None:
            current_state = state
            interval_start = dt
        elif state != current_state or i == len(samples) - 1:
            end_time = dt
            span = (end_time - interval_start).total_seconds()
            if current_state in ("sunlit", "visible"):
                active_seconds += span
            elif current_state == "shadowed":
                current_darkness_sec += span
                if current_darkness_sec > longest_darkness_sec:
                    longest_darkness_sec = current_darkness_sec
            if current_state != "shadowed":
                current_darkness_sec = 0.0

            intervals.append(
                TimelineInterval(
                    start_utc=interval_start,
                    end_utc=end_time,
                    state=current_state,
                )
            )
            current_state = state
            interval_start = dt

    fraction = min(1.0, max(0.0, active_seconds / total_seconds))
    longest_darkness_hours = longest_darkness_sec / 3600.0
    return intervals, fraction, longest_darkness_hours


def generate_mission_timeline(
    site: LandingSite, landing_time_utc: datetime, duration_days: float
) -> TimelineResponse:
    """Generate complete mission timeline tracks, fractions, and mission operational phases."""
    end_time_utc = landing_time_utc + timedelta(days=duration_days)

    lat = site.coordinates.latitude_deg
    lon = site.coordinates.longitude_deg

    # Sample at 1-hour resolution across mission
    step_hours = 1.0 if duration_days <= 30 else 3.0
    samples = _sample_elevations(lat, lon, landing_time_utc, end_time_utc, step_hours=step_hours)

    sun_intervals, sun_fraction, max_dark_hours = _build_intervals(samples, "sunlight")
    earth_intervals, earth_fraction, _ = _build_intervals(samples, "earth-visibility")

    # Generate standard operational mission phases mapped across the timeline
    total_hours = duration_days * 24.0
    phases = [
        TimelinePhase(
            name="Landing & Touchdown",
            start_utc=landing_time_utc,
            end_utc=landing_time_utc + timedelta(hours=min(4.0, total_hours * 0.05)),
            description="Terminal descent, precision landing, hazard avoidance, and initial spacecraft safing.",
        ),
        TimelinePhase(
            name="Surface Deployment & Solar Power Startup",
            start_utc=landing_time_utc + timedelta(hours=min(4.0, total_hours * 0.05)),
            end_utc=landing_time_utc + timedelta(hours=min(24.0, total_hours * 0.15)),
            description="Deployment of solar arrays, communication antenna alignment with Earth, and instrument checkout.",
        ),
        TimelinePhase(
            name="Primary Science & Surface Operations",
            start_utc=landing_time_utc + timedelta(hours=min(24.0, total_hours * 0.15)),
            end_utc=landing_time_utc + timedelta(hours=total_hours * 0.75),
            description="Core scientific investigations, regolith sampling, spectral imaging, and continuous telemetry relay.",
        ),
        TimelinePhase(
            name="Extended Operations & Mission Completion",
            start_utc=landing_time_utc + timedelta(hours=total_hours * 0.75),
            end_utc=end_time_utc,
            description="Secondary exploration, long-term environmental recording, and mission data transmission finale.",
        ),
    ]

    return TimelineResponse(
        method="analytical-ephemeris-v1",
        site_id=site.id,
        site_name=site.name,
        coordinates=site.coordinates,
        start_utc=landing_time_utc,
        end_utc=end_time_utc,
        duration_days=duration_days,
        sunlit_fraction=round(sun_fraction, 4),
        earth_visible_fraction=round(earth_fraction, 4),
        longest_darkness_hours=round(max_dark_hours, 2),
        sunlight_track=TimelineTrack(
            label="Sunlight",
            kind="sunlight",
            fraction=round(sun_fraction, 4),
            intervals=sun_intervals,
        ),
        earth_track=TimelineTrack(
            label="Earth visibility",
            kind="earth-visibility",
            fraction=round(earth_fraction, 4),
            intervals=earth_intervals,
        ),
        phases=phases,
    )


def find_landing_windows(
    site: LandingSite,
    search_start_utc: datetime,
    search_end_utc: datetime,
    mission_duration_days: float,
    constraints: MissionConstraints,
) -> WindowsResponse:
    """Search for optimal landing windows meeting illumination and visibility constraints."""
    lat = site.coordinates.latitude_deg
    lon = site.coordinates.longitude_deg

    total_search_hours = (search_end_utc - search_start_utc).total_seconds() / 3600.0
    mission_hours = mission_duration_days * 24.0

    if total_search_hours < mission_hours:
        # Search range is shorter than mission duration: analyze the single start
        samples = _sample_elevations(lat, lon, search_start_utc, search_start_utc + timedelta(days=mission_duration_days))
        _, sun_frac, _ = _build_intervals(samples, "sunlight")
        _, earth_frac, _ = _build_intervals(samples, "earth-visibility")
        return WindowsResponse(
            method="analytical-ephemeris-v1",
            windows=[
                LandingWindow(
                    start_utc=search_start_utc,
                    end_utc=search_start_utc + timedelta(days=mission_duration_days),
                    sunlit_fraction=round(sun_frac, 4),
                    earth_visible_fraction=round(earth_frac, 4),
                )
            ],
        )

    # Step across candidate landing start times
    step_hours = 12.0 if total_search_hours > 720 else 6.0
    curr_start = search_start_utc
    max_start = search_end_utc - timedelta(days=mission_duration_days)

    candidate_windows: List[LandingWindow] = []

    while curr_start <= max_start:
        curr_end = curr_start + timedelta(days=mission_duration_days)
        samples = _sample_elevations(lat, lon, curr_start, curr_end, step_hours=2.0)
        _, sun_frac, max_dark_hours = _build_intervals(samples, "sunlight")
        _, earth_frac, _ = _build_intervals(samples, "earth-visibility")

        # Evaluate constraints
        if sun_frac >= constraints.min_sunlit_fraction and earth_frac >= constraints.min_earth_visible_fraction:
            if constraints.max_darkness_hours is None or max_dark_hours <= constraints.max_darkness_hours:
                candidate_windows.append(
                    LandingWindow(
                        start_utc=curr_start,
                        end_utc=curr_end,
                        sunlit_fraction=round(sun_frac, 4),
                        earth_visible_fraction=round(earth_frac, 4),
                    )
                )

        curr_start += timedelta(hours=step_hours)

    # If no window strictly satisfies constraints, provide top scoring windows
    if not candidate_windows:
        curr_start = search_start_utc
        scored = []
        while curr_start <= max_start:
            curr_end = curr_start + timedelta(days=mission_duration_days)
            samples = _sample_elevations(lat, lon, curr_start, curr_end, step_hours=4.0)
            _, sun_frac, _ = _build_intervals(samples, "sunlight")
            _, earth_frac, _ = _build_intervals(samples, "earth-visibility")
            score = sun_frac * 0.7 + earth_frac * 0.3
            scored.append((score, curr_start, curr_end, sun_frac, earth_frac))
            curr_start += timedelta(hours=step_hours * 2)

        scored.sort(key=lambda x: x[0], reverse=True)
        for _, s_time, e_time, sf, ef in scored[:3]:
            candidate_windows.append(
                LandingWindow(
                    start_utc=s_time,
                    end_utc=e_time,
                    sunlit_fraction=round(sf, 4),
                    earth_visible_fraction=round(ef, 4),
                )
            )

    return WindowsResponse(
        method="analytical-ephemeris-v1",
        windows=candidate_windows,
    )
