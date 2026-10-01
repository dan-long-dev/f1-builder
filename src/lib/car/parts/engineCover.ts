import * as THREE from 'three';
import { bodyStations, loft, type BodyKey } from '../../geometry/loft';
import { section, type Pt } from '../../geometry/profiles';
import { mesh, plateZY } from '../../geometry/helpers';
import { buildElement, type ElementSpec } from './wings';
import type { PartContext, PartVariants } from './types';
import type { VariantId } from '../../catalog';

function coverKeys(ctx: PartContext): BodyKey[] {
  const ec = ctx.car.engineCover;
  return [
    { z: ec.startZ, w: 0.3, hTop: 0.1, hBottom: 0.26, eTop: 2.2, eBottom: 2.6, y: 0.85 },
    { z: -0.2, w: 0.36, hTop: 0.09, hBottom: 0.3, eTop: 2.4, eBottom: 2.2, y: 0.84 },
    { z: -0.9, w: 0.34, hTop: 0.06, hBottom: 0.32, eTop: 2.4, eBottom: 2.0, y: 0.78 },
    { z: -1.5, w: 0.26, hTop: 0.05, hBottom: 0.25, eTop: 2.4, eBottom: 2.0, y: 0.62 },
    { z: ec.endZ, w: 0.12, hTop: 0.04, hBottom: 0.1, eTop: 2.2, eBottom: 2.0, y: 0.47 },
  ];
}

function buildCover(ctx: PartContext, opts: { fin: boolean; tee: boolean }): THREE.Group {
  const { materials: m } = ctx;
  const g = new THREE.Group();
  const keys = coverKeys(ctx);
  g.add(mesh(loft(bodyStations(keys, 44), { capStart: true, capEnd: true }), m.paint('engineCover'), { name: 'engineCover' }));

  // airbox inlet
  const k0 = keys[0]!;
  const inset = section({ w: k0.w * 0.8, hTop: k0.hTop * 0.78, hBottom: 0.07, eTop: 2.2, eBottom: 2.2, y: k0.y }, 32);
  const inlet = mesh(new THREE.ShapeGeometry(new THREE.Shape(inset.map(([x, y]) => new THREE.Vector2(x, y)))), m.matteBlack, { castShadow: false });
  inlet.position.z = k0.z + 0.006;
  g.add(inlet);

  if (opts.fin) {
    const fin: Pt[] = [
      [-0.45, 0.8],
      [-0.55, 0.96],
      [-1.55, 0.84],
      [-1.98, 0.62],
      [-1.98, 0.46],
      [-0.45, 0.7],
    ];
    g.add(plateZY(fin, 0.014, 0, m.paint('engineCover')));
  }
  if (opts.tee) {
    const tee: ElementSpec = { xStart: 0, xEnd: 0.3, chord: () => 0.1, aoa: () => 14, le: () => [0.72, -1.6], stations: 4, thickness: 0.1 };
    for (const mm of buildElement(tee, m.wing)) g.add(mm);
    const post = mesh(new THREE.BoxGeometry(0.012, 0.14, 0.08), m.wing);
    post.position.set(0, 0.68, -1.66);
    g.add(post);
  }
  return g;
}

export const engineCoverVariants: PartVariants<VariantId<'engineCover'>> = {
  fin: { label: 'Shark fin', build: (ctx) => buildCover(ctx, { fin: true, tee: false }) },
  clean: { label: 'Clean', build: (ctx) => buildCover(ctx, { fin: false, tee: false }) },
  tee: { label: 'T-wing', build: (ctx) => buildCover(ctx, { fin: true, tee: true }) },
};
