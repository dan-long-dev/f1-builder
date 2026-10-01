import * as THREE from 'three';
import { bodyStations, loft, mirrorX, type BodyKey } from '../../geometry/loft';
import { section } from '../../geometry/profiles';
import { mesh } from '../../geometry/helpers';
import type { PartContext, PartVariants } from './types';
import type { VariantId } from '../../catalog';

function podsFrom(keys: (ctx: PartContext) => BodyKey[]) {
  return (ctx: PartContext): THREE.Group => {
    const { materials: m } = ctx;
    const g = new THREE.Group();
    const k = keys(ctx);
    const left = loft(bodyStations(k, 44), { capStart: true, capEnd: true });
    g.add(mesh(left, m.paint('sidepods'), { name: 'sidepodL' }), mesh(mirrorX(left), m.paint('sidepods'), { name: 'sidepodR' }));

    // inlet: a dark inset plate just in front of the first station
    const inlet = k[0]!;
    const inset = section({ ...inlet, w: inlet.w * 0.82, hTop: inlet.hTop * 0.8, hBottom: inlet.hBottom * 0.8 }, 32);
    const shape = new THREE.Shape(inset.map(([x, y]) => new THREE.Vector2(x, y)));
    const geom = new THREE.ShapeGeometry(shape);
    for (const s of [1, -1]) {
      const plate = mesh(geom, m.matteBlack, { castShadow: false });
      plate.position.set(0, 0, inlet.z + 0.006);
      plate.scale.x = s;
      g.add(plate);
    }
    return g;
  };
}

export const sidepodVariants: PartVariants<VariantId<'sidepods'>> = {
  downwash: {
    label: 'Downwash',
    build: podsFrom((ctx) => [
      { z: ctx.car.sidepod.inletZ, w: 0.44, hTop: 0.24, hBottom: 0.22, eTop: 2.6, eBottom: 5, x: 0.52, y: 0.32 },
      { z: 0.1, w: 0.5, hTop: 0.25, hBottom: 0.24, eTop: 2.8, eBottom: 6, x: 0.52, y: 0.31 },
      { z: -0.6, w: 0.46, hTop: 0.16, hBottom: 0.22, eTop: 2.6, eBottom: 6, x: 0.48, y: 0.29 },
      { z: -1.2, w: 0.34, hTop: 0.08, hBottom: 0.2, eTop: 2.4, eBottom: 6, x: 0.4, y: 0.27 },
      { z: ctx.car.sidepod.endZ, w: 0.16, hTop: 0.02, hBottom: 0.14, eTop: 2.2, eBottom: 5, x: 0.3, y: 0.21 },
    ]),
  },
  slim: {
    label: 'Zero-pod',
    build: podsFrom((ctx) => [
      { z: ctx.car.sidepod.inletZ - 0.05, w: 0.22, hTop: 0.1, hBottom: 0.1, eTop: 2.4, eBottom: 2.6, x: 0.4, y: 0.45 },
      { z: 0.1, w: 0.26, hTop: 0.1, hBottom: 0.12, eTop: 2.6, eBottom: 2.8, x: 0.4, y: 0.44 },
      { z: -0.6, w: 0.24, hTop: 0.09, hBottom: 0.2, eTop: 2.6, eBottom: 3, x: 0.38, y: 0.4 },
      { z: -1.2, w: 0.2, hTop: 0.07, hBottom: 0.22, eTop: 2.4, eBottom: 3.5, x: 0.33, y: 0.33 },
      { z: ctx.car.sidepod.endZ, w: 0.12, hTop: 0.03, hBottom: 0.16, eTop: 2.2, eBottom: 4, x: 0.28, y: 0.24 },
    ]),
  },
  undercut: {
    label: 'Undercut',
    build: podsFrom((ctx) => [
      { z: ctx.car.sidepod.inletZ, w: 0.42, hTop: 0.2, hBottom: 0.14, eTop: 2.4, eBottom: 2.6, x: 0.54, y: 0.4 },
      { z: 0.1, w: 0.48, hTop: 0.2, hBottom: 0.16, eTop: 2.6, eBottom: 3, x: 0.52, y: 0.38 },
      { z: -0.6, w: 0.42, hTop: 0.14, hBottom: 0.22, eTop: 2.6, eBottom: 4, x: 0.46, y: 0.32 },
      { z: -1.2, w: 0.3, hTop: 0.08, hBottom: 0.2, eTop: 2.4, eBottom: 5, x: 0.38, y: 0.27 },
      { z: ctx.car.sidepod.endZ, w: 0.14, hTop: 0.02, hBottom: 0.14, eTop: 2.2, eBottom: 5, x: 0.29, y: 0.21 },
    ]),
  },
};
