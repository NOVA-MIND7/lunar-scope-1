"""lunar_link.py - Moon->Earth direct link model (approximate, no downloads needed).

Computes, for any time: Earth's direction as seen from the Moon (optical libration,
Meeus ch.47/53, main terms only) and Earth-Moon distance. The frontend/CLI then turns
that into Earth elevation at a site, visibility windows and one-way light-time delay.
Accuracy: ~0.1-0.3 deg in direction, a few ms in delay. Validate vs JPL Horizons
(target 301, center 500, QUANTITIES='14' = sub-observer lon/lat) before trusting.
"""
import math, json, sys
from datetime import datetime, timedelta, timezone

R_MOON, C_KMS, INCL = 1737.4, 299792.458, math.radians(1.54242)
J2000 = datetime(2000, 1, 1, 12, tzinfo=timezone.utc)
s, c, r = math.sin, math.cos, math.radians

def wrap(a):                      # -> (-180, 180]
    a = (a + 180) % 360 - 180
    return a

def moon_state(dt):
    """Return (sub-Earth selenographic lon deg [east+], lat deg, distance km)."""
    T = (dt - J2000).total_seconds() / 86400 / 36525
    Lp = 218.3164477 + 481267.88123421 * T
    D  = r(297.8501921 + 445267.1114034 * T)
    M  = r(357.5291092 + 35999.0502909 * T)
    Mp = r(134.9633964 + 477198.8675055 * T)
    Fd = 93.2720950 + 483202.0175233 * T
    F  = r(Fd)
    Om = 125.0445479 - 1934.1362891 * T
    lon = Lp + (6.288774*s(Mp) + 1.274027*s(2*D-Mp) + 0.658314*s(2*D) + 0.213618*s(2*Mp)
                - 0.185116*s(M) - 0.114332*s(2*F) + 0.058793*s(2*D-2*Mp)
                + 0.057066*s(2*D-M-Mp) + 0.053322*s(2*D+Mp) + 0.045758*s(2*D-M))
    lat = (5.128122*s(F) + 0.280602*s(Mp+F) + 0.277693*s(Mp-F) + 0.173237*s(2*D-F)
           + 0.055413*s(2*D-Mp+F) + 0.046271*s(2*D-Mp-F) + 0.032573*s(2*D+F) + 0.017198*s(2*Mp+F))
    dist = (385000.56 - 20905.355*c(Mp) - 3699.111*c(2*D-Mp) - 2955.968*c(2*D) - 569.925*c(2*Mp))
    W, b = r(lon - Om), r(lat)
    A = math.degrees(math.atan2(s(W)*c(b)*c(INCL) - s(b)*s(INCL), c(W)*c(b)))
    l_lib = wrap(A - Fd)
    b_lib = math.degrees(math.asin(-s(W)*c(b)*s(INCL) - s(b)*c(INCL)))
    return l_lib, b_lib, dist

def earth_link(lat, lon, l_e, b_e, dist):
    """Earth elevation (deg) and one-way light-time (s) for a site (lat, lon east+)."""
    sin_el = s(r(lat))*s(r(b_e)) + c(r(lat))*c(r(b_e))*c(r(lon - l_e))
    rng = math.sqrt(dist**2 + R_MOON**2 - 2*dist*R_MOON*sin_el)   # site -> Earth centre
    return math.degrees(math.asin(sin_el)), rng / C_KMS

def windows(lat, lon, start, days=45, step_min=10, mask_deg=0.0):
    """Earth-visibility windows above a terrain mask angle."""
    out, cur, t = [], None, start
    while t <= start + timedelta(days=days):
        el, dly = earth_link(lat, lon, *moon_state(t)[:2], moon_state(t)[2])
        if el > mask_deg and cur is None: cur = [t, dly]
        if el <= mask_deg and cur is not None:
            out.append((cur[0], t, cur[1])); cur = None
        t += timedelta(minutes=step_min)
    return out

def export_series(start, days=45, step_h=1):
    n = int(days * 24 / step_h) + 1
    L, B, D = [], [], []
    for i in range(n):
        l, b, d = moon_state(start + timedelta(hours=i*step_h))
        L.append(round(l, 3)); B.append(round(b, 3)); D.append(round(d))
    return {"t0": int(start.timestamp()*1000), "step": step_h*3600000, "l": L, "b": B, "d": D}

if __name__ == "__main__":
    lat, lon = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (-89.9, 0.0)
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    print(f"Site {lat}, {lon}  - Earth-visible windows (UTC), next 45 days")
    for a, b, d in windows(lat, lon, start):
        print(f"{a:%Y-%m-%d %H:%M} -> {b:%Y-%m-%d %H:%M}  ({(b-a).total_seconds()/3600:.1f} h)  one-way delay {d:.3f} s")