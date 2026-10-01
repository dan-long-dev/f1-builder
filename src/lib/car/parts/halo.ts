import * as THREE from 'three';
import { mesh, rod } from '../../geometry/helpers';
import type { PartContext } from './types';

export function buildHalo(ctx: PartContext): THREE.Group {
  const { materials: m } = ctx;
  const g = new THREE.Group();
  g.name = 'halo';
  const r = 0.032;
  const half: [number, number, number][] = [
    [0.3, 0.58, 0.1],
    [0.36, 0.84, 0.2],
    [0.35, 0.93, 0.55],
    [0.2, 0.95, 0.84],
    [0, 0.955, 0.92],
  ];
  const pts = [...half.map(([x, y, z]) => new THREE.Vector3(x, y, z)), ...[...half].reverse().slice(1).map(([x, y, z]) => new THREE.Vector3(-x, y, z))];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const tube = mesh(new THREE.TubeGeometry(curve, 80, r, 14, false), m.paint('halo'), { name: 'haloRing' });
  g.add(tube);
  g.add(rod(new THREE.Vector3(0, 0.95, 0.92), new THREE.Vector3(0, 0.57, 1.13), r * 0.95, m.paint('halo')));
  return g;
}
