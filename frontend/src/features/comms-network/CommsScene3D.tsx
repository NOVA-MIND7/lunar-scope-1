import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Stars, useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { TEXTURE_YAW } from '@/utils/lunarCoordinates';
import { isWebGLAvailable } from '@/utils/webgl';
import { useMoonTextures } from '../lunar-explorer/globe/useMoonTextures';
import {
  BAND_SPECS,
  EARTH_CENTER,
  EARTH_RADIUS_SCENE,
  MOON_CENTER,
  MOON_RADIUS_SCENE,
  stepCommsFrame,
  type CommsFrameState,
  type CommsSimConfig,
} from './commsEngine';

export type CommsCameraFocus = 'overview' | 'moon' | 'earth';

interface CommsScene3DProps {
  config: CommsSimConfig;
  isPlaying: boolean;
  speedMultiplier: number;
  simTimeRef: React.MutableRefObject<number>;
  packetBurstTick: number;
  cameraFocus: { id: number; target: CommsCameraFocus };
  showLabels: boolean;
  onFrameSample: (frame: CommsFrameState) => void;
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
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/** Moon surface textured sphere aligned so lon 0° faces +X (Earth). */
function CislunarMoonMesh() {
  const { textures } = useMoonTextures();
  return (
    <group position={[MOON_CENTER[0], MOON_CENTER[1], MOON_CENTER[2]]} rotation={[0, Math.PI / 2, 0]}>
      <mesh rotation={[0, TEXTURE_YAW, 0]} receiveShadow castShadow>
        <sphereGeometry args={[MOON_RADIUS_SCENE, 56, 56]} />
        {textures ? (
          <meshStandardMaterial
            key="moon-textured"
            map={textures.map}
            bumpMap={textures.bump}
            bumpScale={0.042}
            roughness={textures.bump ? 0.92 : 0.85}
            metalness={0.04}
          />
        ) : (
          <meshStandardMaterial key="moon-placeholder" color="#6f7785" roughness={0.9} metalness={0.04} />
        )}
      </mesh>
    </group>
  );
}

/** Earth surface textured sphere with clouds + Rayleigh blue glow rim. */
function CislunarEarthMesh({ spinRef }: { spinRef: React.RefObject<THREE.Group | null> }) {
  const [colorTex, setColorTex] = useState<THREE.Texture | null>(null);
  const [cloudTex, setCloudTex] = useState<THREE.Texture | null>(null);

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

  return (
    <group position={[EARTH_CENTER[0], EARTH_CENTER[1], EARTH_CENTER[2]]}>
      {/* Earth axial tilt (23.5°) matching earthLatLonToWorld */}
      <group rotation={[(23.5 * Math.PI) / 180, 0, 0]}>
        <group ref={spinRef} rotation={[0, -Math.PI * 0.35, 0]}>
          <mesh rotation={[0, TEXTURE_YAW, 0]} receiveShadow castShadow>
            <sphereGeometry args={[EARTH_RADIUS_SCENE, 48, 48]} />
            {colorTex ? (
              <meshStandardMaterial map={colorTex} roughness={0.62} metalness={0.08} />
            ) : (
              <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
            )}
          </mesh>
          <mesh rotation={[0, TEXTURE_YAW, 0]}>
            <sphereGeometry args={[EARTH_RADIUS_SCENE * 1.016, 40, 40]} />
            {cloudTex ? (
              <meshStandardMaterial
                map={cloudTex}
                transparent
                opacity={0.55}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            ) : (
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            )}
          </mesh>
        </group>

        {/* Atmospheric blue glow */}
        <mesh>
          <sphereGeometry args={[EARTH_RADIUS_SCENE * 1.045, 32, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Procedural 3D Lunar Rover with 6 wheels, solar deck, camera mast & steerable dish. */
function LunarRoverModel({ linkUp }: { linkUp: boolean }) {
  return (
    <group scale={0.9}>
      {/* Chassis */}
      <mesh position={[0, 0.045, 0]} castShadow>
        <boxGeometry args={[0.11, 0.036, 0.14]} />
        <meshStandardMaterial color="#eab308" metalness={0.82} roughness={0.25} />
      </mesh>
      {/* Top Solar Panel Deck */}
      <mesh position={[0, 0.068, -0.01]}>
        <boxGeometry args={[0.14, 0.008, 0.11]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.75} roughness={0.2} />
      </mesh>
      {/* Camera Mast */}
      <mesh position={[0, 0.105, 0.045]}>
        <cylinderGeometry args={[0.007, 0.009, 0.085, 10]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.15, 0.05]}>
        <boxGeometry args={[0.036, 0.02, 0.022]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* High-Gain Dish Antenna */}
      <group position={[-0.025, 0.11, -0.035]} rotation={[0.45, 0, -0.25]}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.042, 0.022, 18, 1, true]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.15} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.022, 0]}>
          <sphereGeometry args={[0.009, 10, 10]} />
          <meshBasicMaterial color={linkUp ? '#22c55e' : '#f59e0b'} />
        </mesh>
      </group>
      {/* 6 Titanium Wheels */}
      {[-0.065, 0.065].map((x) =>
        [-0.05, 0, 0.05].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.02, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.016, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.35} />
          </mesh>
        )),
      )}
      {/* Ground Footprint Ring */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.11, 0.145, 28]} />
        <meshBasicMaterial
          color={linkUp ? '#22c55e' : '#f59e0b'}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Reuse project's cassini.glb for Lunar Relay Satellites with procedural fallback. */
