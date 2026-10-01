import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { config } from '../config';
import type { EnvId } from '../catalog';

/**
 * Procedural environments: each preset builds a floor, lights, background/fog and an environment map
 * generated from a small lit scene (no HDRI files). Switching disposes the previous one.
 */
interface EnvHandle {
  group: THREE.Group;
  envMap: THREE.Texture;
  dispose(): void;
}

export class Environments {
  current: EnvId | null = null;
  private handle: EnvHandle | null = null;

  constructor(
    private scene: THREE.Scene,
    private renderer: THREE.WebGLRenderer,
  ) {}

  set(id: EnvId): void {
    if (id === this.current) return;
    this.handle?.dispose();
    this.handle = null;
    this.scene.background = null;
    this.scene.fog = null;
    const build = BUILDERS[id];
    this.handle = build(this.scene, this.renderer);
    this.scene.environment = this.handle.envMap;
    this.scene.add(this.handle.group);
    this.current = id;
  }

  dispose(): void {
    this.handle?.dispose();
    this.handle = null;
    this.current = null;
  }
}

type Builder = (scene: THREE.Scene, renderer: THREE.WebGLRenderer) => EnvHandle;

const BUILDERS: Record<EnvId, Builder> = {
  studio: buildStudio,
  garage: buildGarage,
  track: (scene, renderer) => buildOutdoor(scene, renderer, config.envs.track),
  sunset: (scene, renderer) => buildOutdoor(scene, renderer, config.envs.sunset),
};

/* ---- shared helpers ---- */

function sun(color: string, intensity: number, position: [number, number, number], shadowExtent = 4.5): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  light.castShadow = true;
  light.shadow.mapSize.set(config.render.shadowMapSize, config.render.shadowMapSize);
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 40;
  light.shadow.camera.left = -shadowExtent;
  light.shadow.camera.right = shadowExtent;
  light.shadow.camera.top = shadowExtent;
  light.shadow.camera.bottom = -shadowExtent;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.02;
  return light;
}

function disposeGroup(group: THREE.Group, extra: THREE.Texture[] = []): void {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const map = (m as THREE.MeshStandardMaterial).map;
        map?.dispose();
        m.dispose();
      }
    }
  });
  for (const t of extra) t.dispose();
}

/** Vertical gradient texture for sky domes. */
function gradientTexture(stops: [number, string][]): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft noise texture for asphalt/concrete. */
function noiseTexture(base: string, amount: number, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Environment map from a sky gradient and a bright sun disc. */
function skyEnvMap(renderer: THREE.WebGLRenderer, sky: { top: string; horizon: string; bottom: string }, sunPos: [number, number, number], sunColor: string, sunSize: number): THREE.Texture {
  const scene = new THREE.Scene();
  const grad = gradientTexture([
    [0, sky.top],
    [0.3, '#' + new THREE.Color(sky.top).lerp(new THREE.Color(sky.horizon), 0.55).getHexString()],
    [0.5, sky.horizon],
    [0.52, sky.bottom],
    [1, sky.bottom],
  ]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: grad, side: THREE.BackSide }));
  scene.add(dome);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(sunSize, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(sunColor).multiplyScalar(30) }));
  sunMesh.position.set(...sunPos).normalize().multiplyScalar(40);
  scene.add(sunMesh);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0, 0.1, 100).texture;
  pmrem.dispose();
  dome.geometry.dispose();
  grad.dispose();
  sunMesh.geometry.dispose();
  return tex;
}

/* ---- studio ---- */

function buildStudio(scene: THREE.Scene, renderer: THREE.WebGLRenderer): EnvHandle {
  const s = config.envs.studio;
  const group = new THREE.Group();
  scene.background = new THREE.Color(s.background);
  scene.fog = new THREE.Fog(s.background, ...s.fog);
  scene.environmentIntensity = s.envIntensity;
  renderer.toneMappingExposure = s.exposure;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: s.floor, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const key = sun(s.sun.color, s.sun.intensity, s.sun.position);
  group.add(key, key.target);
  const fill = new THREE.DirectionalLight(s.fill.color, s.fill.intensity);
  fill.position.set(...s.fill.position);
  group.add(fill, new THREE.HemisphereLight(s.hemi.sky, s.hemi.ground, s.hemi.intensity));

  return { group, envMap, dispose: () => disposeGroup(group, [envMap]) };
}

/* ---- pit garage ---- */

