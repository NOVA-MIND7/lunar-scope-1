import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { LandingSite } from '../data/landingSites';
import {
  type CommsMode,
  type EphemerisPoint,
  getTerrainElevationAtAzimuth,
} from '../utils/lunarPhysics';

interface Props {
  site: LandingSite;
  point: EphemerisPoint;
  commsMode: CommsMode;
}

function azElToVector3(azDeg: number, elDeg: number, radius: number): THREE.Vector3 {
  const azRad = (azDeg * Math.PI) / 180;
  const elRad = (elDeg * Math.PI) / 180;
  const horiz = radius * Math.cos(elRad);
  return new THREE.Vector3(
    horiz * Math.sin(azRad),
    radius * Math.sin(elRad),
    -horiz * Math.cos(azRad)
  );
}

export default function Lunar3DView({ site, point, commsMode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const fallbackTerrainRef = useRef<THREE.Mesh | null>(null);
  const fallbackGeoRef = useRef<THREE.PlaneGeometry | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunSphereRef = useRef<THREE.Mesh | null>(null);
  const sunBeamRef = useRef<THREE.Line | null>(null);
  const earthLineRef = useRef<THREE.Line | null>(null);
  const relayGroupRef = useRef<THREE.Group | null>(null);
  const relayBeamRef = useRef<THREE.Line | null>(null);

  const [usingNasaObj, setUsingNasaObj] = useState<boolean>(false);
  const [cameraAngle, setCameraAngle] = useState<number>(35);
  const [cameraPitch, setCameraPitch] = useState<number>(32);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef({ x: 0, y: 0, az: 35, pitch: 32 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = 290;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060d1f');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Earthshine ambient fill so shadowed crater floors remain readable
    const hemiLight = new THREE.HemisphereLight('#94a3b8', '#1e293b', 1.1);
    scene.add(hemiLight);

    // Fallback Procedural Terrain (hidden automatically once /models/south_pole.obj loads)
    const terrainGeo = new THREE.PlaneGeometry(100, 100, 80, 80);
    terrainGeo.rotateX(-Math.PI / 2);
    fallbackGeoRef.current = terrainGeo;

    const terrainMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    const fallbackMesh = new THREE.Mesh(terrainGeo, terrainMat);
    fallbackMesh.receiveShadow = true;
    fallbackMesh.castShadow = true;
    fallbackTerrainRef.current = fallbackMesh;
    scene.add(fallbackMesh);

    // Attempt to load Real NASA Moon Trek .OBJ Terrain Model from /public/models/south_pole.obj
    const loader = new OBJLoader();
    loader.load(
      '/models/south_pole.obj',
      (obj) => {
        // Auto-center and scale the NASA Moon Trek mesh to a 70x70 unit arena
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxHoriz = Math.max(size.x, size.z) || 1;
        const scale = 70 / maxHoriz;
        obj.scale.set(scale, scale, scale);

        // Recompute bounding box after scaling so top surface sits near y = 0
        const scaledBox = new THREE.Box3().setFromObject(obj);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);
        obj.position.set(-scaledCenter.x, -scaledBox.max.y + 1.2, -scaledCenter.z);

        const lunarRegolithMat = new THREE.MeshStandardMaterial({
          color: '#9ca3af',
          roughness: 0.92,
          metalness: 0.04,
        });

        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = lunarRegolithMat;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        scene.add(obj);
        if (fallbackTerrainRef.current) {
          fallbackTerrainRef.current.visible = false;
        }
        setUsingNasaObj(true);
      },
      undefined,
      () => {
        // Keep fallback procedural terrain if south_pole.obj is not yet added
        setUsingNasaObj(false);
      }
    );

    // Compass Ring & North Pointer
    const ringGeo = new THREE.RingGeometry(15.5, 15.8, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        side: THREE.DoubleSide,
        opacity: 0.45,
        transparent: true,
      })
    );
    ringMesh.position.y = 0.25;
    scene.add(ringMesh);

    const northCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 2.2, 4),
      new THREE.MeshBasicMaterial({ color: '#f43f5e' })
    );
    northCone.rotation.x = -Math.PI / 2;
    northCone.position.set(0, 0.6, -16.5);
    scene.add(northCone);

    // Lander Model at Center
    const landerGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.0, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.6, roughness: 0.3 })
    );
    body.position.y = 1.0;
    body.castShadow = true;
    landerGroup.add(body);

    const solarPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2.2, 1.5),
      new THREE.MeshStandardMaterial({
        color: '#2563eb',
        emissive: '#1e3a8a',
        emissiveIntensity: 0.4,
      })
    );
    solarPanel.position.y = 2.5;
    solarPanel.castShadow = true;
    landerGroup.add(solarPanel);
    scene.add(landerGroup);

    // Directional Sunlight
    const sunLight = new THREE.DirectionalLight('#fef08a', 2.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    const sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#fde047' })
    );
    sunSphereRef.current = sunSphere;
    scene.add(sunSphere);

    const sunBeam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 2.5, 0),
        new THREE.Vector3(0, 10, 30),
      ]),
      new THREE.LineBasicMaterial({ color: '#fbbf24' })
    );
    sunBeamRef.current = sunBeam;
    scene.add(sunBeam);

    // Earth Sightline
    const earthLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 2.5, 0),
        new THREE.Vector3(0, 8, -45),
      ]),
      new THREE.LineBasicMaterial({ color: '#38bdf8' })
    );
    earthLineRef.current = earthLine;
    scene.add(earthLine);

    // Orbiting Relay Satellite
    const relayGroup = new THREE.Group();
    const satBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.7 })
    );
    const satWings = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.08, 0.7),
      new THREE.MeshStandardMaterial({ color: '#0ea5e9' })
    );
    relayGroup.add(satBody, satWings);
    relayGroup.position.set(0, 17, 0);
    relayGroupRef.current = relayGroup;
    scene.add(relayGroup);

    const relayBeam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 3.5, 0),
        new THREE.Vector3(0, 17, 0),
      ]),
      new THREE.LineBasicMaterial({ color: '#10b981' })
    );
    relayBeamRef.current = relayBeam;
    scene.add(relayBeam);

    let frameId = 0;
    let angle = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      angle += 0.012;
      if (relayGroupRef.current) {
        relayGroupRef.current.position.x = Math.cos(angle) * 13;
        relayGroupRef.current.position.z = Math.sin(angle) * 13;
        relayGroupRef.current.rotation.y = -angle;
        if (relayBeamRef.current) {
          relayBeamRef.current.geometry.setFromPoints([
            new THREE.Vector3(0, 3.5, 0),
            relayGroupRef.current.position.clone(),
          ]);
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container || !cameraRef.current) return;
      const w = container.clientWidth || 600;
      cameraRef.current.aspect = w / height;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  // Update fallback terrain height if no external .OBJ is loaded
  useEffect(() => {
    const geo = fallbackGeoRef.current;
    if (!geo) return;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const azDeg = ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
      const ridgeDeg = getTerrainElevationAtAzimuth(site.terrainMask, azDeg);
      const craterDist = Math.sqrt((x + 10) * (x + 10) + (z - 8) * (z - 8));

      let y = 0;
      if (dist < 4.5) y = 0;
      else if (craterDist < 8.5) {
        const n = craterDist / 8.5;
        y = -3.2 * (1 - n * n);
      } else if (dist <= 16) {
        y = Math.sin(x * 0.35) * 0.25 + Math.cos(z * 0.35) * 0.25;
      } else {
        const rimFactor = Math.min(1, (dist - 16) / 20);
        y = ridgeDeg * 2.1 * rimFactor + Math.sin(x * 0.25) * 0.5;
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, [site]);

  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    const radAz = (cameraAngle * Math.PI) / 180;
    const radEl = (cameraPitch * Math.PI) / 180;
    const r = 34;
    cam.position.set(
      r * Math.cos(radEl) * Math.sin(radAz),
      Math.max(5, r * Math.sin(radEl)),
      r * Math.cos(radEl) * Math.cos(radAz)
    );
    cam.lookAt(0, 1.5, 0);
  }, [cameraAngle, cameraPitch]);

  useEffect(() => {
    const sunVec = azElToVector3(point.sunAz, Math.max(-2, point.sunEl), 48);
    if (sunLightRef.current && sunSphereRef.current && sunBeamRef.current) {
      sunLightRef.current.position.copy(sunVec);
      sunLightRef.current.intensity = point.isSunlit ? 2.6 : 0.35;
      sunSphereRef.current.position.copy(sunVec);
      (sunSphereRef.current.material as THREE.MeshBasicMaterial).color.set(
        point.isSunlit ? '#fde047' : '#ef4444'
      );
      sunBeamRef.current.geometry.setFromPoints([new THREE.Vector3(0, 2.5, 0), sunVec]);
      (sunBeamRef.current.material as THREE.LineBasicMaterial).color.set(
        point.isSunlit ? '#fbbf24' : '#ef4444'
      );
    }

    if (earthLineRef.current) {
      const earthVec = azElToVector3(point.earthAz, point.earthEl, 48);
      earthLineRef.current.geometry.setFromPoints([new THREE.Vector3(0, 2.5, 0), earthVec]);
      (earthLineRef.current.material as THREE.LineBasicMaterial).color.set(
        point.hasDirectEarth ? '#38bdf8' : '#f43f5e'
      );
    }

    if (relayGroupRef.current && relayBeamRef.current) {
      const showSat = commsMode !== 'DTE_ONLY';
      relayGroupRef.current.visible = showSat;
      relayBeamRef.current.visible = showSat && point.hasOrbitalRelay;
    }
  }, [point, commsMode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">
              3D Landing Site Terrain & Shadows
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                usingNasaObj
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {usingNasaObj ? 'NASA MOON TREK .OBJ MESH ACTIVE' : 'LOLA DEM PROCEDURAL MESH'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Drag to rotate • Red arrow = North (Earth side)
          </p>
        </div>

        <div className="flex gap-1.5 text-xs">
          <button
            onClick={() => {
              setCameraAngle(35);
              setCameraPitch(32);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            3D Angle
          </button>
          <button
            onClick={() => {
              setCameraAngle(0);
              setCameraPitch(75);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            Top Map
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          dragStartRef.current = { x: e.clientX, y: e.clientY, az: cameraAngle, pitch: cameraPitch };
        }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          const dx = e.clientX - dragStartRef.current.x;
          const dy = e.clientY - dragStartRef.current.y;
          setCameraAngle((dragStartRef.current.az - dx * 0.5 + 360) % 360);
          setCameraPitch(Math.max(10, Math.min(82, dragStartRef.current.pitch + dy * 0.35)));
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        className="w-full h-[290px] rounded-lg overflow-hidden border border-slate-800 cursor-grab active:cursor-grabbing"
      />

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          Sun Line ({point.isSunlit ? 'Clear' : 'Blocked by Ridge'})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
          Earth Line ({point.hasDirectEarth ? 'Clear' : 'Blocked by Ridge'})
        </span>
        {commsMode !== 'DTE_ONLY' && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            Relay Satellite Link
          </span>
        )}
      </div>
    </div>
  );
}