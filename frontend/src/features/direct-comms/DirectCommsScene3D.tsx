import { Component, type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Compass, Eye, Globe2, Mountain, RotateCcw, Sun, Wifi, WifiOff } from 'lucide-react';
import { TEXTURE_YAW, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { isWebGLAvailable } from '@/utils/webgl';
import { useMoonTextures } from '../lunar-explorer/globe/useMoonTextures';
import {
  DC_EARTH_CENTER,
  DC_EARTH_RADIUS,
  DC_MOON_CENTER,
  DC_MOON_RADIUS,
  DIRECT_BANDS,
  stepDirectCommsFrame,
  type DirectCommsConfig,
  type DirectCommsFrame,
} from './directCommsPhysics';

export type DirectViewMode = 'ORBITAL' | 'TERRAIN';
export type DirectCameraPreset = 'overview' | 'moon' | 'earth' | 'south-pole';

interface DirectCommsScene3DProps {
  config: DirectCommsConfig;
  isPlaying: boolean;
  speedHoursPerSec: number;
  simHoursRef: React.MutableRefObject<number>;
  showLabels: boolean;
  cameraRequest: { id: number; target: DirectCameraPreset };
  onSelectSiteCoords: (lat: number, lon: number) => void;
  onFrameUpdate: (frame: DirectCommsFrame) => void;
}

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

const MOON_MODEL_NORM_SCALE = 1 / 1.2718640565872192;
const PACKET_COUNT = 8;

function MoonModelMesh({
  onPointerDown,
  onClick,
}: {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const { textures } = useMoonTextures();
  const modelUrl = `${import.meta.env.BASE_URL}models/moon.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          mat.roughness = 0.92;
          mat.metalness = 0.04;
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  return (
    <Suspense
      fallback={
        <mesh
          rotation={[0, TEXTURE_YAW, 0]}
          castShadow
          receiveShadow
          onPointerDown={onPointerDown}
          onClick={onClick}
        >
          <sphereGeometry args={[DC_MOON_RADIUS, 56, 56]} />
          <meshStandardMaterial
            map={textures?.map ?? null}
            bumpMap={textures?.bump ?? null}
            bumpScale={0.04}
            color={textures ? '#ffffff' : '#64748b'}
            roughness={0.92}
          />
        </mesh>
      }
    >
      <primitive
        object={sceneClone}
        scale={DC_MOON_RADIUS * MOON_MODEL_NORM_SCALE}
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
    </Suspense>
  );
}

function EarthModelMesh({ spinGroupRef }: { spinGroupRef: React.RefObject<THREE.Group | null> }) {
  const [colorTex, setColorTex] = useState<THREE.Texture | null>(null);
  const [cloudTex, setCloudTex] = useState<THREE.Texture | null>(null);
  const modelUrl = `${import.meta.env.BASE_URL}models/earth.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const base = import.meta.env.BASE_URL || '/';
    loader.load(`${base}textures/earth_color.png`.replace(/\/+/g, '/'), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setColorTex(t);
    });
    loader.load(`${base}textures/earth_clouds.png`.replace(/\/+/g, '/'), (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setCloudTex(t);
    });
  }, []);

  const earthClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          mat.roughness = 0.65;
          mat.metalness = 0.08;
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  const earthScale = (DC_EARTH_RADIUS * 2) / 1000;

  return (
    <group position={[DC_EARTH_CENTER[0], DC_EARTH_CENTER[1], DC_EARTH_CENTER[2]]}>
      <group rotation={[(23.5 * Math.PI) / 180, 0, 0]}>
        <group ref={spinGroupRef} rotation={[0, -Math.PI * 0.35, 0]}>
          <Suspense
            fallback={
              <mesh rotation={[0, TEXTURE_YAW, 0]} castShadow receiveShadow>
                <sphereGeometry args={[DC_EARTH_RADIUS, 48, 48]} />
                <meshStandardMaterial map={colorTex} color={colorTex ? '#ffffff' : '#1d4ed8'} roughness={0.65} />
              </mesh>
            }
          >
            <primitive object={earthClone} scale={earthScale} />
          </Suspense>

          <mesh rotation={[0, TEXTURE_YAW, 0]}>
            <sphereGeometry args={[DC_EARTH_RADIUS * 1.016, 40, 40]} />
            {cloudTex ? (
              <meshStandardMaterial
                map={cloudTex}
                transparent
                opacity={0.52}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            ) : (
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            )}
          </mesh>
        </group>

        {/* Atmospheric blue rim */}
        <mesh>
          <sphereGeometry args={[DC_EARTH_RADIUS * 1.045, 32, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function sampleLocalTerrainHeight(
  worldX: number,
  worldZ: number,
  site: DirectCommsConfig['site'],
  useTerrainHorizon: boolean,
): number {
  const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
  const azDeg = ((Math.atan2(worldX, -worldZ) * 180) / Math.PI + 360) % 360;
  const maskIdx = Math.floor(azDeg / 10) % 36;
  const ridgeElDeg = useTerrainHorizon ? (site.terrainMask[maskIdx] ?? 1.5) : 0.15;

  const rimBelt = Math.exp(-Math.pow((distFromCenter - 46) / 16, 2)) * ridgeElDeg * 2.15;
  const craterField =
    Math.sin(worldX * 0.075) * Math.cos(worldZ * 0.075) * 1.45 +
    Math.sin(worldX * 0.15 + 1.2) * Math.sin(worldZ * 0.15 + 0.7) * 0.65;
  const padBlend = Math.min(1, distFromCenter / 10);
  return (rimBelt + craterField) * padBlend;
}

function OrbitalDirectStage({
  active,
  config,
  isPlaying,
  speedHoursPerSec,
  simHoursRef,
  showLabels,
  cameraRequest,
  onSelectSiteCoords,
  onFrameUpdate,
}: DirectCommsScene3DProps & { active: boolean }) {
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const onFrameUpdateRef = useRef(onFrameUpdate);
  onFrameUpdateRef.current = onFrameUpdate;

  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraGoalPosRef = useRef<THREE.Vector3 | null>(null);
  const cameraGoalTargetRef = useRef<THREE.Vector3 | null>(null);

  const sunGroupRef = useRef<THREE.Group>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const umbraConeRef = useRef<THREE.Group>(null);
  const earthSpinRef = useRef<THREE.Group>(null);
  const siteMarkerRef = useRef<THREE.Group>(null);
  const dishRefs = useRef<Array<THREE.Group | null>>([]);
  const packetRefs = useRef<Array<THREE.Mesh | null>>([]);
  const solarBlockRingRef = useRef<THREE.Mesh>(null);
  const pointerDownXY = useRef<{ x: number; y: number } | null>(null);

  const lastUiSyncRef = useRef(-1);
  const packetPhaseRef = useRef(0);
  const [uiFrame, setUiFrame] = useState<DirectCommsFrame>(() => stepDirectCommsFrame(config));

  // Direct RF communication line + blocked preview line + secondary uplink halo line
  const linkLines = useMemo(() => {
    const mkLine = (color: string, opacity: number) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      const l = new THREE.Line(geo, mat);
      l.visible = false;
      return l;
    };
    return {
      primary: mkLine('#22c55e', 0.95),
      secondary: mkLine('#00d9ff', 0.45),
      blocked: mkLine('#ef4444', 0.8),
      sunRay: mkLine('#fde047', 0.35),
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(linkLines).forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
    };
  }, [linkLines]);

  useEffect(() => {
    if (!active) return;
    if (cameraRequest.target === 'moon') {
      cameraGoalPosRef.current = new THREE.Vector3(DC_MOON_CENTER[0] + 0.5, -1.6, 3.6);
      cameraGoalTargetRef.current = new THREE.Vector3(...DC_MOON_CENTER);
    } else if (cameraRequest.target === 'earth') {
      cameraGoalPosRef.current = new THREE.Vector3(DC_EARTH_CENTER[0] - 0.8, 0.9, 4.4);
      cameraGoalTargetRef.current = new THREE.Vector3(...DC_EARTH_CENTER);
    } else if (cameraRequest.target === 'south-pole') {
      cameraGoalPosRef.current = new THREE.Vector3(DC_MOON_CENTER[0] + 0.3, -4.1, 1.5);
      cameraGoalTargetRef.current = new THREE.Vector3(...DC_MOON_CENTER);
    } else {
      cameraGoalPosRef.current = new THREE.Vector3(0, 4.6, 13.8);
      cameraGoalTargetRef.current = new THREE.Vector3(0, 0, 0);
    }
  }, [active, cameraRequest]);

  // Immediate sync when user drags scrubber or changes parameters while paused
  useEffect(() => {
    simHoursRef.current = config.synodicHours;
    const f = stepDirectCommsFrame(config);
    setUiFrame(f);
    onFrameUpdateRef.current(f);
    lastUiSyncRef.current = -1;
  }, [config, simHoursRef]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpNormal = useMemo(() => new THREE.Vector3(), []);
  const tmpVecA = useMemo(() => new THREE.Vector3(), []);
  const tmpVecB = useMemo(() => new THREE.Vector3(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (isPlaying) {
      simHoursRef.current = (simHoursRef.current + dt * speedHoursPerSec) % 708;
    }
    packetPhaseRef.current = (packetPhaseRef.current + dt * 0.65) % 1;

    const frame = stepDirectCommsFrame({
      ...cfgRef.current,
      synodicHours: simHoursRef.current,
    });

    // 1. Move Sun orb & shadow-casting directional light
    if (sunGroupRef.current) {
      sunGroupRef.current.position.set(...frame.sunWorldPos);
    }
    if (sunLightRef.current) {
      sunLightRef.current.position.set(...frame.sunWorldPos);
      // Dim lunar illumination smoothly when Moon enters Earth's umbra shadow cone
      sunLightRef.current.intensity = frame.earthUmbraShadowActive
        ? 2.4 * Math.max(0.18, 1 - frame.eclipseFraction * 0.8)
        : 2.6;
    }

    // Orient Earth Umbra shadow cone opposite the Sun direction when Sun shines behind/near Earth
    if (umbraConeRef.current) {
      tmpDir
        .set(
          DC_EARTH_CENTER[0] - frame.sunWorldPos[0],
          DC_EARTH_CENTER[1] - frame.sunWorldPos[1],
          DC_EARTH_CENTER[2] - frame.sunWorldPos[2],
        )
        .normalize();
      tmpQuat.setFromUnitVectors(upVec, tmpDir);
      umbraConeRef.current.quaternion.copy(tmpQuat);
      // Visible whenever Sun shines generally toward Earth -> Moon hemisphere
      umbraConeRef.current.visible = frame.sunWorldPos[0] > 1.5;
    }

    // 2. Earth axial spin
    if (earthSpinRef.current) {
      earthSpinRef.current.rotation.y = frame.earthSpinRad - Math.PI * 0.35;
    }

    // 3. Position Moon Landing Site Beacon
    if (siteMarkerRef.current) {
      siteMarkerRef.current.position.set(...frame.siteWorldPos);
      tmpNormal.set(...frame.siteNormal).normalize();
      tmpQuat.setFromUnitVectors(upVec, tmpNormal);
      siteMarkerRef.current.quaternion.copy(tmpQuat);
    }

    // 4. Position DSN Dishes on Earth
    frame.dsnDishes.forEach((dish, idx) => {
      const grp = dishRefs.current[idx];
      if (!grp) return;
      grp.position.set(...dish.position);
      tmpNormal.set(...dish.normal).normalize();
      tmpQuat.setFromUnitVectors(upVec, tmpNormal);
      grp.quaternion.copy(tmpQuat);
    });

    // 5. Update Direct Communication Lines & Animated Packets
    const bandColor = DIRECT_BANDS[cfgRef.current.band].color;
    const sitePt = tmpVecA.set(...frame.siteWorldPos);
    const targetDish = frame.activeDish ?? frame.previewDish;

    if (targetDish) {
      const dishPt = tmpVecB.set(...targetDish.position);
      if (frame.linkUp) {
        linkLines.primary.visible = true;
        linkLines.secondary.visible = true;
        linkLines.blocked.visible = false;

        const pAttr = linkLines.primary.geometry.getAttribute('position') as THREE.BufferAttribute;
        pAttr.setXYZ(0, sitePt.x, sitePt.y, sitePt.z);
        pAttr.setXYZ(1, dishPt.x, dishPt.y, dishPt.z);
        pAttr.needsUpdate = true;
        (linkLines.primary.material as THREE.LineBasicMaterial).color.set(bandColor);

        // Subtle curved return path slightly offset for downlink/uplink visual readability
        const sAttr = linkLines.secondary.geometry.getAttribute('position') as THREE.BufferAttribute;
        sAttr.setXYZ(0, sitePt.x, sitePt.y + 0.04, sitePt.z);
        sAttr.setXYZ(1, dishPt.x, dishPt.y + 0.04, dishPt.z);
        sAttr.needsUpdate = true;

        // Flow animated packets Moon <-> Earth
        for (let i = 0; i < PACKET_COUNT; i++) {
          const pkt = packetRefs.current[i];
          if (!pkt) continue;
          pkt.visible = true;
          const t = (packetPhaseRef.current + i / PACKET_COUNT) % 1;
          pkt.position.lerpVectors(sitePt, dishPt, t);
        }
      } else {
        linkLines.primary.visible = false;
        linkLines.secondary.visible = false;
        linkLines.blocked.visible = true;
        const bAttr = linkLines.blocked.geometry.getAttribute('position') as THREE.BufferAttribute;
        bAttr.setXYZ(0, sitePt.x, sitePt.y, sitePt.z);
        bAttr.setXYZ(1, dishPt.x, dishPt.y, dishPt.z);
        bAttr.needsUpdate = true;
        for (let i = 0; i < PACKET_COUNT; i++) {
          const pkt = packetRefs.current[i];
          if (pkt) pkt.visible = false;
        }
      }
    } else {
      linkLines.primary.visible = false;
      linkLines.secondary.visible = false;
      linkLines.blocked.visible = false;
      for (let i = 0; i < PACKET_COUNT; i++) {
        const pkt = packetRefs.current[i];
        if (pkt) pkt.visible = false;
      }
    }

    // Solar Blocking Interference Ring in the Earth-Moon corridor when Sun blocks RF
    if (solarBlockRingRef.current) {
      solarBlockRingRef.current.visible = frame.solarBlockingActive;
      solarBlockRingRef.current.position.set(1.2, frame.sunWorldPos[1] * 0.25, 0);
      solarBlockRingRef.current.rotation.y += dt * 1.4;
    }

    // Subtle Sunlight vector line toward Moon center so moving Sun direction is unmistakable
    const rayAttr = linkLines.sunRay.geometry.getAttribute('position') as THREE.BufferAttribute;
    rayAttr.setXYZ(0, frame.sunWorldPos[0], frame.sunWorldPos[1], frame.sunWorldPos[2]);
    rayAttr.setXYZ(
      1,
      DC_MOON_CENTER[0] + frame.sunUnitFromMoon[0] * (DC_MOON_RADIUS + 0.45),
      DC_MOON_CENTER[1] + frame.sunUnitFromMoon[1] * (DC_MOON_RADIUS + 0.45),
      DC_MOON_CENTER[2] + frame.sunUnitFromMoon[2] * (DC_MOON_RADIUS + 0.45),
    );
    rayAttr.needsUpdate = true;
    linkLines.sunRay.visible = true;

    // Camera animation
    if (active && cameraGoalPosRef.current && cameraGoalTargetRef.current && controlsRef.current) {
      const k = Math.min(1, dt * 5.2);
      camera.position.lerp(cameraGoalPosRef.current, k);
      controlsRef.current.target.lerp(cameraGoalTargetRef.current, k);
      controlsRef.current.update();
      if (camera.position.distanceTo(cameraGoalPosRef.current) < 0.04) {
        cameraGoalPosRef.current = null;
        cameraGoalTargetRef.current = null;
      }
    }

    // Throttle React HUD sync (~8 Hz while playing)
    const nowMs = performance.now();
    if (isPlaying && nowMs - lastUiSyncRef.current > 125) {
      lastUiSyncRef.current = nowMs;
      setUiFrame(frame);
      onFrameUpdateRef.current(frame);
    }
  });

  const handleMoonPointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownXY.current = { x: e.clientX, y: e.clientY };
  };

  const handleMoonClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (pointerDownXY.current) {
      const dist = Math.hypot(
        e.clientX - pointerDownXY.current.x,
        e.clientY - pointerDownXY.current.y,
      );
      if (dist > 5) return;
    }
    // Convert clicked world point back to selenographic lat/lon (undo Moon center & +90° Y offset)
    const localPt = new THREE.Vector3(
      e.point.x - DC_MOON_CENTER[0],
      e.point.y - DC_MOON_CENTER[1],
      e.point.z - DC_MOON_CENTER[2],
    ).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    const c = vector3ToLatLon(localPt);
    onSelectSiteCoords(Number(c.latitude_deg.toFixed(2)), Number(c.longitude_deg.toFixed(2)));
  };

  return (
    <group visible={active}>
      {active && <color attach="background" args={['#040814']} />}
      {active && <Stars radius={55} depth={30} count={2000} factor={2.5} saturation={0} fade />}
      {active && <ambientLight intensity={0.1} color="#94a3b8" />}

      {/* Shadow-casting Moving Sunlight */}
      <directionalLight
        ref={sunLightRef}
        position={uiFrame.sunWorldPos}
        intensity={2.6}
        color={uiFrame.earthUmbraShadowActive ? '#fb923c' : '#fff7ed'}
        castShadow={active}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      {/* Glowing Moving Sun Orb */}
      <group ref={sunGroupRef} position={uiFrame.sunWorldPos}>
        <mesh>
          <sphereGeometry args={[0.72, 28, 28]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.05, 24, 24]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <Html
          position={[0, 1.35, 0]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: 'none', display: active && showLabels ? 'block' : 'none' }}
        >
          <div className="whitespace-nowrap rounded border border-warning/60 bg-bg/90 px-2 py-0.5 font-mono text-xs font-semibold text-warning">
            SUN • Phase {uiFrame.synodicPhaseDeg.toFixed(0)}°
          </div>
        </Html>
      </group>

      {/* Earth Shadow / Eclipse Umbra Cone projected away from the Sun */}
      <group ref={umbraConeRef} position={[DC_EARTH_CENTER[0], DC_EARTH_CENTER[1], DC_EARTH_CENTER[2]]}>
        <mesh position={[0, 6.8, 0]}>
          <cylinderGeometry args={[DC_EARTH_RADIUS * 0.94, DC_EARTH_RADIUS * 0.65, 13.6, 32, 1, true]} />
          <meshBasicMaterial
            color="#020617"
            transparent
            opacity={uiFrame.earthUmbraShadowActive ? 0.68 : 0.34}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Moon Sphere aligned so lon 0° faces Earth (+X) */}
      <group position={[DC_MOON_CENTER[0], DC_MOON_CENTER[1], DC_MOON_CENTER[2]]} rotation={[0, Math.PI / 2, 0]}>
        <MoonModelMesh onPointerDown={handleMoonPointerDown} onClick={handleMoonClick} />
      </group>

      {/* Earth Globe with axial tilt + clouds */}
      <EarthModelMesh spinGroupRef={earthSpinRef} />

      {/* Moon Surface Antenna / Rover Beacon */}
      <group ref={siteMarkerRef} position={uiFrame.siteWorldPos}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.012, 0.018, 0.1, 10]} />
          <meshBasicMaterial color={uiFrame.linkUp ? '#22c55e' : '#ef4444'} />
        </mesh>
        <mesh position={[0, 0.11, 0]}>
          <sphereGeometry args={[0.042, 14, 14]} />
          <meshBasicMaterial color={uiFrame.linkUp ? '#22c55e' : '#ef4444'} />
        </mesh>
        <Html
          position={[0, 0.28, 0]}
          center
          zIndexRange={[8, 0]}
          style={{ pointerEvents: 'none', display: active && showLabels ? 'block' : 'none' }}
        >
          <div className="whitespace-nowrap rounded border border-cyan/60 bg-bg/90 px-1.5 py-0.5 font-mono text-xs text-cyan">
            {config.site.name} ({config.site.lat.toFixed(1)}°, {config.site.lon.toFixed(1)}°)
          </div>
        </Html>
      </group>

      {/* Earth DSN 70m Ground Dishes */}
      {uiFrame.dsnDishes.map((dish, idx) => (
        <group
          key={dish.id}
          ref={(el) => {
            dishRefs.current[idx] = el;
          }}
          position={dish.position}
        >
          <mesh position={[0, 0.06, 0]}>
            <coneGeometry args={[0.065, 0.04, 16, 1, true]} />
            <meshBasicMaterial
              color={dish.active ? '#22c55e' : dish.visible ? '#f59e0b' : '#64748b'}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <sphereGeometry args={[0.034, 12, 12]} />
            <meshBasicMaterial color={dish.active ? '#22c55e' : dish.visible ? '#f59e0b' : '#475569'} />
          </mesh>
          <Html
            position={[0, 0.2, 0]}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: 'none', display: active && showLabels ? 'block' : 'none' }}
          >
            <div
              className={`whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-xs ${
                dish.active
                  ? 'border-success/70 bg-bg/90 text-success'
                  : 'border-warning/50 bg-bg/85 text-warning'
              }`}
            >
              {dish.name}
            </div>
          </Html>
        </group>
      ))}

      {/* Direct Communication Beams + Sun Ray */}
      <primitive object={linkLines.primary} />
      <primitive object={linkLines.secondary} />
      <primitive object={linkLines.blocked} />
      <primitive object={linkLines.sunRay} />

      {/* Animated Direct RF Data Packets */}
      {Array.from({ length: PACKET_COUNT }).map((_, i) => (
        <mesh
          key={`dc-pkt-${i}`}
          ref={(el) => {
            packetRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color={DIRECT_BANDS[config.band].color} />
        </mesh>
      ))}

      {/* Visual Solar Blocking / Conjunction RFI Halo when Sun blocks Direct Line */}
      <mesh ref={solarBlockRingRef} visible={uiFrame.solarBlockingActive} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.68, 0.045, 16, 42]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enabled={active}
        enablePan={false}
        minDistance={3.2}
        maxDistance={26}
        onStart={() => {
          cameraGoalPosRef.current = null;
          cameraGoalTargetRef.current = null;
        }}
      />
    </group>
  );
}

