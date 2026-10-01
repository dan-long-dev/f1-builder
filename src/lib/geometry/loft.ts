import * as THREE from 'three';
import { section, signedArea, type Pt, type SectionSpec } from './profiles';

/** One cross-section of a loft: 2D points in the station's local XY plane and the station's frame. */
export interface Station {
  points: Pt[];
  matrix: THREE.Matrix4;
}

export interface LoftOptions {
  capStart?: boolean;
  capEnd?: boolean;
}

/**
 * Lofted body: sweeps a closed profile through stations and triangulates the surface.
 * UV: u around the profile (0 at the first point), v along the stations by cumulative distance.
 * Outward normals are guaranteed whichever way the profile winds or the stations advance.
 */
export function loft(stations: Station[], opts: LoftOptions = {}): THREE.BufferGeometry {
  if (stations.length < 2) throw new Error('loft needs at least two stations');
  const n = stations[0]!.points.length;
  for (const s of stations) if (s.points.length !== n) throw new Error('loft stations must share a point count');

  // normalise profile winding to counter-clockwise in local XY
  const ccw = signedArea(stations[0]!.points) >= 0;
  const prof = (s: Station): Pt[] => (ccw ? s.points : [...s.points].reverse());

  // do the stations advance along local +Z or -Z?
  const o0 = new THREE.Vector3().setFromMatrixPosition(stations[0]!.matrix);
  const o1 = new THREE.Vector3().setFromMatrixPosition(stations[1]!.matrix);
  const localZ = new THREE.Vector3().setFromMatrixColumn(stations[0]!.matrix, 2).normalize();
  const forward = o1.sub(o0).dot(localZ) >= 0;

  const S = stations.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // cumulative distance for v
  const vAt: number[] = [0];
  let total = 0;
  const prev = new THREE.Vector3().setFromMatrixPosition(stations[0]!.matrix);
  const cur = new THREE.Vector3();
  for (let i = 1; i < S; i++) {
    cur.setFromMatrixPosition(stations[i]!.matrix);
    total += cur.distanceTo(prev);
    vAt.push(total);
    prev.copy(cur);
  }

  const v3 = new THREE.Vector3();
  for (let i = 0; i < S; i++) {
    const st = stations[i]!;
    const pts = prof(st);
    const v = total > 0 ? vAt[i]! / total : 0;
    for (let j = 0; j <= n; j++) {
      const p = pts[j % n]!;
      v3.set(p[0], p[1], 0).applyMatrix4(st.matrix);
      positions.push(v3.x, v3.y, v3.z);
      uvs.push(j / n, v);
    }
  }

  const row = n + 1;
  for (let i = 0; i < S - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * row + j;
      const b = i * row + j + 1;
      const c = (i + 1) * row + j + 1;
      const d = (i + 1) * row + j;
      if (forward) indices.push(a, b, c, a, c, d);
      else indices.push(a, c, b, a, d, c);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  // stitch the seam so u=0 and u=1 share a normal
  const nrm = geom.getAttribute('normal') as THREE.BufferAttribute;
  const na = new THREE.Vector3();
  const nb = new THREE.Vector3();
  for (let i = 0; i < S; i++) {
    const a = i * row;
    const b = i * row + n;
    na.fromBufferAttribute(nrm, a);
    nb.fromBufferAttribute(nrm, b);
    na.add(nb).normalize();
    nrm.setXYZ(a, na.x, na.y, na.z);
    nrm.setXYZ(b, na.x, na.y, na.z);
  }
  nrm.needsUpdate = true;

  const parts: THREE.BufferGeometry[] = [geom];
  if (opts.capStart) parts.push(cap(stations[0]!, prof(stations[0]!), !forward));
  if (opts.capEnd) parts.push(cap(stations[S - 1]!, prof(stations[S - 1]!), forward));
  if (parts.length === 1) return geom;
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** Flat cap over a station: a fan from the centroid. `outwardIsPlusZ` picks the facing. */
function cap(st: Station, pts: Pt[], outwardIsPlusZ: boolean): THREE.BufferGeometry {
  const n = pts.length;
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const v3 = new THREE.Vector3(cx, cy, 0).applyMatrix4(st.matrix);
  positions.push(v3.x, v3.y, v3.z);
  uvs.push(0.5, outwardIsPlusZ ? 1 : 0);
  for (const p of pts) {
    v3.set(p[0], p[1], 0).applyMatrix4(st.matrix);
    positions.push(v3.x, v3.y, v3.z);
    uvs.push(0.5, outwardIsPlusZ ? 1 : 0);
  }
  for (let j = 0; j < n; j++) {
    const a = 1 + j;
    const b = 1 + ((j + 1) % n);
    if (outwardIsPlusZ) indices.push(0, a, b);
    else indices.push(0, b, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Concatenate indexed geometries that share position/uv/normal attributes. */
export function mergeGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const g of geoms) {
    const src = g.index ? g : g.toNonIndexed();
    const pos = src.getAttribute('position');
    const nrm = src.getAttribute('normal');
    const uv = src.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nrm ? nrm.getX(i) : 0, nrm ? nrm.getY(i) : 1, nrm ? nrm.getZ(i) : 0);
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    if (src.index) {
      for (let i = 0; i < src.index.count; i++) indices.push(src.index.getX(i) + offset);
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + offset);
    }
    offset += pos.count;
    if (src !== g) src.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(indices);
  return out;
}

/** A key station for a body loft: a section spec at a z position. */
export interface BodyKey extends SectionSpec {
  z: number;
}

const FIELDS = ['w', 'hTop', 'hBottom', 'eTop', 'eBottom', 'x', 'y'] as const;
const DEFAULTS: Record<(typeof FIELDS)[number], number> = { w: 0, hTop: 0, hBottom: 0, eTop: 2.5, eBottom: 2.5, x: 0, y: 0 };

/**
 * Cubic Hermite interpolation of every field across the keys (finite-difference tangents),
 * resampled into `segments` stations. Keys must be ordered by z, either direction.
 */
export function bodyStations(keys: BodyKey[], segments = 40, n?: number): Station[] {
  if (keys.length < 2) throw new Error('bodyStations needs at least two keys');
  const z0 = keys[0]!.z;
  const z1 = keys[keys.length - 1]!.z;
  const stations: Station[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = z0 + (z1 - z0) * t;
    const spec: SectionSpec = { w: 0, hTop: 0, hBottom: 0 };
    for (const f of FIELDS) {
      const v = hermiteAt(keys, f, z);
      (spec as unknown as Record<string, number>)[f] = f === 'w' || f === 'hTop' || f === 'hBottom' ? Math.max(0.002, v) : v;
    }
    stations.push({ points: section(spec, n), matrix: new THREE.Matrix4().makeTranslation(0, 0, z) });
  }
  return stations;
}

function hermiteAt(keys: BodyKey[], field: (typeof FIELDS)[number], z: number): number {
  const val = (k: BodyKey): number => (k[field] ?? DEFAULTS[field]) as number;
  const K = keys.length;
  const dir = Math.sign(keys[K - 1]!.z - keys[0]!.z) || 1;
  // find segment
  let i = 0;
  while (i < K - 2 && (keys[i + 1]!.z - z) * dir < 0) i++;
  const k0 = keys[i]!;
  const k1 = keys[i + 1]!;
  const h = k1.z - k0.z;
  if (Math.abs(h) < 1e-9) return val(k0);
  const t = THREE.MathUtils.clamp((z - k0.z) / h, 0, 1);
  const tangent = (j: number): number => {
    const a = keys[Math.max(0, j - 1)]!;
    const b = keys[Math.min(K - 1, j + 1)]!;
    const dz = b.z - a.z;
    return Math.abs(dz) < 1e-9 ? 0 : (val(b) - val(a)) / dz;
  };
  const m0 = tangent(i) * h;
  const m1 = tangent(i + 1) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * val(k0) + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * val(k1) + (t3 - t2) * m1;
}

/** Mirror a geometry across x=0, keeping faces outward. */
export function mirrorX(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setX(i, -pos.getX(i));
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (nrm) for (let i = 0; i < nrm.count; i++) nrm.setX(i, -nrm.getX(i));
  if (g.index) {
    const idx = g.index;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      const c = idx.getX(i + 2);
      idx.setX(i + 1, c);
      idx.setX(i + 2, b);
    }
  }
  return g;
}

/** Frame for wing stations: local X → world -Z (chord runs rearward), local Y up, local Z → world +X (span). */
export const WING_BASIS = new THREE.Matrix4().makeRotationY(Math.PI / 2);

/** Station for a wing element at a span position with its own airfoil profile. */
export function wingStation(points: Pt[], position: THREE.Vector3, roll = 0): Station {
  const m = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
  if (roll) m.multiply(new THREE.Matrix4().makeRotationZ(roll));
  m.multiply(WING_BASIS);
  return { points, matrix: m };
}
