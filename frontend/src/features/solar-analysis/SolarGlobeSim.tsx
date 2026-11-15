import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Compass, Eye, Globe2, Mountain, RotateCcw, Sun } from 'lucide-react';
import {
  latLonToVector3,
  vector3ToLatLon,
} from '@/utils/lunarCoordinates';
import { isWebGLAvailable } from '@/utils/webgl';
import {
  SOLAR_PRESET_SITES,
  type SolarEphemerisPoint,
  type SolarSiteProfile,
} from './solarPhysics';

export type GlobeSimViewMode = 'ORBITAL' | 'TERRAIN';

interface SolarGlobeSimProps {
  site: SolarSiteProfile;
  point: SolarEphemerisPoint;
  onPickCoordinates: (lat: number, lon: number) => void;
  onSelectPresetSite: (siteId: string) => void;
  useTerrainHorizon: boolean;
}

type CameraFocusPreset = {
  id: number;
  position: [number, number, number];
};

function MoonGlbModel({
  onPointerDown,
  onClick,
  onPointerMove,
  onPointerOut,
}: {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
}) {
  const [wacTex, setWacTex] = useState<THREE.Texture | null>(null);
  const [shadeTex, setShadeTex] = useState<THREE.Texture | null>(null);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const base = import.meta.env.BASE_URL || '/';
    const mkUrl = (name: string) => `${base}textures/${name}`.replace(/\/+/g, '/');
    loader.load(mkUrl('moon_trek_wac.jpg'), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAnisotropy;
      setWacTex(t);
    });
    loader.load(mkUrl('moon_trek_lola_shade.jpg'), (t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = maxAnisotropy;
      setShadeTex(t);
    });
  }, [maxAnisotropy]);

  const dispScale = shadeTex ? 0.032 * 1.5 : 0;

  return (
    <mesh
      onPointerDown={onPointerDown}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[1, 160, 120]} />
      {wacTex ? (
        <meshStandardMaterial
          map={wacTex}
          bumpMap={shadeTex ?? undefined}
          bumpScale={0.038 * 1.5}
          displacementMap={shadeTex ?? undefined}
          displacementScale={dispScale}
          displacementBias={-dispScale * 0.5}
          roughness={0.9}
          metalness={0.05}
        />
      ) : (
        <meshStandardMaterial color="#475569" roughness={0.9} />
      )}
    </mesh>
  );
}

