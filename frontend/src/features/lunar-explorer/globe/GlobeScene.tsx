import { memo, Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Group, Vector3 } from 'three';
import type { LandingSite } from '@/types';
import { useAppStore } from '@/stores/appStore';
import { CassiniSatellite } from './CassiniSatellite';
import { CelestialEarth } from './CelestialEarth';
import { CelestialSun } from './CelestialSun';
import { CoordinateGrid } from './CoordinateGrid';
import { LunarMarkers } from './LunarMarkers';
import { MoonAtmosphere } from './MoonAtmosphere';
import { MoonControls } from './MoonControls';
import { MoonLighting } from './MoonLighting';
import { MoonSurface } from './MoonSurface';
import { SelectedLocationMarker } from './SelectedLocationMarker';
import { SouthPoleHighlight } from './SouthPoleHighlight';
import { useGlobeStore } from './globeStore';
import type { MoonTextureSet } from './useMoonTextures';

export interface SunSettings {
  direction: readonly [number, number, number];
  visible: boolean;
  intensity: number;
}

function useCircularOrbitGeometry(radius: number, segments = 120) {
  return useMemo(() => {
    const geometry = new BufferGeometry();
    const points: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
    return geometry;
  }, [radius, segments]);
}

/** Everything inside the <Canvas>. Reads UI state from stores (React context does not cross the canvas). */
export const GlobeScene = memo(function GlobeScene({ textures, sites, sun }: { textures: MoonTextureSet; sites: LandingSite[]; sun: SunSettings }) {
  const earthGroupRef = useRef<Group>(null);
  const moonGroupRef = useRef<Group>(null);
  const moonSpinRef = useRef<Group>(null);
  const moonOrbitTrailGroupRef = useRef<Group>(null);

  const earthOrbitAngleRef = useRef(0);
  const moonOrbitAngleRef = useRef(0);
  const lastEclipseRef = useRef(0);
  const lastSunDirUpdate = useRef(0);

  const [eclipseVal, setEclipseVal] = useState(0);
  const [dynamicSunDir, setDynamicSunDir] = useState<readonly [number, number, number]>(sun.direction);

  const targetPos = useMemo(() => new Vector3(0, 0, 0), []);
  const earthPosVec = useRef(new Vector3(20, 0, 0));
  const moonPosVec = useRef(new Vector3(25.2, 0, 0));

  const showGrid = useGlobeStore((s) => s.showGrid);
  const southPoleMode = useGlobeStore((s) => s.southPoleMode);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const planetarySpeed = useGlobeStore((s) => s.planetaryRotationSpeed);
  const focusTarget = useGlobeStore((s) => s.focusTarget);
  const showOrbitPath = useGlobeStore((s) => s.showOrbitPath);
  const pending = useGlobeStore((s) => s.pending);
  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const customSelected = selectedSite?.category === 'custom' ? selectedSite : null;

  const earthOrbitGeo = useCircularOrbitGeometry(20.0);
  const moonOrbitGeo = useCircularOrbitGeometry(5.2);

  useFrame((_, delta) => {
    if (!autoRotate) return;
    const dt = Math.min(delta, 0.1);

    // 1. Earth orbits around Sun (radius 20)
    earthOrbitAngleRef.current = (earthOrbitAngleRef.current + dt * 0.035 * planetarySpeed) % (Math.PI * 2);
    const ea = earthOrbitAngleRef.current;
    const ex = Math.sin(ea) * 20.0;
    const ez = Math.cos(ea) * 20.0;
    const ey = 0;

    // 2. Moon orbits around Earth (radius 5.2, inclined 5.14 degrees)
    moonOrbitAngleRef.current = (moonOrbitAngleRef.current + dt * 0.20 * planetarySpeed) % (Math.PI * 2);
    const ma = moonOrbitAngleRef.current;
    const mx = ex + Math.sin(ma) * 5.2;
    const mz = ez + Math.cos(ma) * 5.2;
    const my = ey + Math.sin(ma) * 0.46;

    // 3. Moon spins on its axis (thana kerakena)
    if (moonSpinRef.current) {
      moonSpinRef.current.rotation.y += dt * 0.06 * planetarySpeed;
    }

    if (earthGroupRef.current) {
      earthGroupRef.current.position.set(ex, ey, ez);
    }
    if (moonOrbitTrailGroupRef.current) {
      moonOrbitTrailGroupRef.current.position.set(ex, ey, ez);
    }
    if (moonGroupRef.current) {
      moonGroupRef.current.position.set(mx, my, mz);
    }

    earthPosVec.current.set(ex, ey, ez);
    moonPosVec.current.set(mx, my, mz);

    // Target tracking without React re-renders
    if (focusTarget === 'earth') {
      targetPos.set(ex, ey, ez);
    } else if (focusTarget === 'moon') {
      targetPos.set(mx, my, mz);
    } else {
      targetPos.set(0, 0, 0);
    }

    // Dynamic solar lighting angle from Moon to Sun at (0, 0, 0)
    const now = performance.now();
    if (now - lastSunDirUpdate.current > 400) {
      lastSunDirUpdate.current = now;
      const mLen = Math.hypot(mx, my, mz);
      if (mLen > 0) {
        setDynamicSunDir([-mx / mLen, -my / mLen, -mz / mLen]);
      }
    }

    // Lunar Eclipse calculation (Earth casts umbral shadow over Moon)
    const earthLen = Math.hypot(ex, ey, ez);
    const edx = ex / earthLen;
    const edy = ey / earthLen;
    const edz = ez / earthLen;
    const t = mx * edx + my * edy + mz * edz;

    let eclipse = 0;
    if (t > earthLen) {
      // Moon is behind Earth relative to the Sun
      const cx = edx * t;
      const cy = edy * t;
      const cz = edz * t;
      const perp = Math.hypot(mx - cx, my - cy, mz - cz);
      if (perp < 1.1) {
        eclipse = 1.0; // Total Lunar Eclipse (sunlight blocked)
      } else if (perp < 2.2) {
        eclipse = (2.2 - perp) / 1.1; // Penumbra shadow
      }
    }

    if (Math.abs(eclipse - lastEclipseRef.current) > 0.05) {
      lastEclipseRef.current = eclipse;
      setEclipseVal(eclipse);
      useGlobeStore.getState().setEclipseFactor(eclipse);
    }
  });

  return (
    <>
      <color attach="background" args={['#04070d']} />
      <MoonLighting
        sunDirection={dynamicSunDir}
        sunVisible={sun.visible}
        intensity={sun.intensity}
        eclipseFactor={eclipseVal}
      />
      <Stars radius={120} depth={50} count={3500} factor={2.2} saturation={0} fade speed={0} />

      {/* Sun 3D Celestial Body at the Center of the Solar System */}
      <Suspense fallback={null}>
        <CelestialSun sunDirection={dynamicSunDir} visible={sun.visible} position={[0, 0, 0]} />
      </Suspense>

      {/* Earth Orbit Trail around the Sun */}
      {showOrbitPath ? (
        <lineLoop geometry={earthOrbitGeo}>
          <lineBasicMaterial color="#3b82f6" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
        </lineLoop>
      ) : null}

      {/* Earth 3D Celestial Body (Orbiting Sun & Spinning on 23.5° Tilted Axis) */}
      <group ref={earthGroupRef} position={[20, 0, 0]}>
        <Suspense fallback={null}>
          <CelestialEarth position={[0, 0, 0]} />
        </Suspense>
      </group>

      {/* Moon Orbit Trail around the Earth */}
      {showOrbitPath ? (
        <group ref={moonOrbitTrailGroupRef} position={[20, 0, 0]} rotation={[0.09, 0, 0]}>
          <lineLoop geometry={moonOrbitGeo}>
            <lineBasicMaterial color="#00e5ff" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
          </lineLoop>
        </group>
      ) : null}

      {/* Moon System: Orbiting Earth and Spinning in Place */}
      <group ref={moonGroupRef} position={[25.2, 0, 0]}>
        {/* Moon Spinning Body and Surface Elements */}
        <group ref={moonSpinRef}>
          <MoonSurface textures={textures} />
          <MoonAtmosphere sunDirection={sun.direction} />
          {showGrid ? <CoordinateGrid southPolar={southPoleMode} /> : null}
          {southPoleMode ? <SouthPoleHighlight /> : null}
          <LunarMarkers sites={sites} />
          {customSelected ? <SelectedLocationMarker coordinates={customSelected.coordinates} status="confirmed" /> : null}
          {pending ? <SelectedLocationMarker coordinates={pending} status="pending" /> : null}
        </group>

        {/* Cassini Polar Satellite Orbiting over Moon's South Pole */}
        <Suspense fallback={null}>
          <CassiniSatellite />
        </Suspense>
      </group>

      <MoonControls targetPos={targetPos} />
    </>
  );
});
