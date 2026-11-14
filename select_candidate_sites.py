import pandas as pd
import numpy as np
from pathlib import Path

BASE = Path.home() / "LunarNavigator_Data"
INPUT = BASE / "processed/south_pole_terrain.csv"
OUTPUT = BASE / "processed/candidate_landing_sites.csv"

# Load terrain
df = pd.read_csv(INPUT)

required = ["latitude", "longitude", "elevation_m", "slope_deg"]

if not all(col in df.columns for col in required):
    raise ValueError(f"Unexpected columns: {df.columns.tolist()}")

# Keep valid, relatively flat terrain
df = df.dropna(subset=required)
df = df[df["slope_deg"] <= 5].copy()

print("Terrain points with slope <= 5 degrees:", len(df))

# Prioritize flatter terrain
df = df.sort_values("slope_deg")

# Great-circle distance in kilometres
def distance_km(lat1, lon1, lat2, lon2):
    r = 1737.4

    lat1, lon1, lat2, lon2 = map(
        np.radians, [lat1, lon1, lat2, lon2]
    )

    a = (
        np.sin((lat2-lat1)/2)**2
        + np.cos(lat1)*np.cos(lat2)
        * np.sin((lon2-lon1)/2)**2
    )

    return 2*r*np.arcsin(np.sqrt(np.clip(a, 0, 1)))

# Select geographically separated candidates
selected = []
minimum_distance = 5.0

for _, point in df.iterrows():

    if not selected:
        selected.append(point)
    else:
        far_enough = all(
            distance_km(
                point["latitude"],
                point["longitude"],
                site["latitude"],
                site["longitude"]
            ) >= minimum_distance
            for site in selected
        )

        if far_enough:
            selected.append(point)

    if len(selected) == 5:
        break

if len(selected) < 5:
    print("Warning: Only found", len(selected), "separated candidates.")

result = pd.DataFrame(selected)[required].reset_index(drop=True)
result.insert(0, "site_id", [f"S{i}" for i in range(1, len(result)+1)])

result.to_csv(OUTPUT, index=False)

print("\nCANDIDATE LANDING SITES")
print(result.to_string(index=False))
print("\nSaved:", OUTPUT)
