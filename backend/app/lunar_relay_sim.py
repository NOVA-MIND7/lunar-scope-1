#!/usr/bin/env python3
"""Generate a three-lunar-satellite / three-Earth-relay link simulation.

This is an illustrative two-body model. Three lunar orbiters and three GEO relays
are phased 120 degrees apart. A frame is covered when at least one lunar-to-Earth
path is not blocked by the Moon or the Earth.
"""
import argparse, json
from datetime import datetime, timezone
import numpy as np

MU_MOON, R_MOON = 4902.8, 1737.4
MU_EARTH, R_EARTH, ATM = 398600.4418, 6378.137, 100.0
EPS, INCL = np.radians(23.4393), np.radians(1.54242)
J2000 = datetime(2000, 1, 1, 12, tzinfo=timezone.utc)
rad = np.radians

def ecl_to_eq(v):
    x, y, z = v[..., 0], v[..., 1], v[..., 2]
    return np.stack([x, y * np.cos(EPS) - z * np.sin(EPS), y * np.sin(EPS) + z * np.cos(EPS)], -1)

def moon_geocentric(days):
    T = days / 36525
    Lp = 218.3164477 + 481267.88123421 * T
    D, M = rad(297.8501921 + 445267.1114034 * T), rad(357.5291092 + 35999.0502909 * T)
    Mp, F = rad(134.9633964 + 477198.8675055 * T), rad(93.2720950 + 483202.0175233 * T)
    Om = 125.0445479 - 1934.1362891 * T
    lon = rad(Lp + 6.289 * np.sin(Mp) + 1.274 * np.sin(2 * D - Mp) + 0.658 * np.sin(2 * D)
              + 0.214 * np.sin(2 * Mp) - 0.186 * np.sin(M) - 0.114 * np.sin(2 * F))
    lat = rad(5.128 * np.sin(F) + 0.281 * np.sin(Mp + F) + 0.278 * np.sin(Mp - F) + 0.173 * np.sin(2 * D - F))
    r = 385000.56 - 20905 * np.cos(Mp) - 3699 * np.cos(2 * D - Mp) - 2956 * np.cos(2 * D) - 570 * np.cos(2 * Mp)
    ecl = np.stack([r * np.cos(lat) * np.cos(lon), r * np.cos(lat) * np.sin(lon), r * np.sin(lat)], -1)
    return ecl_to_eq(ecl), float(Om[0])

