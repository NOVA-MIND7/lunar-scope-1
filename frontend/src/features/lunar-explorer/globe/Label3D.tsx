import { useRef, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Vector3Tuple } from 'three';

/** HTML label anchored to a point on the Moon that hides itself when the point is over the horizon. */
export function Label3D({ position, children, className = '' }: { position: Vector3Tuple; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    const el = ref.current;
    if (!el) return;
    const [x, y, z] = position;
    const len = Math.hypot(x, y, z) || 1;
    // A point is visible from the camera if the camera is beyond the tangent plane at that point.
    const visible = (camera.position.x * x + camera.position.y * y + camera.position.z * z) / len > len * 0.98;
    el.style.opacity = visible ? '1' : '0';
  });
  return (
    <Html position={position} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={ref}
        className={`whitespace-nowrap rounded border border-line-strong bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-fg shadow transition-opacity ${className}`}
      >
        {children}
      </div>
    </Html>
  );
}
