import * as THREE from 'three';
import { mesh, plateXZ } from '../../geometry/helpers';
import type { Pt } from '../../geometry/profiles';
import type { PartContext } from './types';

/** Floor, edge lips and diffuser. Fixed. */
export function buildFloor(ctx: PartContext): THREE.Group {
  const { materials: m, car } = ctx;
  const g = new THREE.Group();
  g.name = 'floor';
  const y = car.floorY;
  const half: Pt[] = [
    [0.3, 1.35],
    [0.6, 1.25],
    [0.78, 1.05],
    [0.8, 0.3],
    [0.78, -1.25],
    [0.56, -1.5],
    [0.48, -2.0],
    [0.44, -2.3],
  ];
  const outline: Pt[] = [...half, ...[...half].reverse().map(([x, z]): Pt => [-x, z])];
  g.add(plateXZ(outline, 0.022, y, m.carbon));

  // edge lips
  for (const s of [-1, 1]) {
    const lip = mesh(new THREE.BoxGeometry(0.014, 0.045, 2.2), m.carbon);
    lip.position.set(s * 0.795, y + 0.03, -0.1);
    g.add(lip);
  }

  // diffuser ramp + strakes
  const tilt = THREE.MathUtils.degToRad(14);
  const len = 0.7;
  const ramp = mesh(new THREE.BoxGeometry(0.96, 0.018, len), m.carbon);
  ramp.rotation.x = tilt;
  ramp.position.set(0, y + 0.02 + (len / 2) * Math.sin(tilt), -1.95);
  g.add(ramp);
  for (let i = -2; i <= 2; i++) {
    const strake = mesh(new THREE.BoxGeometry(0.01, 0.13, len - 0.05), m.carbon);
    strake.rotation.x = tilt;
    strake.position.set(i * 0.22, ramp.position.y + 0.06, -1.95);
    g.add(strake);
  }
  return g;
}