def kepler(a, e, i, raan, argp, m0, mu, t):
    M = rad(m0) + np.sqrt(mu / a**3) * t
    E = M.copy()
    for _ in range(12): E -= (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    x, y = a * (np.cos(E) - e), a * np.sqrt(1 - e * e) * np.sin(E)
    i, O, w = rad(i), rad(raan), rad(argp)
    cO, sO, ci, si, cw, sw = np.cos(O), np.sin(O), np.cos(i), np.sin(i), np.cos(w), np.sin(w)
    return np.stack([(cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y,
                     (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y,
                     (sw * si) * x + (cw * si) * y], -1)

def lunar_frame_to_eq(v, node_deg):
    tilt = rad(node_deg + 90)
    pole = np.array([np.sin(INCL) * np.cos(tilt), np.sin(INCL) * np.sin(tilt), np.cos(INCL)])
    xh = np.array([-pole[1], pole[0], 0.0]); xh /= np.linalg.norm(xh)
    yh = np.cross(pole, xh)
    return ecl_to_eq(v[..., :1] * xh + v[..., 1:2] * yh + v[..., 2:3] * pole)

def blocked(p0, p1, centre, radius):
    d = p1 - p0
    s = np.clip(np.einsum('ij,ij->i', centre - p0, d) / np.einsum('ij,ij->i', d, d), 0, 1)
    return np.linalg.norm(p0 + s[:, None] * d - centre, axis=1) < radius

def windows(visible, ranges, t0ms, dt):
    values = np.concatenate([[0], visible.astype(int), [0]])
    edges = np.diff(values); result = []
    for start, end in zip(np.where(edges == 1)[0], np.where(edges == -1)[0]):
        result.append({'a': t0ms + int(start * dt * 1000), 'b': t0ms + int(end * dt * 1000),
                       'minR': round(float(ranges[start:end].min())), 'maxR': round(float(ranges[start:end].max()))})
    return result

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--days', type=float, default=2); ap.add_argument('--dt', type=int, default=10)
    ap.add_argument('--step', type=int, default=120); ap.add_argument('--sma', type=float, default=6141)
    ap.add_argument('--ecc', type=float, default=0.6); ap.add_argument('--inc', type=float, default=57.7)
    ap.add_argument('--raan', type=float, default=0); ap.add_argument('--argp', type=float, default=270)
    ap.add_argument('--m0', type=float, default=0); ap.add_argument('--geo-phase', type=float, default=0)
    ap.add_argument('--out', default='relay_series.json'); a = ap.parse_args()
    start = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    t0ms = int(start.timestamp() * 1000); t = np.arange(int(a.days * 86400 / a.dt) + 1) * float(a.dt)
    moon, node = moon_geocentric((start - J2000).total_seconds() / 86400 + t / 86400)
    phases = [0, 120, 240]
    lunar = [moon + lunar_frame_to_eq(kepler(a.sma, a.ecc, a.inc, a.raan, a.argp, a.m0 + p, MU_MOON, t), node) for p in phases]
    earth = [kepler(42164.17, 0, 0, 0, 0, a.geo_phase + p, MU_EARTH, t) for p in phases]
    pair_visible, pair_ranges = {}, {}
    for li, orbiter in enumerate(lunar):
        for ei, relay in enumerate(earth):
            key = f'L{li + 1}-E{ei + 1}'
            pair_visible[key] = ~(blocked(orbiter, relay, moon, R_MOON) | blocked(orbiter, relay, np.zeros(3), R_EARTH + ATM))
            pair_ranges[key] = np.linalg.norm(relay - orbiter, axis=1)
    coverage = np.zeros(len(t), dtype=bool); best_range = np.full(len(t), np.inf)
    active_lunar = np.full(len(t), -1, dtype=int); active_earth = np.full(len(t), -1, dtype=int)
    for key, visible in pair_visible.items():
        li, ei = int(key[1]) - 1, int(key[4]) - 1; distance = pair_ranges[key]
        better = visible & (distance < best_range)
        best_range[better], active_lunar[better], active_earth[better] = distance[better], li, ei
        coverage |= visible
    k = max(1, a.step // a.dt); sample = slice(0, None, k); xy = lambda value: np.round(value[sample, :2]).astype(int)
    series = {
        't0': t0ms, 'step': a.step * 1000, 'periodMin': round(2 * np.pi * np.sqrt(a.sma**3 / MU_MOON) / 60, 1),
        'mx': np.round(moon[sample, 0]).astype(int).tolist(), 'my': np.round(moon[sample, 1]).astype(int).tolist(),
        'lunar': [{'name': f'L{i + 1}', 'x': xy(orbiter - moon)[:, 0].tolist(), 'y': xy(orbiter - moon)[:, 1].tolist()} for i, orbiter in enumerate(lunar)],
        'earth': [{'name': f'E{i + 1}', 'x': xy(relay)[:, 0].tolist(), 'y': xy(relay)[:, 1].tolist()} for i, relay in enumerate(earth)],
        'range': np.where(np.isfinite(best_range[sample]), np.round(best_range[sample]), 0).astype(int).tolist(),
        'activeLunar': active_lunar[sample].tolist(), 'activeEarth': active_earth[sample].tolist(),
        'win': windows(coverage, np.where(np.isfinite(best_range), best_range, 0), t0ms, a.dt),
        'pairWin': {key: windows(pair_visible[key], pair_ranges[key], t0ms, a.dt) for key in pair_visible},
    }
    up = coverage.mean() * 100; gaps = [(b['a'] - a['b']) / 3.6e6 for a, b in zip(series['win'], series['win'][1:])]
    delay = best_range[np.isfinite(best_range)] / 299792.458
    print(f'CONSTELLATION: 3 lunar + 3 Earth relays, link up {up:.1f}% of {a.days:g} d, longest outage {max(gaps, default=0):.1f} h, one-way delay {delay.min():.2f}-{delay.max():.2f} s')
    with open(a.out, 'w', encoding='utf-8') as output: json.dump(series, output, separators=(',', ':'))
    print(f'wrote {a.out}')

if __name__ == '__main__': main()
