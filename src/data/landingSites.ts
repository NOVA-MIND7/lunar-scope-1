export interface LandingSite {
  id: string;
  name: string;
  program: string;
  lat: number; // Negative = South
  lon: number; // East longitude
  elevationMeters: number;
  slopeDeg: number;
  waterIceDistanceKm: number;
  description: string;
  scienceValue: string;
  // 36 terrain elevation angles (degrees above flat horizon) for azimuths 0°, 10°, 20° ... 350°
  terrainMask: number[];
}

export const LANDING_SITES: LandingSite[] = [
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim (Peak)',
    program: 'Artemis III / CLPS Priority',
    lat: -89.9,
    lon: 0.0,
    elevationMeters: 2100,
    slopeDeg: 7.2,
    waterIceDistanceKm: 0.4,
    description:
      'Located right at the Lunar South Pole on the elevated rim of Shackleton Crater. Famous for "Peaks of Eternal Light" with up to 86% sunlight in summer, overlooking a deep Permanently Shadowed Region (PSR) holding water ice.',
    scienceValue: 'Direct access to ancient cold-trapped water ice & volatile deposits.',
    terrainMask: [
      1.2, 1.5, 2.1, 2.8, 3.4, 3.1, 2.5, 1.8, 1.2, 0.9, 1.1, 1.6,
      2.2, 2.9, 3.8, 4.2, 3.9, 3.0, 2.1, 1.5, 1.0, 0.8, 0.9, 1.3,
      1.9, 2.4, 2.8, 2.5, 2.0, 1.6, 1.3, 1.1, 1.0, 0.9, 1.0, 1.1
    ],
  },
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge (Shackleton–de Gerlache)',
    program: 'Artemis III Candidate',
    lat: -89.5,
    lon: 222.0,
    elevationMeters: 2450,
    slopeDeg: 5.8,
    waterIceDistanceKm: 1.1,
    description:
      'A sharp elevated ridge bridging Shackleton and de Gerlache craters. High altitude minimizes horizon blockage from neighboring massifs, offering some of the longest continuous solar windows on the Moon.',
    scienceValue: 'Ideal long-duration solar power station and lunar base camp location.',
    terrainMask: [
      0.8, 0.9, 1.2, 1.5, 1.8, 2.2, 2.5, 2.1, 1.6, 1.2, 0.9, 0.7,
      0.8, 1.1, 1.5, 1.9, 2.3, 2.0, 1.5, 1.1, 0.8, 0.6, 0.7, 0.9,
      1.2, 1.6, 1.9, 1.7, 1.3, 1.0, 0.8, 0.7, 0.6, 0.7, 0.7, 0.8
    ],
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif Crest',
    program: 'CLPS IM-1 Region / Artemis III',
    lat: -86.0,
    lon: 0.0,
    elevationMeters: 4800,
    slopeDeg: 6.4,
    waterIceDistanceKm: 3.5,
    description:
      'A towering 5-km mountain ridge aligned toward Earth (0° Longitude). Because of its height and Earth-facing position, it acts as a natural radio tower for Direct-to-Earth (DTE) communication.',
    scienceValue: 'Highland crust geology and premier Direct-to-Earth relay station.',
    terrainMask: [
      0.4, 0.5, 0.7, 1.0, 1.4, 1.8, 2.1, 1.9, 1.5, 1.1, 0.8, 0.6,
      0.9, 1.4, 2.0, 2.6, 3.1, 2.8, 2.2, 1.6, 1.2, 0.9, 0.7, 0.6,
      0.8, 1.1, 1.4, 1.2, 0.9, 0.7, 0.5, 0.4, 0.3, 0.3, 0.4, 0.4
    ],
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton Plateau',
    program: 'CLPS IM-4 / VIPER Region',
    lat: -84.6,
    lon: 31.0,
    elevationMeters: 5400,
    slopeDeg: 3.2,
    waterIceDistanceKm: 2.8,
    description:
      'A massive, flat-topped mountain plateau near the western rim of Nobile Crater. Its gentle 3.2° slope makes rover driving and landing vastly safer than steep crater walls.',
    scienceValue: 'Safe landing zone with ancient lunar rocks and nearby cold traps.',
    terrainMask: [
      0.6, 0.8, 1.1, 1.3, 1.6, 1.9, 1.7, 1.4, 1.0, 0.8, 0.7, 0.9,
      1.3, 1.8, 2.4, 2.9, 2.7, 2.1, 1.6, 1.2, 0.9, 0.7, 0.6, 0.8,
      1.1, 1.5, 1.8, 1.6, 1.2, 0.9, 0.7, 0.6, 0.5, 0.5, 0.6, 0.6
    ],
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Crater Rim 1 (Deep Valley Edge)',
    program: 'Artemis III / CLPS Target',
    lat: -85.2,
    lon: 53.5,
    elevationMeters: 1650,
    slopeDeg: 9.1,
    waterIceDistanceKm: 0.6,
    description:
      'Surrounded by rugged crater walls and high peaks. High scientific reward for volatile hunting, but steep horizon ridges block both low-angle sunlight and Direct-to-Earth radio for days at a time.',
    scienceValue: 'High concentration of subsurface hydrogen & water ice signatures.',
    terrainMask: [
      3.5, 4.2, 5.1, 5.8, 4.9, 3.8, 2.9, 2.2, 1.8, 2.4, 3.6, 4.8,
      5.5, 6.2, 5.9, 4.7, 3.5, 2.8, 2.1, 1.9, 2.5, 3.4, 4.1, 4.6,
      3.9, 3.1, 2.4, 1.8, 1.5, 1.9, 2.6, 3.2, 3.8, 4.0, 3.7, 3.4
    ],
  },
  {
    id: 'shiv-shakti',
    name: 'Statio Shiv Shakti (Chandrayaan-3)',
    program: 'ISRO Chandrayaan-3 (Historical South Polar)',
    lat: -69.37,
    lon: 32.32,
    elevationMeters: 600,
    slopeDeg: 4.5,
    waterIceDistanceKm: 45.0,
    description:
      'India’s historic 2023 landing site at ~70°S. Experiences a strict 14-Earth-day sunlit period followed by 14 Earth days of total freezing darkness, unlike the high polar peaks.',
    scienceValue: 'Proven mid-polar plains touchdown baseline with High DTE visibility.',
    terrainMask: [
      0.5, 0.6, 0.8, 1.0, 1.1, 0.9, 0.7, 0.5, 0.4, 0.5, 0.7, 0.9,
      1.2, 1.4, 1.3, 1.0, 0.8, 0.6, 0.5, 0.4, 0.5, 0.7, 0.9, 1.1,
      1.0, 0.8, 0.6, 0.5, 0.4, 0.4, 0.5, 0.6, 0.6, 0.5, 0.5, 0.5
    ],
  },
  {
    id: 'apollo-11',
    name: 'Tranquility Base (Apollo 11 Baseline)',
    program: 'NASA Apollo 11 (Equatorial Reference)',
    lat: 0.67,
    lon: 23.47,
    elevationMeters: -1900,
    slopeDeg: 1.4,
    waterIceDistanceKm: 2600.0,
    description:
      'Equatorial baseline site. The Sun climbs nearly straight overhead (90°) for 14 days and Earth hangs high at ~66° elevation in the sky—demonstrating why equatorial landings are easy compared to the South Pole!',
    scienceValue: 'Equatorial mare basalt baseline for comparing polar extremes.',
    terrainMask: new Array(36).fill(0.2),
  },
];