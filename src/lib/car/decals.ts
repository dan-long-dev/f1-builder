import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import type { Livery, LogoId, LogoZone, SlotId } from '../catalog';
import { isDark } from './livery';

/**
 * Decal projection: logos and numbers are projected onto whatever surface an anchor ray hits,
 * so they land correctly on every part variant. Each zone names the slot (or 'chassis') it belongs to.
 */
export interface DecalSpec {
  zone: LogoZone | 'number';
  /** which part group the ray may hit; decals are parented to it so they follow it */
  owner: SlotId | 'chassis';
  origin: [number, number, number];
  dir: [number, number, number];
  /** decal width and height in metres */
  size: [number, number];
  /** 'side' keeps the logo upright; 'top' reads from the front of the car */
  up: 'side' | 'top';
  /** projection depth: thin for flat plates so the back face is not painted, deeper for curved bodywork */
  depth?: number;
}

const BODY_DEPTH = 0.3;
const PLATE_DEPTH = 0.02;

export const DECAL_SPECS: DecalSpec[] = [
  { zone: 'sidepod', owner: 'sidepods', origin: [2, 0.4, 0.02], dir: [-1, 0, 0], size: [0.44, 0.17], up: 'side' },
  { zone: 'sidepod', owner: 'sidepods', origin: [-2, 0.4, 0.02], dir: [1, 0, 0], size: [0.44, 0.17], up: 'side' },
  { zone: 'engineCover', owner: 'engineCover', origin: [2, 0.69, -0.85], dir: [-1, 0, 0], size: [0.4, 0.15], up: 'side' },
  { zone: 'engineCover', owner: 'engineCover', origin: [-2, 0.69, -0.85], dir: [1, 0, 0], size: [0.4, 0.15], up: 'side' },
  { zone: 'rearWing', owner: 'rearWing', origin: [2, 0.78, -2.32], dir: [-1, 0, 0], size: [0.34, 0.14], up: 'side', depth: PLATE_DEPTH },
  { zone: 'rearWing', owner: 'rearWing', origin: [-2, 0.78, -2.32], dir: [1, 0, 0], size: [0.34, 0.14], up: 'side', depth: PLATE_DEPTH },
  { zone: 'frontWing', owner: 'frontWing', origin: [2, 0.24, 2.7], dir: [-1, 0, 0], size: [0.26, 0.1], up: 'side', depth: PLATE_DEPTH },
  { zone: 'frontWing', owner: 'frontWing', origin: [-2, 0.24, 2.7], dir: [1, 0, 0], size: [0.26, 0.1], up: 'side', depth: PLATE_DEPTH },
  { zone: 'nose', owner: 'nose', origin: [2, 0.28, 2.3], dir: [-1, 0, 0], size: [0.22, 0.085], up: 'side' },
  { zone: 'nose', owner: 'nose', origin: [-2, 0.28, 2.3], dir: [1, 0, 0], size: [0.22, 0.085], up: 'side' },
  { zone: 'number', owner: 'nose', origin: [0, 2, 2.3], dir: [0, -1, 0], size: [0.18, 0.2], up: 'top' },
  { zone: 'number', owner: 'engineCover', origin: [2, 0.86, -0.15], dir: [-1, 0, 0], size: [0.16, 0.16], up: 'side' },
  { zone: 'number', owner: 'engineCover', origin: [-2, 0.86, -0.15], dir: [1, 0, 0], size: [0.16, 0.16], up: 'side' },
];

const logoCache = new Map<string, Promise<THREE.CanvasTexture>>();
const svgText = new Map<LogoId, Promise<string>>();

async function loadSvg(id: LogoId): Promise<string> {
  let p = svgText.get(id);
  if (!p) {
    p = fetch(`/logos/${id}.svg`).then((r) => {
      if (!r.ok) throw new Error(`logo ${id}: ${r.status}`);
      return r.text();
    });
    svgText.set(id, p);
  }
  return p;
}

/** Rasterise a logo SVG in an ink colour. Cached per (id, ink). */
export function logoTexture(id: LogoId, ink: string): Promise<THREE.CanvasTexture> {
  const key = `${id}|${ink}`;
  let p = logoCache.get(key);
  if (!p) {
    p = loadSvg(id).then(
      (text) =>
        new Promise<THREE.CanvasTexture>((resolve, reject) => {
          const svg = text.replace(/currentColor/g, ink);
          const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 410;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('no 2d context'));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(makeTexture(canvas));
          };
          img.onerror = () => reject(new Error(`logo ${id} failed to rasterise`));
          img.src = url;
        }),
    );
    logoCache.set(key, p);
  }
  return p;
}

const numberCache = new Map<string, THREE.CanvasTexture>();

export function numberTexture(n: number, ink: string): THREE.CanvasTexture {
  const key = `${n}|${ink}`;
  let t = numberCache.get(key);
  if (t) return t;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 400px "Arial Black", Arial, Helvetica, sans-serif';
    ctx.fillText(String(n), 256, 272);
  }
  t = makeTexture(canvas);
  numberCache.set(key, t);
  return t;
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Owns every decal mesh. `refresh` rebuilds the decals that belong to one owner. */
export class Decals {
  private meshes = new Map<DecalSpec, THREE.Mesh>();
  private raycaster = new THREE.Raycaster();
  private livery: Livery | null = null;
  private generation = 0;

