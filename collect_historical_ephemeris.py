import csv
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

BASE = Path.home() / "LunarNavigator_Data"
OUTPUT = BASE / "processed"
OUTPUT.mkdir(parents=True, exist_ok=True)

LAT = -89.22993678059875
LON = 329.0194115707864
HEIGHT_KM = -1.3455

TARGETS = {
    "sun": "10",
    "earth": "399"
}

def collect(target_name, target_id):

    observations = {}

    for year in range(2000, 2031):

        start = f"{year}-01-01"
        stop = f"{year + 1}-01-01"

        params = {
            "format": "text",
            "COMMAND": f"'{target_id}'",
            "OBJ_DATA": "'NO'",
            "MAKE_EPHEM": "'YES'",
            "EPHEM_TYPE": "'OBSERVER'",
            "CENTER": "'coord@301'",
            "COORD_TYPE": "'GEODETIC'",
            "SITE_COORD": f"'{LON},{LAT},{HEIGHT_KM}'",
            "START_TIME": f"'{start}'",
            "STOP_TIME": f"'{stop}'",
            "STEP_SIZE": "'6 h'",
            "QUANTITIES": "'4'",
            "CSV_FORMAT": "'YES'",
            "TIME_TYPE": "'UT'",
            "ANG_FORMAT": "'DEG'"
        }

        url = (
            "https://ssd.jpl.nasa.gov/api/horizons.api?"
            + urlencode(params)
        )

        print(f"{target_name.upper()}: collecting {year}...")

        for attempt in range(3):
            try:
                with urlopen(url, timeout=120) as response:
                    result = response.read().decode("utf-8")
                break
            except Exception as error:
                if attempt == 2:
                    raise RuntimeError(
                        f"Failed for {target_name}, {year}: {error}"
                    )
                print("Retrying...")
                time.sleep(3)

        if "$$SOE" not in result or "$$EOE" not in result:
            raise RuntimeError(
                f"Horizons returned an invalid response for "
                f"{target_name}, {year}:\n{result[-1500:]}"
            )

        inside = False

        for line in result.splitlines():

            line = line.strip()

            if line == "$$SOE":
                inside = True
                continue

            if line == "$$EOE":
                break

            if inside and line:
                parts = [x.strip() for x in line.split(",")]

                if len(parts) >= 5:
                    try:
                        observations[parts[0]] = [
                            parts[0],
                            float(parts[3]),
                            float(parts[4]),
                            parts[1]
                        ]
                    except ValueError:
                        continue

        print(
            f"  Total unique observations: "
            f"{len(observations)}"
        )

        time.sleep(0.5)

    output_file = OUTPUT / f"{target_name}_ephemeris_2000_2030.csv"

    with output_file.open("w", newline="") as f:
        writer = csv.writer(f)

        writer.writerow([
            "date_time_utc",
            f"{target_name}_azimuth_deg",
            f"{target_name}_elevation_deg",
            "horizons_marker"
        ])

        for timestamp in sorted(observations):
            writer.writerow(observations[timestamp])

    print(f"\nSaved: {output_file}")
    print(f"Final records: {len(observations)}")


for name, target_id in TARGETS.items():
    collect(name, target_id)

print("\nHISTORICAL EPHEMERIS COLLECTION COMPLETED!")
