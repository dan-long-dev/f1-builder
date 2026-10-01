import * as THREE from 'three';
import { rod } from '../../geometry/helpers';
import type { PartContext } from './types';

/** Wishbones, pushrods and track rods at both axles. Fixed. */
export function buildSuspension(ctx: PartContext): THREE.Group {
  const { materials: m, car } = ctx;
  const g = new THREE.Group();
  g.name = 'suspension';
  const r = 0.013;
  const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

  const axle = (z: number, inner: number, upright: number, chassisTop: number, chassisBottom: number): void => {
    for (const s of [-1, 1]) {
      const up = V(s * upright, 0.46, z + 0.01);
      const low = V(s * upright, 0.22, z);
      // upper wishbone
      g.add(rod(V(s * inner, chassisTop, z + 0.28), up, r, m.carbon));
      g.add(rod(V(s * inner, chassisTop, z - 0.2), up, r, m.carbon));
      // lower wishbone
      g.add(rod(V(s * inner, chassisBottom, z + 0.3), low, r, m.carbon));
      g.add(rod(V(s * inner, chassisBottom, z - 0.26), low, r, m.carbon));
      // pushrod and track rod
      g.add(rod(V(s * (upright - 0.02), 0.25, z + 0.04), V(s * (inner + 0.04), chassisTop + 0.07, z - 0.08), r * 0.9, m.carbon));
      g.add(rod(V(s * inner, 0.3, z + 0.14), V(s * upright, 0.32, z + 0.1), r * 0.8, m.carbon));
    }
  };
  axle(car.frontAxleZ, 0.2, 0.66, 0.44, 0.18);
  axle(car.frontAxleZ - car.wheelbase, 0.15, 0.58, 0.42, 0.16);
  return g;
}
