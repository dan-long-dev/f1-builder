import * as THREE from 'three';
import { bodyStations, loft, type BodyKey } from '../../geometry/loft';
import { mesh, plateXZ, rod } from '../../geometry/helpers';
import type { Pt } from '../../geometry/profiles';
import type { PartContext } from './types';

/** Monocoque + gearbox spine, cockpit, driver, headrest, mirrors, rear light. Fixed; not swappable. */
export function buildChassis(ctx: PartContext): THREE.Group {
  const { materials: m, car } = ctx;
  const g = new THREE.Group();
  g.name = 'chassis';

  const keys: BodyKey[] = [
    { z: car.noseJoinZ, w: 0.36, hTop: 0.12, hBottom: 0.14, eTop: 2.6, eBottom: 3.2, y: 0.3 },
    { z: 1.3, w: 0.44, hTop: 0.17, hBottom: 0.18, eTop: 2.6, eBottom: 3.5, y: 0.31 },
    { z: 0.7, w: 0.54, hTop: 0.26, hBottom: 0.24, eTop: 3.0, eBottom: 4.5, y: 0.34 },
    { z: 0.1, w: 0.58, hTop: 0.27, hBottom: 0.26, eTop: 3.2, eBottom: 5, y: 0.34 },
    { z: -0.6, w: 0.56, hTop: 0.26, hBottom: 0.26, eTop: 3.0, eBottom: 5, y: 0.33 },
    { z: -1.2, w: 0.48, hTop: 0.2, hBottom: 0.24, eTop: 2.8, eBottom: 4, y: 0.31 },
    { z: -2.1, w: 0.26, hTop: 0.12, hBottom: 0.16, eTop: 2.5, eBottom: 3, y: 0.28 },
  ];
  g.add(mesh(loft(bodyStations(keys, 56), { capStart: true, capEnd: true }), m.paint('chassis'), { name: 'monocoque' }));

  // cockpit opening: a dark flattened ellipsoid that sinks into the top surface
  const opening = mesh(new THREE.SphereGeometry(1, 32, 16), m.matteBlack, { castShadow: false });
  opening.scale.set(0.2, 0.045, 0.4);
  opening.position.set(0, 0.6, 0.45);
  g.add(opening);

  // headrest: a padded U around the back and sides of the helmet
  const h = car.helmet;
  const hz = h.z;
  const u: Pt[] = [
    [-0.24, hz + 0.18],
    [-0.24, hz - 0.3],
    [0.24, hz - 0.3],
    [0.24, hz + 0.18],
    [0.165, hz + 0.18],
    [0.165, hz - 0.2],
    [-0.165, hz - 0.2],
    [-0.165, hz + 0.18],
  ];
  g.add(plateXZ(u, 0.075, 0.595, m.matteBlack));

  // driver helmet + visor
  const helmet = mesh(new THREE.SphereGeometry(h.radius, 32, 24), m.paint('helmet'), { name: 'helmet' });
  helmet.position.set(h.x, h.y, h.z);
  g.add(helmet);
  const visor = mesh(
    new THREE.SphereGeometry(h.radius + 0.004, 32, 12, Math.PI / 2 - 0.8, 1.6, Math.PI / 2 - 0.42, 0.5),
    m.visor,
    { castShadow: false },
  );
  visor.position.copy(helmet.position);
  g.add(visor);

  // mirrors
  for (const s of [-1, 1]) {
    const box = mesh(new THREE.BoxGeometry(0.13, 0.065, 0.05), m.carbon);
    box.position.set(s * 0.44, 0.56, 0.72);
    g.add(box);
    g.add(rod(new THREE.Vector3(s * 0.16, 0.5, 0.72), new THREE.Vector3(s * 0.4, 0.55, 0.72), 0.008, m.carbon));
  }

  // rear light + exhaust
  const light = mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff1a1a', emissiveIntensity: 1.5 }));
  light.position.set(0, 0.24, -2.14);
  g.add(light);
  const exhaust = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 16, 1, true), m.steel);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0, 0.43, -2.1);
  g.add(exhaust);

  return g;
}