function CassiniMesh() {
  const url = `${import.meta.env.BASE_URL}models/cassini.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(url);
  const cloned = useMemo(() => {
    const c = gltf.scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
      }
    });
    return c;
  }, [gltf.scene]);
  return <primitive object={cloned} scale={0.00038} position={[0, -0.05, 0]} />;
}

function LunarSatFallback({ active }: { active: boolean }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.08, 0.11, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.13, 0, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.008]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.13, 0, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.008]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.075, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.055, 0.024, 18, 1, true]} />
        <meshStandardMaterial
          color={active ? '#00d9ff' : '#f8fafc'}
          metalness={0.85}
          roughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Reuse project's satellite.obj for Earth Relay Satellites with procedural fallback. */
function EarthRelayObjMesh() {
  const url = `${import.meta.env.BASE_URL}models/satellite.obj`.replace(/\/+/g, '/');
  const obj = useLoader(OBJLoader, url);
  const cloned = useMemo(() => {
    const c = obj.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.name.includes('Placas')) {
          mesh.material = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.85, roughness: 0.2 });
        } else if (mesh.name.includes('Couro')) {
          mesh.material = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.85, roughness: 0.25 });
        } else {
          mesh.material = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.82, roughness: 0.2 });
        }
      }
    });
    return c;
  }, [obj]);
  return <primitive object={cloned} scale={0.028} position={[-0.02, 0, 0]} />;
}

function EarthSatFallback() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.09, 0.09, 0.09]} />
        <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0.16, 0, 0]}>
        <boxGeometry args={[0.18, 0.07, 0.008]} />
        <meshStandardMaterial color="#2563eb" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.16, 0, 0]}>
        <boxGeometry args={[0.18, 0.07, 0.008]} />
        <meshStandardMaterial color="#2563eb" metalness={0.75} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** Reuse project's dsn_dish.glb for Earth 70m Deep Space Network Base Dishes. */
function DsnDishGLBMesh() {
  const url = `${import.meta.env.BASE_URL}models/dsn_dish.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(url);
  const cloned = useMemo(() => {
    const c = gltf.scene.clone(true);
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: '#f8fafc',
          metalness: 0.35,
          roughness: 0.25,
          side: THREE.DoubleSide,
        });
      }
    });
    return c;
  }, [gltf.scene]);
  const scale = 0.0052;
  return <primitive object={cloned} scale={scale} position={[0, 16.42 * scale, 0]} />;
}