function FrontLabel({
  position,
  visible = true,
  children,
  className = '',
}: {
  position: [number, number, number];
  visible?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    const el = ref.current;
    if (!el) return;
    if (!visible) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    const [x, y, z] = position;
    const len = Math.hypot(x, y, z) || 1;
    const dot = (camera.position.x * x + camera.position.y * y + camera.position.z * z) / len;
    el.style.opacity = dot > len * 0.2 ? '1' : '0.15';
  });

  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider shadow transition-opacity ${className}`}
      >
        {children}
      </div>
    </Html>
  );
}

function SiteBeacon({
  site,
  color,
  isSunlit,
  labelsVisible,
}: {
  site: SolarSiteProfile;
  color: string;
  isSunlit: boolean;
  labelsVisible: boolean;
}) {
  const pos = useMemo(() => latLonToVector3(site.lat, site.lon, 1.008), [site.lat, site.lon]);
  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [normal]);
  const labelPos = useMemo(
    () => normal.clone().multiplyScalar(1.13).toArray() as [number, number, number],
    [normal],
  );

  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[0.026, 18, 18]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={pos} quaternion={quat}>
        <ringGeometry args={[0.042, 0.062, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <Line
        points={[pos.toArray(), normal.clone().multiplyScalar(1.1).toArray()]}
        color={color}
        lineWidth={1.5}
      />
      <FrontLabel
        position={labelPos}
        visible={labelsVisible}
        className="border-cyan/70 bg-bg/90 text-cyan"
      >
        {site.lat.toFixed(1)}°, {site.lon.toFixed(1)}° {isSunlit ? '☀' : '☾'}
      </FrontLabel>
    </group>
  );
}

function OrbitalMoonScene({
  active,
  site,
  point,
  onPickCoordinates,
  onSelectPresetSite,
  onHoverCoords,
  focusPreset,
}: {
  active: boolean;
  site: SolarSiteProfile;
  point: SolarEphemerisPoint;
  onPickCoordinates: (lat: number, lon: number) => void;
  onSelectPresetSite: (siteId: string) => void;
  onHoverCoords: (coords: { lat: number; lon: number } | null) => void;
  focusPreset: CameraFocusPreset | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const pointerDownXY = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active || !focusPreset) return;
    camera.position.set(...focusPreset.position);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [active, focusPreset, camera]);

  const sunVec = useMemo(
    () => latLonToVector3(point.subSolarLatDeg, point.subSolarLonDeg, 6.5),
    [point.subSolarLatDeg, point.subSolarLonDeg],
  );
  const sunMarkerPos = useMemo(
    () => sunVec.clone().normalize().multiplyScalar(2.6),
    [sunVec],
  );

  // South pole 80°S reference ring
  const southPolarCircle = useMemo(() => {
    const r = Math.cos((-80 * Math.PI) / 180) * 1.005;
    const y = Math.sin((-80 * Math.PI) / 180) * 1.005;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push([Math.sin(a) * r, y, Math.cos(a) * r]);
    }
    return pts;
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownXY.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (pointerDownXY.current) {
      const dist = Math.hypot(
        e.clientX - pointerDownXY.current.x,
        e.clientY - pointerDownXY.current.y,
      );
      if (dist > 5) return;
    }
    const coords = vector3ToLatLon(e.point);
    onPickCoordinates(coords.latitude_deg, coords.longitude_deg);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const coords = vector3ToLatLon(e.point);
    onHoverCoords({
      lat: Number(coords.latitude_deg.toFixed(2)),
      lon: Number(coords.longitude_deg.toFixed(2)),
    });
  };

  return (
    <group visible={active}>
      {active && <color attach="background" args={['#050914']} />}
      {active && <Stars radius={45} depth={30} count={1400} factor={2.2} saturation={0} fade />}
      {active && <ambientLight intensity={0.14} />}
      {active && <directionalLight position={sunVec.toArray()} intensity={2.6} color="#fff7ed" />}

      {/* 3D Real Moon Model from moon.glb with authentic lunar topography */}
      <Suspense fallback={null}>
        <MoonGlbModel
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerOut={() => onHoverCoords(null)}
        />
      </Suspense>

      {/* -80°S Polar Reference Ring */}
      <Line points={southPolarCircle} color="#00d9ff" lineWidth={1} transparent opacity={0.45} />

      {/* Preset NASA/ISRO Landing Site Pins */}
      {SOLAR_PRESET_SITES.map((preset) => {
        const isSelected = !site.isCustom && site.id === preset.id;
        if (isSelected) return null;
        const p = latLonToVector3(preset.lat, preset.lon, 1.006);
        return (
          <mesh
            key={preset.id}
            position={p}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPresetSite(preset.id);
            }}
          >
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        );
      })}

      {/* Selected Site Beacon */}
      <SiteBeacon site={site} color="#00d9ff" isSunlit={point.isSunlit} labelsVisible={active} />

      {/* Live Sun Direction Indicator */}
      <mesh position={sunMarkerPos}>
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
      <Line
        points={[
          sunMarkerPos.clone().multiplyScalar(0.55).toArray(),
          sunMarkerPos.toArray(),
        ]}
        color="#fde047"
        lineWidth={1.2}
        dashed
        dashSize={0.06}
        gapSize={0.04}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={active}
        enablePan={false}
        minDistance={1.45}
        maxDistance={5.2}
        rotateSpeed={0.65}
        zoomSpeed={0.85}
      />
    </group>
  );
}

/** Deterministic local crater + LOLA ridge heightfield (from AstraRelay Lunar3DView). */
function sampleLocalTerrainHeight(
  worldX: number,
  worldZ: number,
  site: SolarSiteProfile,
  useTerrainHorizon: boolean,
): number {
  const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
  const azDeg = ((Math.atan2(worldX, -worldZ) * 180) / Math.PI + 360) % 360;
  const maskIdx = Math.floor(azDeg / 10) % 36;
  const ridgeElDeg = useTerrainHorizon ? (site.terrainMask[maskIdx] ?? 1.5) : 0.15;

  const rimBelt = Math.exp(-Math.pow((distFromCenter - 46) / 16, 2)) * ridgeElDeg * 2.1;
  const craterFieldA =
    Math.sin(worldX * 0.075) * Math.cos(worldZ * 0.075) * 1.4 +
    Math.sin(worldX * 0.15 + 1.2) * Math.sin(worldZ * 0.15 + 0.7) * 0.65;
  const padBlend = Math.min(1, distFromCenter / 10);
  return (rimBelt + craterFieldA) * padBlend;
}

function LocalTerrainShadowScene({
  active,
  site,
  point,
  useTerrainHorizon,
}: {
  active: boolean;
  site: SolarSiteProfile;
  point: SolarEphemerisPoint;
  useTerrainHorizon: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (!active) return;
    camera.position.set(0, 24, 38);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [active, camera]);

  const terrainGeometry = useMemo(() => {
    const size = 140;
    const segs = 96;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, sampleLocalTerrainHeight(x, z, site, useTerrainHorizon));
      }
      geo.computeVertexNormals();
    }
    return geo;
  }, [site, useTerrainHorizon]);

  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);

  const sunRadAz = (point.sunAz * Math.PI) / 180;
  const sunRadEl = (point.sunEl * Math.PI) / 180;
  const sunDirVec = useMemo(() => {
    const dist = 120;
    return new THREE.Vector3(
      Math.sin(sunRadAz) * Math.cos(sunRadEl) * dist,
      Math.max(-4, Math.sin(sunRadEl) * dist),
      -Math.cos(sunRadAz) * Math.cos(sunRadEl) * dist,
    );
  }, [sunRadAz, sunRadEl]);

  const accentColor = '#00d9ff';

  return (
    <group visible={active}>
      {active && <color attach="background" args={['#030712']} />}
      {active && <Stars radius={160} depth={40} count={900} factor={2} saturation={0} fade />}
      {active && <hemisphereLight args={['#cbd5e1', '#0f172a', 0.35]} />}
      {active && (
        <directionalLight
          position={sunDirVec.toArray()}
          intensity={point.isSunlit ? 2.9 : 0.4}
          color={point.isSunlit ? '#fffbeb' : '#64748b'}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={10}
          shadow-camera-far={260}
          shadow-camera-left={-70}
          shadow-camera-right={70}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
        />
      )}

      {/* Local Lunar Crater & Ridge Terrain */}
      <mesh geometry={terrainGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#64748b" roughness={0.94} metalness={0.05} />
      </mesh>

      {/* Lander & Vertical Solar Mast at (0, 0) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.55, 2.8, 12]} />
          <meshStandardMaterial color={accentColor} roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh position={[0, 3.1, 0]} castShadow>
          <boxGeometry args={[2.8, 0.14, 1.1]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.3} metalness={0.6} />
        </mesh>
      </group>

      {/* Sun Orb in Sky */}
      <mesh position={sunDirVec.clone().normalize().multiplyScalar(95)}>
        <sphereGeometry args={[3.2, 20, 20]} />
        <meshBasicMaterial color={point.isSunlit ? '#fde047' : '#ef4444'} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enabled={active}
        enablePan={false}
        minDistance={12}
        maxDistance={95}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
    </group>
  );
}

export function SolarGlobeSim({
  site,
  point,
  onPickCoordinates,
  onSelectPresetSite,
  useTerrainHorizon,
}: SolarGlobeSimProps) {
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const [viewMode, setViewMode] = useState<GlobeSimViewMode>('ORBITAL');
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [focusPreset, setFocusPreset] = useState<CameraFocusPreset | null>({
    id: 0,
    position: [0.4, -2.5, 1.4],
  });

  const focusOnSite = (targetSite: SolarSiteProfile) => {
    const pos = latLonToVector3(targetSite.lat, targetSite.lon, 2.75);
    setFocusPreset((prev) => ({
      id: (prev?.id ?? 0) + 1,
      position: [pos.x, pos.y, pos.z],
    }));
  };

  return (
    <div className="panel flex h-full min-h-[470px] flex-col overflow-hidden">
      {/* Top Bar: View Switcher & Coordinate Click Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-secondary/90 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('ORBITAL')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              viewMode === 'ORBITAL'
                ? 'bg-cyan/20 text-cyan border border-cyan/60'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Globe2 className="size-3.5" />
            3D Moon Globe
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TERRAIN')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              viewMode === 'TERRAIN'
                ? 'bg-cyan/20 text-cyan border border-cyan/60'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Mountain className="size-3.5" />
            3D Terrain Shadows
          </button>
        </div>

        {viewMode === 'ORBITAL' && (
          <span className="font-mono text-sm text-fg-muted">
            Click Moon surface or preset pin to select site
          </span>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="relative flex-1 min-h-[360px]">
        {!webgl ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-fg-muted">
            WebGL is unavailable in this browser. Use the coordinate inputs to run the solar simulation.
          </div>
        ) : (
          <Canvas shadows camera={{ position: [0.4, -2.5, 1.4], fov: 42 }}>
            <OrbitalMoonScene
              active={viewMode === 'ORBITAL'}
              site={site}
              point={point}
              onPickCoordinates={onPickCoordinates}
              onSelectPresetSite={onSelectPresetSite}
              onHoverCoords={setHoverCoords}
              focusPreset={focusPreset}
            />
            <LocalTerrainShadowScene
              active={viewMode !== 'ORBITAL'}
              site={site}
              point={point}
              useTerrainHorizon={useTerrainHorizon}
            />
          </Canvas>
        )}

        {/* Top-left Live Cursor & Sub-Solar Telemetry HUD */}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="rounded border border-line-strong bg-bg/85 px-2.5 py-1.5 font-mono text-sm backdrop-blur">
            <span className="text-warning flex items-center gap-1.5">
              <Sun className="size-3.5" />
              Sub-Solar: {point.subSolarLatDeg.toFixed(2)}°, {point.subSolarLonDeg.toFixed(1)}°
            </span>
          </div>
          {hoverCoords && viewMode === 'ORBITAL' && (
            <div className="rounded border border-cyan/50 bg-bg/85 px-2.5 py-1 font-mono text-sm text-cyan backdrop-blur">
              Cursor: {hoverCoords.lat.toFixed(2)}°, {hoverCoords.lon.toFixed(2)}° (click to set site)
            </div>
          )}
          {viewMode !== 'ORBITAL' && (
            <div className="rounded border border-line-strong bg-bg/85 px-2.5 py-1 font-mono text-sm text-fg-muted backdrop-blur">
              3D Terrain Shadows • {useTerrainHorizon ? 'LOLA Horizon Mask Active' : 'Flat 0° Horizon'}
            </div>
          )}
        </div>

        {/* Bottom Camera Controls */}
        {viewMode === 'ORBITAL' && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() =>
                  setFocusPreset((p) => ({ id: (p?.id ?? 0) + 1, position: [0.4, -2.5, 1.4] }))
                }
                className="btn py-1 px-2 text-sm"
              >
                <Compass className="size-3" /> South Pole
              </button>
              <button
                type="button"
                onClick={() => focusOnSite(site)}
                className="btn py-1 px-2 text-sm border-cyan/50 text-cyan"
              >
                <Eye className="size-3" /> Focus Site
              </button>
              <button
                type="button"
                onClick={() =>
                  setFocusPreset((p) => ({ id: (p?.id ?? 0) + 1, position: [0, 0.3, 3.0] }))
                }
                className="btn py-1 px-2 text-sm"
              >
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
            <div className="rounded border border-line bg-bg/80 px-2 py-1 font-mono text-xs text-fg-muted">
              Drag: Rotate • Scroll: Zoom • Click Moon/Pins: Select Site
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