function SurfaceTerrainStage({
  active,
  config,
  frame,
}: {
  active: boolean;
  config: DirectCommsConfig;
  frame: DirectCommsFrame;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const packetPhaseRef = useRef(0);
  const packetRefs = useRef<Array<THREE.Mesh | null>>([]);

  useEffect(() => {
    if (!active) return;
    camera.position.set(0, 22, 42);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 3, 0);
      controlsRef.current.update();
    }
  }, [active, camera]);

  const terrainGeometry = useMemo(() => {
    const size = 150;
    const segs = 100;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, sampleLocalTerrainHeight(pos.getX(i), pos.getZ(i), config.site, config.useTerrainHorizon));
      }
      geo.computeVertexNormals();
    }
    return geo;
  }, [config.site, config.useTerrainHorizon]);

  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);

  // Moving Sun vector in local surface sky (Az/El)
  const sunSkyVec = useMemo(() => {
    const az = (frame.sunAzDeg * Math.PI) / 180;
    const el = (frame.sunElDeg * Math.PI) / 180;
    const d = 120;
    return new THREE.Vector3(
      Math.sin(az) * Math.cos(el) * d,
      Math.max(-18, Math.sin(el) * d),
      -Math.cos(az) * Math.cos(el) * d,
    );
  }, [frame.sunAzDeg, frame.sunElDeg]);

  // Earth sky position above local crater rim (Az/El)
  const earthSkyVec = useMemo(() => {
    const az = (frame.earthAzDeg * Math.PI) / 180;
    const el = (frame.earthElDeg * Math.PI) / 180;
    const d = 92;
    return new THREE.Vector3(
      Math.sin(az) * Math.cos(el) * d,
      Math.max(-12, Math.sin(el) * d),
      -Math.cos(az) * Math.cos(el) * d,
    );
  }, [frame.earthAzDeg, frame.earthElDeg]);

  const dishOrigin = useMemo(() => new THREE.Vector3(0, 3.2, 0), []);

  useFrame((_, delta) => {
    if (!active) return;
    packetPhaseRef.current = (packetPhaseRef.current + Math.min(delta, 0.1) * 0.7) % 1;
    for (let i = 0; i < 6; i++) {
      const m = packetRefs.current[i];
      if (!m) continue;
      if (!frame.linkUp) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const t = (packetPhaseRef.current + i / 6) % 1;
      m.position.lerpVectors(dishOrigin, earthSkyVec, t);
    }
  });

  const isSunVisible =
    frame.illumination === 'SUNLIT';

  return (
    <group visible={active}>
      {active && <color attach="background" args={['#030612']} />}
      {active && <Stars radius={170} depth={45} count={1100} factor={2} saturation={0} fade />}
      {active && <hemisphereLight args={['#cbd5e1', '#0f172a', 0.25]} />}
      {active && (
        <directionalLight
          position={sunSkyVec.toArray()}
          intensity={isSunVisible ? 3.0 : frame.earthUmbraShadowActive ? 0.35 : 0.25}
          color={frame.earthUmbraShadowActive ? '#f97316' : isSunVisible ? '#fffbeb' : '#475569'}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={8}
          shadow-camera-far={270}
          shadow-camera-left={-75}
          shadow-camera-right={75}
          shadow-camera-top={75}
          shadow-camera-bottom={-75}
        />
      )}

      {/* Local Lunar Crater Ridge Terrain */}
      <mesh geometry={terrainGeometry} receiveShadow castShadow>
        <meshStandardMaterial color="#64748b" roughness={0.94} metalness={0.05} />
      </mesh>

      {/* Lander Mast + Direct-to-Earth High-Gain Antenna Dish */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.58, 3.0, 14]} />
          <meshStandardMaterial color="#00d9ff" roughness={0.45} metalness={0.45} />
        </mesh>
        <mesh position={[0, 3.2, 0]} castShadow>
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshBasicMaterial color={frame.linkUp ? '#22c55e' : '#ef4444'} />
        </mesh>
      </group>

      {/* Moving Sun Orb in Sky */}
      <mesh position={sunSkyVec.clone().normalize().multiplyScalar(105)}>
        <sphereGeometry args={[3.4, 24, 24]} />
        <meshBasicMaterial color={isSunVisible ? '#fde047' : '#ef4444'} />
      </mesh>

      {/* Earth in Sky + Glowing Blue Halo */}
      <group position={earthSkyVec}>
        <mesh>
          <sphereGeometry args={[4.6, 28, 28]} />
          <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.45} roughness={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[5.3, 24, 24]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>

      {/* Direct Communication Beam from Antenna to Earth in Sky */}
      <Line
        points={[dishOrigin.toArray(), earthSkyVec.toArray()]}
        color={frame.linkUp ? DIRECT_BANDS[config.band].color : '#ef4444'}
        lineWidth={frame.linkUp ? 2.4 : 1.6}
        dashed={!frame.linkUp}
        dashSize={1.6}
        gapSize={1.2}
      />

      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`terrain-pkt-${i}`}
          ref={(el) => {
            packetRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.55, 10, 10]} />
          <meshBasicMaterial color={DIRECT_BANDS[config.band].color} />
        </mesh>
      ))}

      <OrbitControls
        ref={controlsRef}
        enabled={active}
        enablePan={false}
        minDistance={12}
        maxDistance={98}
        maxPolarAngle={Math.PI / 2 - 0.03}
      />
    </group>
  );
}

