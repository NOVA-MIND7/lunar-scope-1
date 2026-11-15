import csv
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode

base = Path.home() / "LunarNavigator_Data"
terrain = base / "processed/south_pole_terrain.csv"

# Read one terrain point
with terrain.open(newline="") as f:
    reader = csv.DictReader(f)
    point = next(reader)

lat = float(point["latitude"])
lon = float(point["longitude"])
height_km = float(point["elevation_m"]) / 1000

# Horizons uses positive east longitude for the Moon
east_lon = lon if lon >= 0 else lon + 360

site = f"{east_lon},{lat},{height_km}"

params = {
    "format": "text",
    "COMMAND": "'10'",
    "OBJ_DATA": "'NO'",
    "MAKE_EPHEM": "'YES'",
    "EPHEM_TYPE": "'OBSERVER'",
    "CENTER": "'coord@301'",
    "COORD_TYPE": "'GEODETIC'",
    "SITE_COORD": f"'{site}'",
    "START_TIME": "'2026-11-14'",
    "STOP_TIME": "'2026-11-15'",
    "STEP_SIZE": "'1 h'",
    "QUANTITIES": "'4'",
    "CSV_FORMAT": "'YES'",
    "TIME_TYPE": "'UT'",
    "ANG_FORMAT": "'DEG'"
}

url = "https://ssd.jpl.nasa.gov/api/horizons.api?"
request_url = url + urlencode(params)

print("Requesting JPL Horizons data...")
print("Test location:", site)

with urlopen(request_url, timeout=60) as response:
    result = response.read().decode("utf-8")

output = base / "raw"
output.mkdir(parents=True, exist_ok=True)

file = output / "horizons_sun_test.txt"
file.write_text(result, encoding="utf-8")

print("\nSaved:", file)
print("\nRESULT PREVIEW:\n")
print("\n".join(result.splitlines()[:40]))
