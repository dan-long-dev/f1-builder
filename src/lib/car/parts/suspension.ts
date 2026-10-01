import * as THREE from 'three';
import { mesh, rod } from '../../geometry/helpers';
import { mergeGeometries } from '../../geometry/loft';
import type { PartContext } from './types';

/** Wishbones, pushrods and track rods at both axles, merged into one mesh. Fixed. */
export function buildSuspension(ctx: PartContext): THREE.Group {
  const { materials: m, car } = ctx;
  const g = new THREE.Group();
  g.name = 'suspension';
  const r = 0.013;
  const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  const rods: THREE.Mesh[] = [];

  const axle = (z: number, inner: number, upright: number, chassisTop: number, chassisBottom: number): void => {
    for (const s of [-1, 1]) {
      const up = V(s * upright, 0.46, z + 0.01);
      const low = V(s * upright, 0.22, z);
      // upper wishbone
      rods.push(rod(V(s * inner, chassisTop, z + 0.28), up, r, m.carbon));
      rods.push(rod(V(s * inner, chassisTop, z - 0.2), up, r, m.carbon));
      // lower wishbone
      rods.push(rod(V(s * inner, chassisBottom, z + 0.3), low, r, m.carbon));
      rods.push(rod(V(s * inner, chassisBottom, z - 0.26), low, r, m.carbon));
      // pushrod and track rod
      rods.push(rod(V(s * (upright - 0.02), 0.25, z + 0.04), V(s * (inner + 0.04), chassisTop + 0.07, z - 0.08), r * 0.9, m.carbon));
      rods.push(rod(V(s * inner, 0.3, z + 0.14), V(s * upright, 0.32, z + 0.1), r * 0.8, m.carbon));
    }
  };
  axle(car.frontAxleZ, 0.12, 0.66, 0.4, 0.2);
  axle(car.frontAxleZ - car.wheelbase, 0.08, 0.58, 0.38, 0.17);

  // bake each rod's transform into its geometry and merge: 24 draw calls → 1
  const geoms = rods.map((rm) => {
    rm.updateMatrix();
    return rm.geometry.applyMatrix4(rm.matrix);
  });
  const merged = mergeGeometries(geoms);
  for (const gm of geoms) gm.dispose();
  g.add(mesh(merged, m.carbon, { name: 'suspensionRods' }));
  return g;
}
