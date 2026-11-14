import { memo, useEffect, useMemo } from 'react';
import { AdditiveBlending, BackSide, Color, ShaderMaterial, SphereGeometry, Vector3 } from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Back faces of a slightly larger shell: brightest just outside the limb, fading to nothing at the shell edge.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform float uIntensity;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosW);
    float facing = clamp(abs(dot(normalize(vNormalW), viewDir)) / 0.24, 0.0, 1.0);
    float rim = pow(facing, 1.6);
    float sunSide = smoothstep(-0.35, 0.6, dot(normalize(vPosW), uSun));
    gl_FragColor = vec4(uColor, rim * sunSide * uIntensity);
  }
`;

/**
 * A faint limb highlight. The Moon has NO atmosphere: this is purely a visual aid that separates the
 * silhouette from space, kept subtle and switchable.
 */
export const MoonAtmosphere = memo(function MoonAtmosphere({
  sunDirection,
  intensity = 0.55,
}: {
  sunDirection: readonly [number, number, number];
  intensity?: number;
}) {
  const geometry = useMemo(() => new SphereGeometry(1.03, 64, 32), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uColor: { value: new Color('#7aa7d6') },
          uSun: { value: new Vector3(0, 0, 1) },
          uIntensity: { value: 0.55 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: BackSide,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    (material.uniforms.uSun!.value as Vector3).set(...sunDirection).normalize();
    material.uniforms.uIntensity!.value = intensity;
  }, [material, sunDirection, intensity]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <mesh geometry={geometry} material={material} raycast={() => null} />;
});
