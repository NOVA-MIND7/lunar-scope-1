# Lunar Landing Site Navigator – Ephemeris Data Collection

## Overview

This folder contains Python scripts used to collect celestial ephemeris data for the **Lunar Landing Site Navigator** project, developed for the NASA Space Apps Challenge 2026.

The project uses astronomical position data to investigate the relationship between a potential lunar landing site, the Sun, and Earth.

The collected data supports calculations and analysis related to:

- Solar elevation and sunlight availability.
- Earth's apparent position from a lunar landing location.
- Potential direct communication visibility windows.
- Time-dependent lunar mission planning.

## Data Source

The celestial ephemeris data is collected using the **NASA Jet Propulsion Laboratory (JPL) Horizons System**.

- Official website: https://ssd.jpl.nasa.gov/horizons/
- API endpoint: https://ssd.jpl.nasa.gov/api/horizons.api

JPL Horizons provides computed astronomical ephemerides, including apparent positions of solar-system objects for specified observer locations and times.

**Important:** These are computed ephemeris values, not necessarily historical spacecraft observations.

## Python Scripts

| Script | Description |
|---|---|
| `get_sun_data.py` | Requests a test observation of the Sun from JPL Horizons using a lunar South Pole terrain location. |
| `get_earth_data.py` | Requests a test observation of Earth from JPL Horizons using specified lunar coordinates. |
| `collect_historical_ephemeris.py` | Collects Sun and Earth ephemeris data for the 2000–2030 period and exports CSV files. |

## Generated Datasets

The ephemeris collection script generates:

### 1. `sun_ephemeris_2000_2030.csv`

Contains the Sun's apparent position as observed from the selected lunar location.

Columns:

- `date_time_utc` – Date and time of the observation.
- `sun_azimuth_deg` – Sun's azimuth angle in degrees.
- `sun_elevation_deg` – Sun's elevation angle in degrees.
- `horizons_marker` – Additional field retained from the Horizons response.

**Application:** Used to estimate solar elevation and potential sunlight availability at the selected landing location.

### 2. `earth_ephemeris_2000_2030.csv`

Contains Earth's apparent position as observed from the selected lunar location.

Columns:

- `date_time_utc` – Date and time of the observation.
- `earth_azimuth_deg` – Earth's azimuth angle in degrees.
- `earth_elevation_deg` – Earth's elevation angle in degrees.
- `horizons_marker` – Additional field retained from the Horizons response.

**Application:** Used to investigate Earth's visibility and potential direct communication opportunities.

### 3. `lunar_environment_ephemeris_2000_2030.csv`

This is an additional lunar environment dataset used by the project.

Its exact generation method and column definitions should be documented alongside the script or processing workflow that produces it.

## Collection Configuration

The historical ephemeris collection script uses the following parameters:

| Parameter | Configuration |
|---|---|
| Data source | NASA JPL Horizons API |
| Start date | 2000-01-01 |
| End date | 2031-01-01 (exclusive) |
| Sampling interval | 6 hours |
| Reference centre | `coord@301` (Moon-centred coordinate reference) |
| Coordinate type | Geodetic |
| Time standard | UT |
| Horizons quantity | 4 (apparent azimuth and elevation) |
| Output format | CSV |

### Observer Location

The collection script uses a fixed lunar South Pole test location:

- Latitude: `-89.22993678059875°`
- Longitude: `329.0194115707864°`
- Height: `-1.3455 km`

These coordinates are used as the observer location for the generated Sun and Earth ephemeris datasets.

**Note:** The current ephemeris datasets represent this specific observer location. They should not be treated as universal ephemeris datasets for every lunar landing location.

## Running the Scripts

### Requirements

- Python 3
- Internet connection
- Access to the NASA JPL Horizons API

The scripts use Python standard-library modules, so no additional third-party packages are required for these collection scripts.

### Collect Sun and Earth Ephemeris Data

From the project root directory:

```bash
python3 Data/collect_historical_ephemeris.py
```

The script:

1. Sends requests to the NASA JPL Horizons API.
2. Collects Sun and Earth apparent-position data year by year.
3. Uses a six-hour sampling interval.
4. Extracts the requested angular measurements.
5. Exports the resulting datasets as CSV files.

The output files are saved in the `processed/` directory.

### Run Individual Test Requests

```bash
python3 Data/get_sun_data.py
```

```bash
python3 Data/get_earth_data.py
```

These scripts perform individual test requests and save the raw Horizons responses in the `raw/` directory.

## Application in the Lunar Landing Site Navigator

The collected ephemeris data is intended to support the following scientific calculations:

**Sunlight Analysis**

Solar elevation can be used to estimate whether the Sun is geometrically above the local horizon.

**Earth Visibility Analysis**

Earth elevation can help identify periods when Earth may be visible from the landing location.

**Mission Scenario Comparison**

Different landing dates and times can be compared using their calculated sunlight conditions and Earth visibility windows.

**Important scientific limitation:** Geometric visibility does not guarantee a functioning communication link. Actual communication also depends on terrain obstruction, antenna orientation, radio frequency, power, and link budget.

## References

1. NASA JPL Horizons System – https://ssd.jpl.nasa.gov/horizons/
2. NASA Moon Trek – https://trek.nasa.gov/moon/
3. NASA Space Apps Challenge 2026 – https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/

