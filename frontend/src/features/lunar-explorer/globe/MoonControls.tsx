import { memo, useEffect, useRef, type ElementRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { MOUSE, Vector3 } from 'three';
import { DEFAULT_DISTANCE, MAX_DISTANCE, MAX_PAN, MIN_DISTANCE, POLAR_MARGIN } from './constants';
import { useGlobeStore, type CameraCommand } from './globeStore';
import {
  clampDistance,
  clampPolar,
  easeInOutCubic,
  focusGoal,
  resetGoal,
  southPoleGoal,
  viewCenter,
  type CameraGoal,
} from './cameraMath';
import { useAppStore } from '@/stores/appStore';
import { computeAstronomicalState } from '@/utils/astronomicalTime';

type Controls = ElementRef<typeof OrbitControls>;

export function getCelestialBodyPosition(
  focusTarget: 'moon' | 'earth' | 'sun',
  timestampMs: number = Date.now(),
): Vector3 {
  if (focusTarget === 'sun') {
    return new Vector3(0, 0, 0);
  }
  const astro = computeAstronomicalState(timestampMs);
  if (focusTarget === 'earth') {
    return new Vector3(...astro.earthPosition);
  }
  return new Vector3(...astro.moonPosition);
}

interface Animation {
  fromDir: Vector3;
  axis: Vector3;
  angle: number;
  fromDist: number;
  toDist: number;
  fromTarget: Vector3;
  toTarget: Vector3;
  t: number;
  duration: number;
}

const TMP = new Vector3();

function startAnimation(camera: { position: Vector3 }, controls: Controls, goal: CameraGoal): Animation | null {
  const rel = TMP.copy(camera.position).sub(controls.target);
  const fromDist = rel.length();
  const fromDir = fromDist > 1e-6 ? rel.clone().normalize() : goal.direction.clone();
  const angle = fromDir.angleTo(goal.direction);
  if (angle < 1e-3 && Math.abs(fromDist - goal.distance) < 1e-3 && controls.target.distanceTo(goal.target) < 1e-3) return null;
  let axis = new Vector3().crossVectors(fromDir, goal.direction);
  if (axis.lengthSq() < 1e-12) axis = Math.abs(fromDir.y) < 0.9 ? new Vector3(0, 1, 0).cross(fromDir) : new Vector3(1, 0, 0).cross(fromDir);
  axis.normalize();
  return {
    fromDir,
    axis,
    angle,
    fromDist: Math.max(fromDist, 0.1),
    toDist: goal.distance,
    fromTarget: controls.target.clone(),
    toTarget: goal.target.clone(),
    t: 0,
    duration: Math.min(1.8, 0.6 + angle * 0.45 + Math.abs(Math.log(goal.distance / Math.max(fromDist, 0.1))) * 0.2),
  };
}

function goalFor(command: CameraCommand, camera: { position: Vector3 }, controls: Controls, targetPos: Vector3): CameraGoal {
  const state = useGlobeStore.getState();
  const spinAngle = state.moonSpinAngle || 0;
  const isMoon = state.focusTarget === 'moon';

  switch (command.kind) {
    case 'reset': {
      const base = resetGoal();
      const dir = isMoon
        ? base.direction.clone().applyAxisAngle(new Vector3(0, 1, 0), spinAngle)
        : base.direction.clone();
      return { direction: clampPolar(dir), distance: base.distance, target: targetPos.clone() };
    }
    case 'southPole': {
      const base = southPoleGoal();
      const dir = isMoon
        ? base.direction.clone().applyAxisAngle(new Vector3(0, 1, 0), spinAngle)
        : base.direction.clone();
      return { direction: clampPolar(dir), distance: base.distance, target: targetPos.clone() };
    }
    case 'focus': {
      const base = focusGoal(command.latitude_deg, command.longitude_deg, camera.position.distanceTo(controls.target), command.distance);
      const dir = isMoon
        ? base.direction.clone().applyAxisAngle(new Vector3(0, 1, 0), spinAngle)
        : base.direction.clone();
      return {
        direction: clampPolar(dir),
        distance: base.distance,
        target: targetPos.clone(),
      };
    }
    case 'zoom': {
      const rel = camera.position.clone().sub(controls.target);
      return { direction: rel.clone().normalize(), distance: clampDistance(rel.length() * command.factor), target: controls.target.clone() };
    }
  }
}

/**
 * OrbitControls wrapper: drag = rotate, wheel = zoom, right-drag = pan, plus smooth camera transitions
 * driven by commands in the globe store. User input always interrupts a transition.
 */
export const MoonControls = memo(function MoonControls({
  targetPos = new Vector3(0, 0, 0),
}: {
  targetPos?: Vector3;
}) {
  const controlsRef = useRef<Controls>(null);
  const animation = useRef<Animation | null>(null);
  const handledCommand = useRef<number>(useGlobeStore.getState().command?.id ?? 0);
  const lastPublished = useRef({ distance: -1, lat: 999, lon: 999, pan: -1, time: 0 });
  const lastTargetPos = useRef<Vector3>(targetPos.clone());
  const camera = useThree((s) => s.camera);

  // Initial pose: only runs once on mount.
  useEffect(() => {
    const site = useAppStore.getState().selectedLandingSite;
    const focusTarget = useGlobeStore.getState().focusTarget;
    const initialTarget = getCelestialBodyPosition(focusTarget, useGlobeStore.getState().activeTimestampMs || Date.now());
    const startDist = focusTarget === 'sun' ? 36.0 : DEFAULT_DISTANCE;
    const goal = site
      ? focusGoal(site.coordinates.latitude_deg, site.coordinates.longitude_deg, startDist)
      : { direction: new Vector3(0, 0.4, 0.9).normalize(), distance: startDist };
    camera.position.copy(initialTarget).addScaledVector(goal.direction, goal.distance);
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialTarget);
    }
    camera.lookAt(initialTarget);
    lastTargetPos.current.copy(initialTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User input cancels any running transition.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => {
      animation.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, []);

  // Camera commands from the UI.
  const command = useGlobeStore((s) => s.command);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!command || !controls || command.id === handledCommand.current) return;
    handledCommand.current = command.id;

    const state = useGlobeStore.getState();
    const resolvedTarget = getCelestialBodyPosition(state.focusTarget, state.activeTimestampMs || Date.now());

    animation.current = startAnimation(camera, controls, goalFor(command, camera, controls, resolvedTarget));
  }, [command, camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const dt = Math.min(delta, 0.05);

    const state = useGlobeStore.getState();
    const currentTarget = getCelestialBodyPosition(state.focusTarget, state.activeTimestampMs || Date.now());

    const a = animation.current;
    if (a) {
      a.toTarget.copy(currentTarget);
      a.t = Math.min(1, a.t + dt / a.duration);
      const e = easeInOutCubic(a.t);
      const dir = a.fromDir.clone().applyAxisAngle(a.axis, a.angle * e);
      const dist = a.fromDist * Math.pow(a.toDist / a.fromDist, e); // log-interpolated zoom feels uniform
      controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
      camera.position.copy(controls.target).addScaledVector(dir, dist);
      if (a.t >= 1) {
        animation.current = null;
        lastTargetPos.current.copy(currentTarget);
      }
    } else {
      // Track focused body movement when idle
      const targetDelta = currentTarget.clone().sub(lastTargetPos.current);
      if (targetDelta.lengthSq() > 1e-6) {
        camera.position.add(targetDelta);
        controls.target.add(targetDelta);
        lastTargetPos.current.copy(currentTarget);
      }
    }

    // Keep rotation gentle when close to the surface, and limit how far the view can be panned off-centre.
    const d = camera.position.distanceTo(controls.target);
    controls.rotateSpeed = 0.12 + 0.55 * Math.min(1, (d - MIN_DISTANCE) / (DEFAULT_DISTANCE - MIN_DISTANCE));
    controls.panSpeed = 0.5 * Math.min(1, d / DEFAULT_DISTANCE);
    const panOffset = controls.target.distanceTo(currentTarget);
    if (panOffset > MAX_PAN) {
      const clamped = controls.target.clone().sub(currentTarget).setLength(MAX_PAN);
      camera.position.add(clamped.clone().sub(controls.target.clone().sub(currentTarget)));
      controls.target.copy(currentTarget).add(clamped);
    }
    controls.update();

    // Publish a throttled camera readout for the UI.
    const now = performance.now();
    const last = lastPublished.current;
    if (now - last.time > 100) {
      const dist = camera.position.distanceTo(controls.target);
      const center = viewCenter(camera.position.clone().sub(controls.target));
      const pan = controls.target.distanceTo(currentTarget);
      if (
        Math.abs(dist - last.distance) > 0.002 ||
        Math.abs(center.latitude_deg - last.lat) > 0.05 ||
        Math.abs(center.longitude_deg - last.lon) > 0.05 ||
        Math.abs(pan - last.pan) > 0.002
      ) {
        lastPublished.current = { distance: dist, lat: center.latitude_deg, lon: center.longitude_deg, pan, time: now };
        useGlobeStore.getState().setCamera({ distance: dist, centerLatitude: center.latitude_deg, centerLongitude: center.longitude_deg, panOffset: pan });
      } else {
        last.time = now;
      }
    }
  });

  const interactionMode = useGlobeStore((s) => s.interactionMode);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      zoomSpeed={0.7}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={POLAR_MARGIN}
      maxPolarAngle={Math.PI - POLAR_MARGIN}
      mouseButtons={{
        LEFT: interactionMode === 'pan' ? MOUSE.PAN : MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: interactionMode === 'pan' ? MOUSE.ROTATE : MOUSE.PAN,
      }}
    />
  );
});
