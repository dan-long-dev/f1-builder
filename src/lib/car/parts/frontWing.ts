import * as THREE from 'three';
import { plateZY, rod } from '../../geometry/helpers';
import { buildElement, follow, type ElementSpec } from './wings';
import type { PartContext, PartVariants } from './types';
import type { VariantId } from '../../catalog';
import type { Pt } from '../../geometry/profiles';

interface FrontWingParams {
  /** flaps behind the main plane: chord, angle of attack, slot gap */
  flaps: { chord: number; aoa: number; gapZ: number; gapY: number; xStart: number; xEnd: number }[];
  mainChord: number;
  mainAoa: number;
  /** how much the tips rise (spoon) */
  dihedral: number;
  endplateHeight: number;
}

const smooth = (a: number, b: number, x: number): number => THREE.MathUtils.smoothstep(x, a, b);

function build(ctx: PartContext, p: FrontWingParams): THREE.Group {
  const { materials: m, car } = ctx;
  const fw = car.frontWing;
  const g = new THREE.Group();

  const rise = (x: number): number => p.dihedral * smooth(0.3, fw.halfSpan, x) ** 2;
  const main: ElementSpec = {
    xStart: 0,
    xEnd: fw.halfSpan,
    chord: (x) => THREE.MathUtils.lerp(p.mainChord * 0.72, p.mainChord, smooth(0.18, 0.34, x)),
    aoa: (x) => THREE.MathUtils.lerp(0, p.mainAoa, smooth(0.18, 0.34, x)),
    le: (x) => [fw.y + rise(x), fw.leadingZ - 0.04 * smooth(0.5, fw.halfSpan, x)],
    stations: 14,
  };
  const elements: ElementSpec[] = [main];
  let prev = main;
  for (const f of p.flaps) {
    const spec: ElementSpec = {
      xStart: f.xStart,
      xEnd: f.xEnd,
      chord: () => f.chord,
      aoa: (x) => f.aoa + 3 * smooth(0.5, fw.halfSpan, x),
      le: follow(prev, f.gapZ, f.gapY),
      stations: 10,
      thickness: 0.09,
    };
    elements.push(spec);
    prev = spec;
  }
  for (const e of elements) for (const mm of buildElement(e, m.wing)) g.add(mm);

  // endplates
  const x = fw.halfSpan + 0.015;
  const zFront = fw.leadingZ + 0.03;
  const zBack = fw.leadingZ - p.mainChord - p.flaps.reduce((s, f) => s + f.chord * 0.85, 0) - 0.02;
  const yBottom = fw.y - 0.03;
  const top = yBottom + p.endplateHeight;
  const plate: Pt[] = [
    [zFront, yBottom],
    [zBack - 0.02, yBottom],
    [zBack - 0.06, top],
    [zFront - 0.3, top],
    [zFront, top - 0.14],
  ];
  g.add(plateZY(plate, 0.012, x, m.wing), plateZY(plate, 0.012, -x, m.wing));

  // pylons from the nose underside to the main plane
  for (const s of [-1, 1]) {
    g.add(rod(new THREE.Vector3(s * 0.11, 0.2, fw.leadingZ - 0.42), new THREE.Vector3(s * 0.11, fw.y + 0.02, fw.leadingZ - 0.26), 0.014, m.carbon));
  }
  return g;
}

export const frontWingVariants: PartVariants<VariantId<'frontWing'>> = {
  simple: {
    label: 'Two-element',
    build: (ctx) =>
      build(ctx, {
        mainChord: 0.42,
        mainAoa: 4,
        flaps: [{ chord: 0.24, aoa: 16, gapZ: 0.04, gapY: 0.03, xStart: 0.24, xEnd: 0.93 }],
        dihedral: 0.05,
        endplateHeight: 0.26,
      }),
  },
  standard: {
    label: 'Three-element',
    build: (ctx) =>
      build(ctx, {
        mainChord: 0.4,
        mainAoa: 5,
        flaps: [
          { chord: 0.22, aoa: 15, gapZ: 0.04, gapY: 0.03, xStart: 0.24, xEnd: 0.93 },
          { chord: 0.17, aoa: 26, gapZ: 0.03, gapY: 0.03, xStart: 0.24, xEnd: 0.91 },
        ],
        dihedral: 0.06,
        endplateHeight: 0.3,
      }),
  },
  high: {
    label: 'High downforce',
    build: (ctx) =>
      build(ctx, {
        mainChord: 0.4,
        mainAoa: 7,
        flaps: [
          { chord: 0.2, aoa: 16, gapZ: 0.035, gapY: 0.03, xStart: 0.24, xEnd: 0.93 },
          { chord: 0.16, aoa: 26, gapZ: 0.03, gapY: 0.03, xStart: 0.24, xEnd: 0.92 },
          { chord: 0.13, aoa: 36, gapZ: 0.025, gapY: 0.03, xStart: 0.24, xEnd: 0.9 },
        ],
        dihedral: 0.07,
        endplateHeight: 0.34,
      }),
  },
};