function DsnDishFallback() {
  return (
    <group position={[0, 0.09, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.07, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[0.45, 0, 0]}>
        <coneGeometry args={[0.15, 0.05, 24, 1, true]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Camera controller that moves smoothly on preset button clicks while allowing free user orbiting. */
function CameraController({
  focus,
}: {
  focus: { id: number; target: CommsCameraFocus };
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const animGoal = useRef<{ pos: THREE.Vector3; look: THREE.Vector3; active: boolean }>({
    pos: new THREE.Vector3(0, 4.8, 24.5),
    look: new THREE.Vector3(0, 0, 0),
    active: false,
  });

  useEffect(() => {
    if (focus.id === 0) return;
    if (focus.target === 'moon') {
      animGoal.current = {
        pos: new THREE.Vector3(MOON_CENTER[0] + 2.4, 2.0, 5.2),
        look: new THREE.Vector3(...MOON_CENTER),
        active: true,
      };
    } else if (focus.target === 'earth') {
      animGoal.current = {
        pos: new THREE.Vector3(EARTH_CENTER[0] - 2.4, 2.2, 6.4),
        look: new THREE.Vector3(...EARTH_CENTER),
        active: true,
      };
    } else {
      animGoal.current = {
        pos: new THREE.Vector3(0, 4.8, 24.5),
        look: new THREE.Vector3(0, 0, 0),
        active: true,
      };
    }
  }, [focus]);

  useFrame((_, delta) => {
    const goal = animGoal.current;
    if (!goal.active || !controlsRef.current) return;
    const t = Math.min(1, delta * 5);
    camera.position.lerp(goal.pos, t);
    controlsRef.current.target.lerp(goal.look, t);
    controlsRef.current.update();
    if (camera.position.distanceTo(goal.pos) < 0.04) {
      goal.active = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={2.2}
      maxDistance={44}
      onStart={() => {
        animGoal.current.active = false;
      }}
    />
  );
}

const MAX_PACKETS = 9;
const MAX_HOPS = 4;

/** Inner 3D stage driven at 60 FPS via useFrame with throttled React telemetry snapshots. */
function CommsStage({
  config,
  isPlaying,
  speedMultiplier,
  simTimeRef,
  packetBurstTick,
  cameraFocus,
  showLabels,
  onFrameSample,
}: CommsScene3DProps) {
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const earthSpinGroupRef = useRef<THREE.Group>(null);
  const roverGroupRef = useRef<THREE.Group>(null);
  const lunarSatRefs = useRef<Array<THREE.Group | null>>([]);
  const earthSatRefs = useRef<Array<THREE.Group | null>>([]);
  const dsnDishRefs = useRef<Array<THREE.Group | null>>([]);
  const packetRefs = useRef<Array<THREE.Mesh | null>>([]);
  const hopLineObjs = useRef<THREE.Line[]>([]);

  const lastUiSyncRef = useRef(-1);
  const packetPhaseRef = useRef(0);
  const burstBoostRef = useRef(0);

  // Track count-level state to mount satellite/dish instances cleanly
  const [linkUpUi, setLinkUpUi] = useState(true);
  const [initialFrame, setInitialFrame] = useState<CommsFrameState>(() =>
    stepCommsFrame(config, simTimeRef.current),
  );

  // Sync structural changes immediately (e.g. changing sat count, dish toggles, rover coords)
  useEffect(() => {
    const frame = stepCommsFrame(config, simTimeRef.current);
    setInitialFrame(frame);
    setLinkUpUi(frame.linkUp);
    onFrameSample(frame);
    lastUiSyncRef.current = -1;
  }, [config, simTimeRef, onFrameSample]);

  useEffect(() => {
    if (packetBurstTick > 0) {
      burstBoostRef.current = 2.0;
    }
  }, [packetBurstTick]);

  // Pre-allocate Three.js Line objects cleanly so hop segments update at 60 FPS without recreating React nodes
  const linePrimitives = useMemo(() => {
    const objs: THREE.Line[] = [];
    for (let i = 0; i < MAX_HOPS; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: i === 0 ? '#22c55e' : '#00d9ff',
        transparent: true,
        opacity: 0.9,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      objs.push(line);
    }
    // Index MAX_HOPS = blocked preview dashed-style red line
    const bGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const bMat = new THREE.LineBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.65,
    });
    const blockedLine = new THREE.Line(bGeo, bMat);
    blockedLine.visible = false;
    objs.push(blockedLine);
    hopLineObjs.current = objs;
    return objs;
  }, []);

  useEffect(() => {
    return () => {
      linePrimitives.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
    };
  }, [linePrimitives]);

  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (isPlaying) {
      simTimeRef.current += dt * speedMultiplier;
      const packetRate = burstBoostRef.current > 0 ? 1.4 : 0.65;
      packetPhaseRef.current = (packetPhaseRef.current + dt * packetRate * Math.max(0.7, Math.sqrt(speedMultiplier))) % 1;
      if (burstBoostRef.current > 0) {
        burstBoostRef.current = Math.max(0, burstBoostRef.current - dt);
      }
    }

    const frame = stepCommsFrame(cfgRef.current, simTimeRef.current);

    // 1. Update Earth mesh spin
    if (earthSpinGroupRef.current) {
      earthSpinGroupRef.current.rotation.y = frame.earthSpinRad - Math.PI * 0.35;
    }

    // 2. Position Rover on Moon surface aligned to outward normal
    const rover = frame.rovers[0];
    if (rover && roverGroupRef.current) {
      roverGroupRef.current.position.set(...rover.position);
      if (rover.normal) {
        tmpVec.set(...rover.normal).normalize();
        tmpQuat.setFromUnitVectors(upVec, tmpVec);
        roverGroupRef.current.quaternion.copy(tmpQuat);
      }
    }

    // 3. Position Lunar Satellites & aim nadir toward Moon center
    frame.lunarSats.forEach((sat, idx) => {
      const grp = lunarSatRefs.current[idx];
      if (!grp) return;
      grp.position.set(...sat.position);
      grp.lookAt(MOON_CENTER[0], MOON_CENTER[1], MOON_CENTER[2]);
    });

    // 4. Position Earth Satellites & aim nadir toward Earth center
    frame.earthSats.forEach((sat, idx) => {
      const grp = earthSatRefs.current[idx];
      if (!grp) return;
      grp.position.set(...sat.position);
      grp.lookAt(EARTH_CENTER[0], EARTH_CENTER[1], EARTH_CENTER[2]);
    });

    // 5. Position Earth Base DSN Dishes aligned to outward Earth normal
    frame.dsnDishes.forEach((dish, idx) => {
      const grp = dsnDishRefs.current[idx];
      if (!grp) return;
      grp.position.set(...dish.position);
      if (dish.normal) {
        tmpVec.set(...dish.normal).normalize();
        tmpQuat.setFromUnitVectors(upVec, tmpVec);
        grp.quaternion.copy(tmpQuat);
      }
    });

    // 6. Update Hop Link Lines
    const bandColor = BAND_SPECS[cfgRef.current.band].color;
    for (let i = 0; i < MAX_HOPS; i++) {
      const line = linePrimitives[i]!;
      const hop = frame.activeHops[i];
      if (hop) {
        line.visible = true;
        const attr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        attr.setXYZ(0, hop.fromPos[0], hop.fromPos[1], hop.fromPos[2]);
        attr.setXYZ(1, hop.toPos[0], hop.toPos[1], hop.toPos[2]);
        attr.needsUpdate = true;
        const mat = line.material as THREE.LineBasicMaterial;
        mat.color.set(i === 0 ? '#22c55e' : i === frame.activeHops.length - 1 ? '#f59e0b' : bandColor);
      } else {
        line.visible = false;
      }
    }

    // Blocked LOS preview line
    const blockedLine = linePrimitives[MAX_HOPS]!;
    if (!frame.linkUp && frame.blockedPreviewHop) {
      blockedLine.visible = true;
      const attr = blockedLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.setXYZ(
        0,
        frame.blockedPreviewHop.fromPos[0],
        frame.blockedPreviewHop.fromPos[1],
        frame.blockedPreviewHop.fromPos[2],
      );
      attr.setXYZ(
        1,
        frame.blockedPreviewHop.toPos[0],
        frame.blockedPreviewHop.toPos[1],
        frame.blockedPreviewHop.toPos[2],
      );
      attr.needsUpdate = true;
    } else {
      blockedLine.visible = false;
    }

    // 7. Animate glowing signal packet pulses sequentially across active hops (Rover -> Lunar Sat -> Earth Sat -> DSN Dish)
    const hopCount = frame.activeHops.length;
    for (let p = 0; p < MAX_PACKETS; p++) {
      const mesh = packetRefs.current[p];
      if (!mesh) continue;
      if (!frame.linkUp || hopCount === 0) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const globalT = (packetPhaseRef.current + p / 3) % 1;
      const scaled = globalT * hopCount;
      const hopIdx = Math.min(hopCount - 1, Math.floor(scaled));
      const localT = scaled - hopIdx;
      const hop = frame.activeHops[hopIdx]!;
      mesh.position.set(
        hop.fromPos[0] + (hop.toPos[0] - hop.fromPos[0]) * localT,
        hop.fromPos[1] + (hop.toPos[1] - hop.fromPos[1]) * localT,
        hop.fromPos[2] + (hop.toPos[2] - hop.fromPos[2]) * localT,
      );
      const pulseScale = burstBoostRef.current > 0 ? 1.45 : 1.0;
      mesh.scale.setScalar(pulseScale);
    }

    // 8. Throttle React UI telemetry callbacks (~8 Hz)
    if (lastUiSyncRef.current < 0 || simTimeRef.current - lastUiSyncRef.current >= 0.12) {
      lastUiSyncRef.current = simTimeRef.current;
      if (frame.linkUp !== linkUpUi) {
        setLinkUpUi(frame.linkUp);
      }
      onFrameSample(frame);
    }
  });

  const activeRover = initialFrame.rovers[0];

  return (
    <>
      <color attach="background" args={['#050912']} />
      <Stars radius={45} depth={30} count={1800} factor={2.5} fade speed={0.2} />
      <ambientLight intensity={0.48} color="#cbd5e1" />
      <directionalLight position={[12, 8, 10]} intensity={1.75} color="#fff7ed" />
      <directionalLight position={[-12, -5, -8]} intensity={0.6} color="#38bdf8" />

      <CameraController focus={cameraFocus} />

      {/* Moon Body */}
      <CislunarMoonMesh />
      {showLabels && (
        <Html position={[MOON_CENTER[0], MOON_RADIUS_SCENE + 0.42, 0]} center zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded border border-cyan/50 bg-bg/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan">
            MOON • R = 1,737 km
          </div>
        </Html>
      )}

      {/* Earth Body */}
      <CislunarEarthMesh spinRef={earthSpinGroupRef} />
      {showLabels && (
        <Html position={[EARTH_CENTER[0], EARTH_RADIUS_SCENE + 0.42, 0]} center zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded border border-blue/60 bg-bg/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue">
            EARTH • ~384,400 km
          </div>
        </Html>
      )}

      {/* Lunar Rover */}
      {activeRover && (
        <group ref={roverGroupRef} position={activeRover.position}>
          <LunarRoverModel linkUp={linkUpUi} />
          {showLabels && (
            <Html position={[0, 0.28, 0]} center zIndexRange={[10, 0]}>
              <div className="pointer-events-none whitespace-nowrap rounded border border-success/60 bg-bg/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-success">
                {activeRover.label}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Lunar Relay Satellites (cassini.glb / procedural) */}
      {initialFrame.lunarSats.map((sat, idx) => (
        <group
          key={sat.id}
          ref={(el) => {
            lunarSatRefs.current[idx] = el;
          }}
          position={sat.position}
        >
          <Suspense fallback={<LunarSatFallback active={sat.active} />}>
            <SceneErrorBoundary fallback={<LunarSatFallback active={sat.active} />}>
              {idx === 0 ? <CassiniMesh /> : <LunarSatFallback active={sat.active} />}
            </SceneErrorBoundary>
          </Suspense>
          {showLabels && (
            <Html position={[0, 0.22, 0]} center zIndexRange={[10, 0]}>
              <div className="pointer-events-none whitespace-nowrap rounded border border-cyan/50 bg-bg/90 px-1.5 py-0.5 font-mono text-[9px] text-cyan">
                {sat.label}
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Earth Relay Satellites (satellite.obj) */}
      {initialFrame.earthSats.map((sat, idx) => (
        <group
          key={sat.id}
          ref={(el) => {
            earthSatRefs.current[idx] = el;
          }}
          position={sat.position}
        >
          <Suspense fallback={<EarthSatFallback />}>
            <SceneErrorBoundary fallback={<EarthSatFallback />}>
              <EarthRelayObjMesh />
            </SceneErrorBoundary>
          </Suspense>
          {showLabels && (
            <Html position={[0, 0.22, 0]} center zIndexRange={[10, 0]}>
              <div className="pointer-events-none whitespace-nowrap rounded border border-cyan/50 bg-bg/90 px-1.5 py-0.5 font-mono text-[9px] text-fg">
                {sat.label}
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Earth Base DSN Dishes (dsn_dish.glb) */}
      {initialFrame.dsnDishes.map((dish, idx) => (
        <group
          key={dish.id}
          ref={(el) => {
            dsnDishRefs.current[idx] = el;
          }}
          position={dish.position}
        >
          <Suspense fallback={<DsnDishFallback />}>
            <SceneErrorBoundary fallback={<DsnDishFallback />}>
              <DsnDishGLBMesh />
            </SceneErrorBoundary>
          </Suspense>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.09, 0.145, 24]} />
            <meshBasicMaterial color="#00d9ff" transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
          {showLabels && (
            <Html position={[0, 0.26, 0]} center zIndexRange={[10, 0]}>
              <div className="pointer-events-none whitespace-nowrap rounded border border-warning/60 bg-bg/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-warning">
                {dish.label}
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Dynamic Multi-Hop Communication Link Lines */}
      {linePrimitives.map((lineObj, i) => (
        <primitive key={`hop-line-${i}`} object={lineObj} />
      ))}

      {/* Animated Travelling Data Packets */}
      {Array.from({ length: MAX_PACKETS }, (_, p) => (
        <mesh
          key={`pkt-${p}`}
          ref={(el) => {
            packetRefs.current[p] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.062, 12, 12]} />
          <meshBasicMaterial color={p % 2 === 0 ? '#00d9ff' : '#22c55e'} />
        </mesh>
      ))}
    </>
  );
}

export function CommsScene3D(props: CommsScene3DProps) {
  const webglOk = useMemo(() => isWebGLAvailable(), []);

  if (!webglOk) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-card border border-line bg-bg/80 p-6 text-center text-sm text-fg-muted">
        WebGL is unavailable in this browser context. Link telemetry and hop routing remain active below.
      </div>
    );
  }

  return (
    <SceneErrorBoundary
      fallback={
        <div className="flex h-full min-h-[420px] items-center justify-center rounded-card border border-danger/40 bg-bg/80 p-6 text-center text-sm text-danger">
          3D Cislunar view failed to initialize. Adjust telemetry settings below or reload the page.
        </div>
      }
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 4.8, 24.5], fov: 42, near: 0.1, far: 150 }}
        className="h-full w-full"
      >
        <CommsStage {...props} />
      </Canvas>
    </SceneErrorBoundary>
  );
}
