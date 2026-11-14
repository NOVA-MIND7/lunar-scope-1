import { memo, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCursor, useGLTF } from '@react-three/drei';
import { Color, SphereGeometry, type Mesh } from 'three';
import { TEXTURE_YAW, vector3ToLatLon } from '@/utils/lunarCoordinates';
import { MIN_DISTANCE } from './constants';
import { useGlobeStore } from './globeStore';
import { MOON_SMALL_SOURCE } from './moonTextureConfig';
import type { MoonTextureSet } from './useMoonTextures';

const CLICK_DRAG_TOLERANCE_PX = 4;
const CURSOR_THROTTLE_MS = 50;

// moon_small.glb has bounding radius = 1.2718640565872192
// Scale factor to normalize lunar radius to exactly 1.0 (scene units):
const MOON_MODEL_SCALE = 1 / 1.2718640565872192; // 0.786247585

interface SurfaceInteractionProps {
  onSurfaceClick: (e: ThreeEvent<MouseEvent>) => void;
  onSurfaceDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
  onSurfacePointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

/** 3D Moon model loaded from moon_small.glb */
function MoonSmallModel({
  onSurfaceClick,
  onSurfaceDoubleClick,
  onSurfacePointerMove,
  onPointerOver,
  onPointerOut,
}: SurfaceInteractionProps) {
  const modelUrl = `${import.meta.env.BASE_URL}models/moon.glb`.replace(/\/+/g, '/');
  const gltf = useGLTF(modelUrl);
  const eclipseFactor = useGlobeStore((s) => s.eclipseFactor);

  const sceneClone = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = mesh.material as any;
          mat.roughness = 0.92;
          mat.metalness = 0.04;
          mat.needsUpdate = true;
        }
      }
    });
    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    // When Moon passes behind Earth (Lunar Eclipse), only the Moon darkens!
    // factor = 0: normal bright lunar surface (1, 1, 1)
    // factor = 1: deep umbral shadow with dark blood-red tone (0.16, 0.04, 0.04)
    const factor = eclipseFactor;
    const r = Math.max(0.16, 1.0 - factor * 0.84);
    const g = Math.max(0.04, 1.0 - factor * 0.96);
    const b = Math.max(0.04, 1.0 - factor * 0.96);

    sceneClone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mat = (child as Mesh).material as any;
        if (mat && mat.color) {
          mat.color.setRGB(r, g, b);
          mat.needsUpdate = true;
        }
      }
    });
  }, [eclipseFactor, sceneClone]);

  useEffect(() => {
    // Notify the UI that the real 3D Moon model is active
    useGlobeStore.getState().setTextureSource(MOON_SMALL_SOURCE);
  }, []);

  return (
    <primitive
      object={sceneClone}
      scale={MOON_MODEL_SCALE}
      onClick={onSurfaceClick}
      onDoubleClick={onSurfaceDoubleClick}
      onPointerMove={onSurfacePointerMove}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  );
}

/** Procedural sphere fallback if GLTF is loading or in test environments */
function SphereFallback({
  textures,
  onSurfaceClick,
  onSurfaceDoubleClick,
  onSurfacePointerMove,
  onPointerOver,
  onPointerOut,
}: SurfaceInteractionProps & { textures: MoonTextureSet }) {
  const meshRef = useRef<Mesh>(null);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());
  const geometry = useMemo(() => new SphereGeometry(1, 128, 64), []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    textures.map.anisotropy = maxAnisotropy;
    textures.map.needsUpdate = true;
    if (textures.bump) textures.bump.anisotropy = maxAnisotropy;
  }, [textures, maxAnisotropy]);

  const isProcedural = textures.source.kind === 'procedural';
  const eclipseFactor = useGlobeStore((s) => s.eclipseFactor);
  const eclipseColor = useMemo(() => {
    const factor = eclipseFactor;
    return new Color(
      Math.max(0.16, 1.0 - factor * 0.84),
      Math.max(0.04, 1.0 - factor * 0.96),
      Math.max(0.04, 1.0 - factor * 0.96),
    );
  }, [eclipseFactor]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[0, TEXTURE_YAW, 0]}
      onClick={onSurfaceClick}
      onDoubleClick={onSurfaceDoubleClick}
      onPointerMove={onSurfacePointerMove}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial
        map={textures.map}
        bumpMap={textures.bump ?? undefined}
        bumpScale={isProcedural ? 5 : 2}
        roughness={1}
        metalness={0}
        color={eclipseColor}
      />
    </mesh>
  );
}

/** The 3D lunar sphere. Handles surface picking (click, double-click, hover coordinates). */
export const MoonSurface = memo(function MoonSurface({ textures }: { textures: MoonTextureSet }) {
  const lastMove = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'crosshair');

  const handleSurfaceClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > CLICK_DRAG_TOLERANCE_PX) return; // a drag, not a click
    e.stopPropagation();
    useGlobeStore.getState().setFocusTarget('moon');
    const local = e.object.worldToLocal(e.point.clone()).normalize();
    const c = vector3ToLatLon(local);
    useGlobeStore.getState().setPending(c.latitude_deg, c.longitude_deg);
  };

  const handleSurfaceDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useGlobeStore.getState().setFocusTarget('moon');
    const local = e.object.worldToLocal(e.point.clone()).normalize();
    const c = vector3ToLatLon(local);
    const { camera, issueCommand } = useGlobeStore.getState();
    issueCommand({
      kind: 'focus',
      latitude_deg: c.latitude_deg,
      longitude_deg: c.longitude_deg,
      distance: Math.max(MIN_DISTANCE + 0.2, camera.distance * 0.6),
    });
  };

  const handleSurfacePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const now = performance.now();
    if (now - lastMove.current < CURSOR_THROTTLE_MS) return;
    lastMove.current = now;
    const local = e.object.worldToLocal(e.point.clone()).normalize();
    useGlobeStore.getState().setCursor(vector3ToLatLon(local));
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => {
    setHovered(false);
    useGlobeStore.getState().setCursor(null);
  };

  return (
    <Suspense
      fallback={
        <SphereFallback
          textures={textures}
          onSurfaceClick={handleSurfaceClick}
          onSurfaceDoubleClick={handleSurfaceDoubleClick}
          onSurfacePointerMove={handleSurfacePointerMove}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />
      }
    >
      <MoonSmallModel
        onSurfaceClick={handleSurfaceClick}
        onSurfaceDoubleClick={handleSurfaceDoubleClick}
        onSurfacePointerMove={handleSurfacePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </Suspense>
  );
});
