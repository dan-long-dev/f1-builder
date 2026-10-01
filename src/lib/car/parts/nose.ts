import * as THREE from 'three';
import { bodyStations, loft, type BodyKey } from '../../geometry/loft';
import { mesh } from '../../geometry/helpers';
import type { PartContext, PartVariants } from './types';
import type { VariantId } from '../../catalog';

function noseFrom(keys: (ctx: PartContext) => BodyKey[]) {
  return (ctx: PartContext): THREE.Group => {
    const g = new THREE.Group();
    g.add(mesh(loft(bodyStations(keys(ctx), 36), { capEnd: true }), ctx.materials.paint('nose'), { name: 'nose' }));
    return g;
  };
}

const join = (ctx: PartContext): BodyKey => ({ z: ctx.car.noseJoinZ + 0.04, w: 0.36, hTop: 0.12, hBottom: 0.14, eTop: 2.6, eBottom: 3.2, y: 0.3 });

export const noseVariants: PartVariants<VariantId<'nose'>> = {
  slim: {
    label: 'Slim',
    build: noseFrom((ctx) => [
      join(ctx),
      { z: 2.4, w: 0.25, hTop: 0.09, hBottom: 0.1, eTop: 2.4, eBottom: 2.6, y: 0.27 },
      { z: 2.75, w: 0.15, hTop: 0.06, hBottom: 0.06, eTop: 2.2, eBottom: 2.2, y: 0.235 },
      { z: ctx.car.noseTipZ, w: 0.07, hTop: 0.03, hBottom: 0.03, eTop: 2, eBottom: 2, y: 0.21 },
    ]),
  },
  wide: {
    label: 'Wide',
    build: noseFrom((ctx) => [
      join(ctx),
      { z: 2.45, w: 0.32, hTop: 0.1, hBottom: 0.11, eTop: 2.6, eBottom: 3, y: 0.28 },
      { z: 2.8, w: 0.26, hTop: 0.07, hBottom: 0.08, eTop: 2.4, eBottom: 2.6, y: 0.245 },
      { z: ctx.car.noseTipZ - 0.05, w: 0.14, hTop: 0.035, hBottom: 0.04, eTop: 2.2, eBottom: 2.2, y: 0.22 },
    ]),
  },
  droop: {
    label: 'Droop',
    build: noseFrom((ctx) => [
      join(ctx),
      { z: 2.35, w: 0.26, hTop: 0.09, hBottom: 0.1, eTop: 2.4, eBottom: 2.6, y: 0.255 },
      { z: 2.7, w: 0.17, hTop: 0.06, hBottom: 0.06, eTop: 2.2, eBottom: 2.2, y: 0.2 },
      { z: ctx.car.noseTipZ + 0.02, w: 0.08, hTop: 0.03, hBottom: 0.03, eTop: 2, eBottom: 2, y: 0.165 },
    ]),
  },
};
