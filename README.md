# AstraRelay: Lunar Landing Site & Orbital Navigator

**2026 NASA Space Apps Challenge — Lunar Landing Site Navigator**

An interactive mission-planning and educational web application that evaluates Lunar South Pole landing sites and dates for **solar power availability**, **thermal survival**, and **Direct-to-Earth (DTE) vs. Orbital Relay communication windows**.

---

## Overview & Problem Solved

Planning missions to the Moon’s South Pole (such as NASA's **Artemis** and **CLPS** programs) requires balancing science value (proximity to water-ice craters) with strict engineering constraints:
- **Grazing Sunlight & Terrain Shadows:** Because the Moon's axial tilt is only $1.54^\circ$, the Sun skims horizontally along the South Pole horizon. Surrounding crater rims and mountain ridges cast long shadows that can block sunlight for days.
- **Earth Libration & Comms Blackouts:** While the Moon is tidally locked, Earth traces a slow 27.3-day figure-8 wobble near the polar horizon. When ridges block Earth, Direct-to-Earth radio drops out unless an orbiting relay satellite is used.
- **Schedule Slips & Rapid Trade-Offs:** Hardware or launch delays frequently shift landing dates. Existing tools (JPL Horizons, Quickmap, Moon Trek) require navigating separate interfaces to evaluate each coordinate-date pair.

**AstraRelay** unifies ephemeris calculations, LOLA terrain horizon masks, and 3D shadow visualization into one fast, accessible interface for both flight planners and students.

---

## Key Features

1. **Candidate Landing Sites & Custom Coordinates:**
   - Pre-loaded with 7 curated lunar sites (**Shackleton Crater Rim**, **Connecting Ridge**, **Malapert Massif**, **Mons Mouton**, **Nobile Crater Rim 1**, **Statio Shiv Shakti / Chandrayaan-3**, and **Apollo 11 Tranquility Base** as an equatorial baseline).
   - Supports custom **Latitude / Longitude** coordinate inputs anywhere on the Moon.
2. **Launch Delay Scrubber & Orbital Release Optimizer:**
   - Simulate launch or orbital loitering delays (`+0` to `+29` Earth days) to see real-time impacts on power and comms.
   - **Auto-Find Best Date** scans upcoming windows to recommend the optimal rover release date with maximum continuous sunlight.
3. **Orbital Relay vs. Direct-to-Earth (DTE) Architecture:**
   - Toggle between **Direct-to-Earth Only** and **Orbital Relay Assisted** modes to see how keeping a carrier satellite in lunar orbit bridges terrain-induced radio blackouts.
4. **$360^\circ$ Lander Horizon Mask Panorama:**
   - Displays the surrounding mountain ridge elevation profile ($0^\circ\text{–}360^\circ$ azimuth) alongside the Sun's path and Earth's 27.3-day libration trail, plus an hour-by-hour 14-day mission scrubber.
5. **Interactive 3D Terrain & Live Shadow Simulation:**
   - Built with **Three.js**, rendering real-time directional solar shadows, Permanently Shadowed Region (PSR) crater geometry, Earth sightline vectors, and an orbiting relay satellite. Supports loading genuine **NASA Moon Trek `.OBJ`** terrain meshes.
6. **Side-by-Side Scenario Comparison (Plan A vs. Plan B):**
   - Compares two candidate sites on the same target date across **Solar Illumination (%)**, **Earth Comms Uptime (%)**, **Longest Continuous Darkness (hrs)**, **Distance to Water Ice**, and **Go / No-Go Mission Verdict**.

---

## NASA Data & Resources Used

- **NASA JPL Horizons System (`coord@301`):** Planetary ephemeris geometry for solar elevation/azimuth and Earth lunar libration tracking.
- **LRO Lunar Orbiter Laser Altimeter (LOLA):** Topographic elevation data and $360^\circ$ horizon masks for South Pole craters and massifs.
- **NASA Moon Trek:** 3D lunar surface terrain mesh export (`.OBJ`) and landing site slope/elevation verification.
- **NASA LROC Quickmap:** South Pole illumination and Permanently Shadowed Region (PSR) reference layers.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React Icons
- **3D Visualization:** Three.js (`WebGLRenderer`, `OBJLoader`)

---

## How to Run Locally

### Prerequisites
- **Node.js** (v18 or newer) and **npm** installed on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)<your-username>/lunar-landing-navigator.git
cd lunar-landing-navigator