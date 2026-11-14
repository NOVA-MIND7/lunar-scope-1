"""Physical and Gravitational Calculations for Earth and Moon.

Implements the standard celestial mechanics formulas:
  1. Gravitational acceleration: g = GM / r^2
  2. Circular orbital velocity:  v = sqrt(GM / r)
  3. Escape velocity:            v_esc = sqrt(2GM / r)
  4. Weight:                     W = m * g
"""
import math
from typing import Dict, Any

# Universal Gravitational Constant (m^3 kg^-1 s^-2)
G_CONSTANT = 6.67430e-11

# Earth Physical Constants
EARTH_MASS_KG = 5.97217e24
EARTH_RADIUS_M = 6371000.0  # Mean radius: 6,371 km
EARTH_SURFACE_GRAVITY = 9.81  # m/s^2
EARTH_ESCAPE_VELOCITY_KMS = 11.2  # km/s

# Moon Physical Constants
MOON_MASS_KG = 7.342e22
MOON_RADIUS_M = 1737400.0  # Mean radius: 1,737.4 km
MOON_SURFACE_GRAVITY = 1.62  # m/s^2
MOON_ESCAPE_VELOCITY_KMS = 2.38  # km/s


def calculate_gravity(mass_kg: float, radius_m: float) -> float:
    """Calculate gravitational acceleration g = GM / r^2 in m/s^2."""
    if radius_m <= 0:
        raise ValueError("Radius must be greater than zero.")
    return (G_CONSTANT * mass_kg) / (radius_m ** 2)


def calculate_orbital_velocity(mass_kg: float, orbital_radius_m: float) -> float:
    """Calculate satellite circular orbital velocity v = sqrt(GM / r) in m/s."""
    if orbital_radius_m <= 0:
        raise ValueError("Orbital radius must be greater than zero.")
    return math.sqrt((G_CONSTANT * mass_kg) / orbital_radius_m)


def calculate_escape_velocity(mass_kg: float, radius_m: float) -> float:
    """Calculate escape velocity v_esc = sqrt(2GM / r) in m/s."""
    if radius_m <= 0:
        raise ValueError("Radius must be greater than zero.")
    return math.sqrt((2.0 * G_CONSTANT * mass_kg) / radius_m)


def calculate_weight(mass_kg: float, gravity_ms2: float) -> float:
    """Calculate weight in Newtons W = m * g."""
    return mass_kg * gravity_ms2


def get_earth_moon_comparison(test_mass_kg: float = 60.0) -> Dict[str, Any]:
    """Generate the standard comparative metrics table for Earth and Moon."""
    earth_g = EARTH_SURFACE_GRAVITY
    moon_g = MOON_SURFACE_GRAVITY

    rel_gravity_percent = round((moon_g / earth_g) * 100.0, 1)  # 16.5%

    earth_weight_n = round(calculate_weight(test_mass_kg, earth_g), 1)  # 588.6 N
    moon_weight_n = round(calculate_weight(test_mass_kg, moon_g), 1)  # 97.2 N

    return {
        "headers": {
            "earth_gravity": f"{earth_g:.2f}",
            "earth_gravity_unit": "m/s² gravitational acceleration",
            "moon_gravity": f"{moon_g:.2f}",
            "moon_gravity_unit": "m/s² gravitational acceleration",
        },
        "formulas": {
            "gravity": "g = GM / r²",
            "orbital_velocity": "v = sqrt(GM / r)",
            "escape_velocity": "v_esc = sqrt(2GM / r)",
            "weight": "W = m * g",
        },
        "comparison_table": [
            {
                "parameter": "Gravity",
                "earth": f"{earth_g:.2f} m/s²",
                "moon": f"{moon_g:.2f} m/s²",
            },
            {
                "parameter": "Relative gravity",
                "earth": "100%",
                "moon": f"{rel_gravity_percent}%",
            },
            {
                "parameter": f"Mass of a {int(test_mass_kg)} kg object",
                "earth": f"{int(test_mass_kg)} kg",
                "moon": f"{int(test_mass_kg)} kg",
            },
            {
                "parameter": "Weight of that object",
                "earth": f"{earth_weight_n:.1f} N",
                "moon": f"{moon_weight_n:.1f} N",
            },
            {
                "parameter": "Escape velocity",
                "earth": f"{EARTH_ESCAPE_VELOCITY_KMS:.1f} km/s",
                "moon": f"{MOON_ESCAPE_VELOCITY_KMS:.2f} km/s",
            },
        ],
        "constants": {
            "G": G_CONSTANT,
            "earth_mass_kg": EARTH_MASS_KG,
            "earth_radius_km": EARTH_RADIUS_M / 1000.0,
            "moon_mass_kg": MOON_MASS_KG,
            "moon_radius_km": MOON_RADIUS_M / 1000.0,
        },
    }