export function DirectCommsScene3D(props: DirectCommsScene3DProps) {
  const { config, onFrameUpdate, simHoursRef } = props;
  const webglOk = useMemo(() => isWebGLAvailable(), []);
  const [viewMode, setViewMode] = useState<DirectViewMode>('ORBITAL');
  const [camReq, setCamReq] = useState<{ id: number; target: DirectCameraPreset }>(props.cameraRequest);
  const [hudFrame, setHudFrame] = useState<DirectCommsFrame>(() => stepDirectCommsFrame(config));

  useEffect(() => {
    setCamReq(props.cameraRequest);
  }, [props.cameraRequest]);

  const handleFrame = useCallback(
    (f: DirectCommsFrame) => {
      setHudFrame(f);
      onFrameUpdate(f);
    },
    [onFrameUpdate],
  );

  return (
    <div className="panel flex h-full min-h-[500px] flex-col overflow-hidden">
      {/* Top Bar: View Switcher + Camera Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-bg-secondary/90 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('ORBITAL')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              viewMode === 'ORBITAL'
                ? 'border border-cyan/60 bg-cyan/20 text-cyan'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Globe2 className="size-3.5" />
            3D Earth–Moon Direct Link
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TERRAIN')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              viewMode === 'TERRAIN'
                ? 'border border-warning/60 bg-warning/20 text-warning'
                : 'border border-line text-fg-muted hover:text-fg'
            }`}
          >
            <Mountain className="size-3.5" />
            3D Site Terrain Shadows
          </button>
        </div>

        {viewMode === 'ORBITAL' && (
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                ['overview', 'Full View', RotateCcw],
                ['moon', 'Moon', Eye],
                ['south-pole', 'South Pole', Compass],
                ['earth', 'Earth DSN', Globe2],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCamReq((p) => ({ id: p.id + 1, target: key }))}
                className="btn py-1 px-2 text-sm cursor-pointer"
              >
                <Icon className="size-3" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative flex-1 min-h-[430px] bg-[#040814]">
        {!webglOk ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-fg-muted">
            WebGL is unavailable in this browser context. Sun position and Direct Communication telemetry remain available.
          </div>
        ) : (
          <SceneErrorBoundary
            fallback={
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-danger">
                3D Direct Communication visualizer encountered a WebGL error.
              </div>
            }
          >
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 4.6, 13.8], fov: 42 }}>
              <OrbitalDirectStage
                {...props}
                active={viewMode === 'ORBITAL'}
                cameraRequest={camReq}
                simHoursRef={simHoursRef}
                onFrameUpdate={handleFrame}
              />
              <SurfaceTerrainStage
                active={viewMode === 'TERRAIN'}
                config={config}
                frame={hudFrame}
              />
            </Canvas>
          </SceneErrorBoundary>
        )}

        {/* Top-Left Live Link + Shadow HUD Badges */}
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
          <span
            className={`badge backdrop-blur ${
              hudFrame.linkUp
                ? 'border-success/60 bg-bg/90 text-success'
                : 'border-danger/60 bg-bg/90 text-danger'
            }`}
          >
            {hudFrame.linkUp ? <Wifi className="mr-1 size-3" /> : <WifiOff className="mr-1 size-3" />}
            {hudFrame.linkStatusLabel}
          </span>
          <span
            className={`badge backdrop-blur ${
              hudFrame.illumination === 'SUNLIT'
                ? 'border-warning/60 bg-bg/90 text-warning'
                : 'border-line-strong bg-bg/90 text-cyan'
            }`}
          >
            <Sun className="mr-1 size-3" />
            {hudFrame.illumination.replace(/_/g, ' ')}
            {hudFrame.earthUmbraShadowActive ? ' • Earth Shadow' : ''}
          </span>
        </div>

        {/* Bottom Legend */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3 rounded border border-line bg-bg/85 px-3 py-1.5 font-mono text-xs text-fg-muted backdrop-blur">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-success" /> Direct RF Beam (Up)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-danger" /> Blocked (Sun / Horizon / Dish)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-warning" /> Moving Sun &amp; Shadows
            </span>
          </div>
          <div className="rounded border border-line bg-bg/85 px-2.5 py-1 font-mono text-xs text-fg-muted backdrop-blur">
            {viewMode === 'ORBITAL'
              ? 'Drag: Rotate • Scroll: Zoom • Click Moon: Select Site'
              : 'Drag: Look around Lunar Ridge • Scroll: Zoom'}
          </div>
        </div>
      </div>
    </div>
  );
}