function buildGarage(scene: THREE.Scene, renderer: THREE.WebGLRenderer): EnvHandle {
  const s = config.envs.garage;
  const group = new THREE.Group();
  scene.background = new THREE.Color(s.background);
  scene.fog = new THREE.Fog(s.background, ...s.fog);
  scene.environmentIntensity = s.envIntensity;
  renderer.toneMappingExposure = s.exposure;

  // env map from a dark room with light strips, so the car picks up crisp reflections
  const envScene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), new THREE.MeshBasicMaterial({ color: '#1a1b1f', side: THREE.BackSide }));
  room.position.y = 3.5;
  envScene.add(room);
  for (let i = -2; i <= 2; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(12) }));
    strip.position.set(i * 2.2, 3.9, 0);
    envScene.add(strip);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(envScene, 0, 0.1, 50).texture;
  pmrem.dispose();
  envScene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });

  // concrete floor with a painted pit box
  const concrete = noiseTexture(s.floor, 26);
  concrete.repeat.set(12, 12);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.75, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const lineMat = new THREE.MeshStandardMaterial({ color: s.lineColor, roughness: 0.6 });
  const line = (w: number, l: number, x: number, z: number): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.003, z);
    m.receiveShadow = true;
    group.add(m);
  };
  line(0.08, 7.5, 2.1, 0.25);
  line(0.08, 7.5, -2.1, 0.25);
  line(4.28, 0.08, 0, -3.5);
  line(4.28, 0.08, 0, 4.0);
  // visible light strips overhead
  const stripMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 3, roughness: 0.4 });
  for (let i = -2; i <= 2; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 10), stripMat);
    strip.position.set(i * 2.2, 3.9, 0);
    group.add(strip);
  }
  // back wall with a roller door feel
  const wallMat = new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.9 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 5), wallMat);
  wall.position.set(0, 2.5, -9);
  wall.receiveShadow = true;
  group.add(wall);
  const panelMat = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.8, metalness: 0.2 });
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(5, 0.36, 0.05), panelMat);
    p.position.set(0, 0.22 + i * 0.4, -8.95);
    group.add(p);
  }

  const key = sun(s.sun.color, s.sun.intensity, s.sun.position);
  group.add(key, key.target);
  const fill = new THREE.DirectionalLight(s.fill.color, s.fill.intensity);
  fill.position.set(...s.fill.position);
  group.add(fill, new THREE.HemisphereLight(s.hemi.sky, s.hemi.ground, s.hemi.intensity));

  return { group, envMap, dispose: () => disposeGroup(group, [envMap]) };
}

/* ---- outdoor: track and sunset ---- */

interface Outdoor {
  sky: { top: string; horizon: string; bottom: string };
  asphalt: string;
  grass: string;
  sun: { color: string; intensity: number; position: [number, number, number]; size: number };
  hemi: { sky: string; ground: string; intensity: number };
  envIntensity: number;
  exposure: number;
  fog: [string, number, number];
}

function buildOutdoor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, s: Outdoor): EnvHandle {
  const group = new THREE.Group();
  const [fogColor, fogNear, fogFar] = s.fog;
  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
  scene.environmentIntensity = s.envIntensity;
  renderer.toneMappingExposure = s.exposure;

  const envMap = skyEnvMap(renderer, s.sky, s.sun.position, s.sun.color, s.sun.size);

  // visible sky dome: below the horizon it matches the fog so the ground's edge disappears into it
  const mid = new THREE.Color(s.sky.top).lerp(new THREE.Color(s.sky.horizon), 0.55);
  const grad = gradientTexture([
    [0, s.sky.top],
    [0.3, '#' + mid.getHexString()],
    [0.49, s.sky.horizon],
    [0.505, fogColor],
    [1, fogColor],
  ]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24), new THREE.MeshBasicMaterial({ map: grad, side: THREE.BackSide, fog: false, depthWrite: false }));
  group.add(dome);
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(s.sun.size * 0.9, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(s.sun.color).multiplyScalar(4), fog: false }));
  sunDisc.position.set(...s.sun.position).normalize().multiplyScalar(140);
  group.add(sunDisc);

  // asphalt straight with white lines, a kerb and grass beyond
  const asphalt = noiseTexture(s.asphalt, 30);
  asphalt.repeat.set(40, 40);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 300), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.9 }));
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);
  const grassTex = noiseTexture(s.grass, 22);
  grassTex.repeat.set(60, 60);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.01;
  grass.receiveShadow = true;
  group.add(grass);
  const white = new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.7 });
  for (const x of [-6.6, 6.6]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 300), white);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.003, 0);
    line.receiveShadow = true;
    group.add(line);
  }
  const red = new THREE.MeshStandardMaterial({ color: '#c8322b', roughness: 0.7 });
  for (let i = -40; i < 40; i++) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.0), i % 2 ? red : white);
    k.position.set(7.0, 0.015, i * 1.0 + 0.5);
    k.receiveShadow = true;
    group.add(k);
  }

  const key = sun(s.sun.color, s.sun.intensity, s.sun.position, 5);
  group.add(key, key.target, new THREE.HemisphereLight(s.hemi.sky, s.hemi.ground, s.hemi.intensity));

  return { group, envMap, dispose: () => disposeGroup(group, [envMap, grad]) };
}