  constructor(private resolveOwner: (owner: DecalSpec['owner']) => THREE.Object3D | undefined) {}

  /** Re-project every decal for a livery. */
  async apply(livery: Livery): Promise<void> {
    this.livery = livery;
    await this.refresh();
  }

  /** Rebuild decals for one owner (after a part swap) or for everything. */
  async refresh(owner?: DecalSpec['owner']): Promise<void> {
    const livery = this.livery;
    if (!livery) return;
    const gen = ++this.generation;
    const specs = DECAL_SPECS.filter((s) => !owner || s.owner === owner);
    const built = await Promise.all(specs.map((spec) => this.build(spec, livery)));
    if (gen !== this.generation) {
      for (const m of built) if (m) disposeDecal(m);
      return;
    }
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]!;
      this.remove(spec);
      const m = built[i];
      if (!m) continue;
      const parent = this.resolveOwner(spec.owner);
      if (!parent) {
        disposeDecal(m);
        continue;
      }
      parent.add(m);
      this.meshes.set(spec, m);
    }
  }

  dispose(): void {
    for (const spec of [...this.meshes.keys()]) this.remove(spec);
  }

  private remove(spec: DecalSpec): void {
    const m = this.meshes.get(spec);
    if (!m) return;
    m.removeFromParent();
    disposeDecal(m);
    this.meshes.delete(spec);
  }

  private async build(spec: DecalSpec, livery: Livery): Promise<THREE.Mesh | null> {
    const target = this.resolveOwner(spec.owner);
    if (!target) return null;
    const logoId = spec.zone === 'number' ? null : livery.logos[spec.zone];
    if (spec.zone !== 'number' && !logoId) return null;

    // find the surface
    target.updateWorldMatrix(true, true);
    this.raycaster.set(new THREE.Vector3(...spec.origin), new THREE.Vector3(...spec.dir).normalize());
    const hits = this.raycaster.intersectObject(target, true).filter((h) => h.object instanceof THREE.Mesh && !h.object.userData.decal);
    const hit = hits[0];
    if (!hit || !hit.face) return null;
    const mesh = hit.object as THREE.Mesh;
    const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();

    // ink contrasts with whatever paint is under the decal
    const ink = isDark(surfaceColor(mesh, hit)) ? '#f4f4f2' : '#111113';
    let texture: THREE.Texture;
    if (spec.zone === 'number') {
      texture = numberTexture(livery.number, ink);
    } else {
      try {
        texture = await logoTexture(logoId as LogoId, ink);
      } catch (err) {
        console.warn(err);
        return null;
      }
    }

    // orientation: decal +Z faces out along the normal; +Y is "up" for the artwork
    const z = normal;
    const upHint = spec.up === 'top' ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const x = new THREE.Vector3().crossVectors(upHint, z).normalize();
    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    const m = new THREE.Matrix4().makeBasis(x, y, z);
    const orientation = new THREE.Euler().setFromRotationMatrix(m);

    const [w, h] = spec.size;
    const geom = new DecalGeometry(mesh, hit.point, orientation, new THREE.Vector3(w, h, spec.depth ?? BODY_DEPTH));
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      roughness: 0.45,
      metalness: 0,
    });
    const decal = new THREE.Mesh(geom, material);
    decal.userData.decal = true;
    decal.userData.slot = mesh.userData.slot ?? slotFromParents(mesh);
    decal.castShadow = false;
    decal.receiveShadow = true;
    decal.renderOrder = 1;
    // the decal geometry is in world space; parent it to the owner (identity transform at build time)
    return decal;
  }
}

/** The paint colour at a hit: sampled from a canvas livery if the material has one, else the material colour. */
function surfaceColor(mesh: THREE.Mesh, hit: THREE.Intersection): string {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
  const img = mat.map?.image as HTMLCanvasElement | undefined;
  if (img instanceof HTMLCanvasElement && hit.uv) {
    const ctx = img.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      const x = Math.min(img.width - 1, Math.max(0, Math.floor(hit.uv.x * img.width)));
      const y = Math.min(img.height - 1, Math.max(0, Math.floor((1 - hit.uv.y) * img.height)));
      const d = ctx.getImageData(x, y, 1, 1).data;
      return '#' + [d[0]!, d[1]!, d[2]!].map((v) => v.toString(16).padStart(2, '0')).join('');
    }
  }
  return '#' + mat.color.getHexString();
}

function slotFromParents(o: THREE.Object3D): string | undefined {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (p.userData.slot) return p.userData.slot as string;
    p = p.parent;
  }
  return undefined;
}

function disposeDecal(m: THREE.Mesh): void {
  m.geometry.dispose();
  const mat = m.material as THREE.Material;
  mat.dispose();
}
