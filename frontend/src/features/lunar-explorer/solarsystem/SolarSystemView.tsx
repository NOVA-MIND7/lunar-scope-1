import { memo, useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BufferGeometry, Group, Line, LineBasicMaterial, Vector3 } from 'three';
import type { LandingSite } from '@/types';
import { formatLatitude, formatLongitude } from '@/utils/format';
import { latLonToVector3 } from '@/utils/lunarCoordinates';
import { useAppStore } from '@/stores/appStore';
import { useGlobeStore } from '../globe/globeStore';
import { computeAstronomicalState } from '@/utils/astronomicalTime';

const SUN_RADIUS = 2.75;
const EARTH_RADIUS = 1.65;
const MOON_RADIUS = 0.9;
const EARTH_ORBIT_RADIUS = 20;
const MOON_ORBIT_RADIUS = 5.2;

function SunBody() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS, 40, 40]} />
        <meshBasicMaterial color="#fff0a0" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS * 1.35, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function EarthBody() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 36, 36]} />
        <meshStandardMaterial color="#2563eb" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.05, 32, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} depthWrite={false} toneMapped={false} side={2} />
      </mesh>
    </group>
  );
}

function MoonBody() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[MOON_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  );
}

function LandingSitePin() {
  const ref = useRef<Group>(null);
  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const pending = useGlobeStore((s) => s.pending);

  useFrame(() => {
    if (!ref.current) return;
    const site = selectedSite ?? pending;
    if (!site) {
      ref.current.visible = false;
      return;
    }
    const lat = 'coordinates' in site ? site.coordinates.latitude_deg : site.latitude_deg;
    const lon = 'coordinates' in site ? site.coordinates.longitude_deg : site.longitude_deg;
    const v = latLonToVector3(lat, lon, MOON_RADIUS + 0.06);
    ref.current.position.copy(v);
    ref.current.lookAt(new Vector3(0, 0, 0));
  });

  const site = selectedSite ?? pending;
  if (!site) return null;

  const lat = 'coordinates' in site ? site.coordinates.latitude_deg : site.latitude_deg;
  const lon = 'coordinates' in site ? site.coordinates.longitude_deg : site.longitude_deg;

  return (
    <group ref={ref}>
      <mesh>
        <coneGeometry args={[0.12, 0.22, 8]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
      <Html
        position={[0, 0.35, 0]}
        center
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        zIndexRange={[50, 0]}
      >
        <div className="flex flex-col items-center rounded border border-cyan-400/70 bg-bg/95 px-2 py-1 shadow-lg backdrop-blur">
          <div className="font-mono text-xs font-semibold text-cyan-300">LANDING SITE</div>
          <div className="font-mono text-[8px] text-fg">
            {formatLatitude(lat)} {formatLongitude(lon)}
          </div>
        </div>
      </Html>
    </group>
  );
}

type SiteCoords = { latitude_deg: number; longitude_deg: number };

function getSiteCoords(site: LandingSite | SiteCoords | null): SiteCoords | null {
  if (!site) return null;
  return 'coordinates' in site ? site.coordinates : site;
}

export const SolarSystemView = memo(function SolarSystemView() {
  const selectedSite = useAppStore((s) => s.selectedLandingSite);
  const pending = useGlobeStore((s) => s.pending);
  const setMode = useGlobeStore((s) => s.setVisualizationMode);
  const { scene } = useThree();

  const earthGroupRef = useRef<Group>(null);
  const moonGroupRef = useRef<Group>(null);
  const moonOrbitTrailRef = useRef<Group>(null);

  const lineRefs = useRef<{
    sunToEarth: Line | null;
    earthToMoon: Line | null;
    siteToEarth: Line | null;
  }>({ sunToEarth: null, earthToMoon: null, siteToEarth: null });

  const geoRefs = useRef<{
    sunToEarth: BufferGeometry | null;
    earthToMoon: BufferGeometry | null;
    siteToEarth: BufferGeometry | null;
  }>({ sunToEarth: null, earthToMoon: null, siteToEarth: null });

  const siteCoords = useMemo(() => getSiteCoords(selectedSite ?? pending), [selectedSite, pending]);

  const updateLineGeo = useCallback((geo: BufferGeometry | null, p1: Vector3, p2: Vector3) => {
    if (!geo) return;
    geo.setFromPoints([p1, p2]);
    geo.attributes.position!.needsUpdate = true;
  }, []);

  // Create line meshes once
  useFrame(() => {
    if (!scene) return;
    const { current: lines } = lineRefs;
    if (!lines.sunToEarth) {
      const geo = new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(20, 0, 0)]);
      geoRefs.current.sunToEarth = geo;
      const line = new Line(geo, new LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.4 }));
      line.name = 'sunToEarthLine';
      lines.sunToEarth = line;
      scene.add(line);
    }
    if (!lines.earthToMoon) {
      const geo = new BufferGeometry().setFromPoints([new Vector3(20, 0, 0), new Vector3(25.2, 0, 0)]);
      geoRefs.current.earthToMoon = geo;
      const line = new Line(geo, new LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.35 }));
      line.name = 'earthToMoonLine';
      lines.earthToMoon = line;
      scene.add(line);
    }
  }, 1);

  useFrame(() => {
    const now = Date.now();
    const ts = useGlobeStore.getState().activeTimestampMs || now;
    const astro = computeAstronomicalState(ts);

    const [ex, ey, ez] = astro.earthPosition;
    const [mx, my, mz] = astro.moonPosition;
    const earthPos = new Vector3(ex, ey, ez);
    const moonPos = new Vector3(mx, my, mz);

    if (earthGroupRef.current) {
      earthGroupRef.current.position.copy(earthPos);
    }
    if (moonOrbitTrailRef.current) {
      moonOrbitTrailRef.current.position.copy(earthPos);
    }
    if (moonGroupRef.current) {
      moonGroupRef.current.position.copy(moonPos);
    }

    updateLineGeo(geoRefs.current.sunToEarth, new Vector3(0, 0, 0), earthPos);
    updateLineGeo(geoRefs.current.earthToMoon, earthPos, moonPos);

    if (siteCoords && moonGroupRef.current) {
      const siteWorld = latLonToVector3(siteCoords.latitude_deg, siteCoords.longitude_deg, MOON_RADIUS);
      siteWorld.applyMatrix4(moonGroupRef.current.matrixWorld);
      if (!geoRefs.current.siteToEarth) {
        const geo = new BufferGeometry().setFromPoints([siteWorld, earthPos]);
        geoRefs.current.siteToEarth = geo;
        const line = new Line(geo, new LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 }));
        line.name = 'siteToEarthLine';
        lineRefs.current.siteToEarth = line;
        scene.add(line);
      }
      updateLineGeo(geoRefs.current.siteToEarth, siteWorld, earthPos);
    }
  });

  const siteLabel = siteCoords
    ? `${formatLatitude(siteCoords.latitude_deg)} ${formatLongitude(siteCoords.longitude_deg)}`
    : '—';

  return (
    <section className="h-full w-full bg-[#04070d] rounded-lg border border-line relative">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-lg border border-line bg-bg/90 backdrop-blur px-3 py-1.5 text-xs text-fg shadow-lg">
        <span>Sun–Earth–Moon system</span>
        <span className="text-fg-muted">· illustrative ephemeris</span>
        <button
          type="button"
          onClick={() => setMode('globe')}
          className="btn btn-sm btn-outline ml-2"
          title="3D Globe"
        >
          3D Globe
        </button>
        <button
          type="button"
          onClick={() => setMode('map2d')}
          className="btn btn-sm btn-outline ml-2"
          title="2D Map"
        >
          2D Map
        </button>
      </div>

      <Canvas
        className="block h-full w-full"
        camera={{ position: [35, 20, 35], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.15} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#fff0a0" distance={100} />

        <group position={[0, 0, 0]}>
          <SunBody />
          <Html position={[0, 3.4, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[50, 0]}>
            <div className="flex flex-col items-center rounded border border-amber-400/60 bg-bg/95 px-2.5 py-1 shadow-lg backdrop-blur">
              <div className="font-mono text-xs font-semibold tracking-wider text-amber-400">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" /> THE SUN
              </div>
              <div className="font-mono text-xs text-fg-muted">Illumination source · center of system</div>
            </div>
          </Html>
        </group>

        <lineLoop>
          <circleGeometry args={[EARTH_ORBIT_RADIUS, 64]} />
          <lineBasicMaterial color="#3b82f6" transparent opacity={0.25} depthWrite={false} toneMapped={false} />
        </lineLoop>

        <group ref={moonOrbitTrailRef} position={[EARTH_ORBIT_RADIUS, 0, 0]} rotation={[0.09, 0, 0]}>
          <lineLoop>
            <circleGeometry args={[MOON_ORBIT_RADIUS, 48]} />
            <lineBasicMaterial color="#00e5ff" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
          </lineLoop>
        </group>

        <group ref={earthGroupRef} position={[EARTH_ORBIT_RADIUS, 0, 0]}>
          <EarthBody />
          <Html position={[0, EARTH_RADIUS + 0.9, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[50, 0]}>
            <div className="flex flex-col items-center rounded border border-blue-400/60 bg-bg/95 px-2.5 py-1 shadow-lg backdrop-blur">
              <div className="font-mono text-xs font-semibold tracking-wider text-blue-400">
                <span className="size-2 rounded-full bg-blue-400 animate-pulse" /> EARTH
              </div>
              <div className="font-mono text-xs text-fg-muted">12,756 km · orbits the Sun</div>
            </div>
          </Html>
        </group>

        <group ref={moonGroupRef} position={[25.2, 0, 0]}>
          <MoonBody />
          {siteCoords && <LandingSitePin />}
          <Html position={[0, MOON_RADIUS + 0.5, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[50, 0]}>
            <div className="flex flex-col items-center rounded border border-cyan-400/60 bg-bg/95 px-2.5 py-1 shadow-lg backdrop-blur">
              <div className="font-mono text-xs font-semibold tracking-wider text-cyan-300">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" /> MOON
              </div>
              <div className="font-mono text-xs text-fg-muted">
                3,474 km · tidally locked · site: {siteLabel}
              </div>
            </div>
          </Html>
        </group>

        {siteCoords && (
          <Html position={[12, 8, 12]} center style={{ pointerEvents: 'none' }} zIndexRange={[50, 0]}>
            <div className="flex flex-col items-center rounded border border-cyan-400/50 bg-bg/95 px-2 py-1 shadow-lg backdrop-blur">
              <div className="font-mono text-xs font-semibold text-cyan-300">Earth visibility line</div>
              <div className="font-mono text-[8px] text-fg-muted">Line-of-sight from landing site to Earth</div>
            </div>
          </Html>
        )}
      </Canvas>

      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col items-center gap-1 text-sm text-fg-muted">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#fff0a0]" /> Sun (illumination source)
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#2563eb]" /> Earth (comms relay target)
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#9ca3af]" /> Moon (landing site surface)
        </div>
        {siteCoords ? (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#22d3ee]" /> Site → Earth visibility
          </div>
        ) : null}
        {!siteCoords && (
          <div className="text-fg-dim italic">Select or pick a landing site to see the Earth visibility line.</div>
        )}
      </div>
    </section>
  );
});
