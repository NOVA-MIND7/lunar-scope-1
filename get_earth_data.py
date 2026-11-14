from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode

base = Path.home() / "LunarNavigator_Data"

# Same test location as the Sun request
lat = -89.22993678059875
lon = 329.0194115707864
height_km = -1.3455

site = f"{lon},{lat},{height_km}"

params = {
    "format": "text",
    "COMMAND": "'399'",
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

print("Requesting Earth position from JPL Horizons...")

with urlopen(request_url, timeout=60) as response:
    result = response.read().decode("utf-8")

output = base / "raw"
output.mkdir(parents=True, exist_ok=True)

file = output / "horizons_earth_test.txt"
file.write_text(result, encoding="utf-8")

print("Saved:", file)
print("\nRESULT PREVIEW:\n")
print("\n".join(result.splitlines()[:40]))
