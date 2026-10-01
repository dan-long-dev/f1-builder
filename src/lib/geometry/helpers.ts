import * as THREE from 'three';
import type { Pt } from './profiles';

export interface MeshOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  name?: string;
}

export function mesh(geom: THREE.BufferGeometry, material: THREE.Material, opts: MeshOptions = {}): THREE.Mesh {
  const m = new THREE.Mesh(geom, material);
  m.castShadow = opts.castShadow ?? true;
  m.receiveShadow = opts.receiveShadow ?? true;
  if (opts.name) m.name = opts.name;
  return m;
}

const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();

/** Capsule between two points. */
export function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, segments = 10): THREE.Mesh {
  _dir.subVectors(b, a);
  const len = _dir.length();
  const geom = new THREE.CapsuleGeometry(radius, Math.max(0.001, len - radius * 2), 4, segments);
  const m = mesh(geom, material);
  _mid.addVectors(a, b).multiplyScalar(0.5);
  m.position.copy(_mid);
  _q.setFromUnitVectors(_up, _dir.normalize());
  m.quaternion.copy(_q);
  return m;
}

/**
 * A flat plate in the car's side plane (z along the length, y up), extruded sideways (x).
 * Points are [z, y]; the plate is centred on `x` with `thickness`.
 */
export function plateZY(points: Pt[], thickness: number, x: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(-z, y)));
  const geom = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 12 });
  geom.rotateY(Math.PI / 2);
  geom.translate(x - thickness / 2, 0, 0);
  geom.computeVertexNormals();
  return mesh(geom, material);
}

/**
 * A flat plate in the ground plane (x across, z along), extruded upwards (y).
 * Points are [x, z]; the plate's underside sits at `y`.
 */
export function plateXZ(points: Pt[], thickness: number, y: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geom = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 12 });
  // shape (x, -z) lies in XY, extruded along +Z. Rotate so shape-y → world -z and extrusion → +y.
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, y, 0);
  geom.computeVertexNormals();
  return mesh(geom, material);
}

/** Mirror a mesh across x=0 as a new mesh sharing the material. */
export function mirrored(src: THREE.Mesh): THREE.Mesh {
  const m = src.clone();
  m.scale.x *= -1;
  m.position.x *= -1;
  return m;
}

/** Rounded-rectangle outline in [u, v] space, counter-clockwise. */
export function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0, segs = 6): Pt[] {
  const pts: Pt[] = [];
  const rr = Math.min(r, w / 2, h / 2);
  const corners: [number, number, number][] = [
    [cx + w / 2 - rr, cy + h / 2 - rr, 0],
    [cx - w / 2 + rr, cy + h / 2 - rr, Math.PI / 2],
    [cx - w / 2 + rr, cy - h / 2 + rr, Math.PI],
    [cx + w / 2 - rr, cy - h / 2 + rr, (3 * Math.PI) / 2],
  ];
  for (const [x, y, start] of corners) {
    for (let i = 0; i <= segs; i++) {
      const a = start + (i / segs) * (Math.PI / 2);
      pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
    }
  }
  return pts;
}

/** Dispose every geometry and material under an object. */
export function disposeObject(root: THREE.Object3D, sharedMaterials: Set<THREE.Material> = new Set()): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (!sharedMaterials.has(m)) m.dispose();
    }
  });
}
