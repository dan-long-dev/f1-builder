import * as THREE from 'three';
import { mesh, plateZY, rod } from '../../geometry/helpers';
import { buildElement, trailingEdge, type ElementSpec } from './wings';
import type { PartContext, PartVariants } from './types';
import type { VariantId } from '../../catalog';
import type { Pt } from '../../geometry/profiles';

interface RearWingParams {
  mainChord: number;
  mainAoa: number;
  flapChord: number;
  flapAoa: number;
  /** vertical position of the main plane leading edge, relative to config */
  yOffset: number;
  endplateHeight: number;
  beam: boolean;
}

export const DRS_FLAP_NAME = 'drsFlap';

function build(ctx: PartContext, p: RearWingParams): THREE.Group {
  const { materials: m, car } = ctx;
  const rw = car.rearWing;
  const g = new THREE.Group();
  const y0 = rw.y + p.yOffset;

  const main: ElementSpec = {
    xStart: 0,
    xEnd: rw.halfSpan,
    chord: () => p.mainChord,
    aoa: () => p.mainAoa,
    le: () => [y0, rw.leadingZ],
    stations: 6,
    thickness: 0.12,
  };
  for (const mm of buildElement(main, m.wing)) g.add(mm);

  // DRS flap pivots about its own leading edge
  const [teY, teZ] = trailingEdge(main, 0);
  const flap: ElementSpec = {
    xStart: 0,
    xEnd: rw.halfSpan - 0.005,
    chord: () => p.flapChord,
    aoa: () => p.flapAoa,
    le: () => [teY + 0.035, teZ + 0.035],
    stations: 6,
    thickness: 0.1,
  };
  const pivot = new THREE.Group();
  pivot.name = DRS_FLAP_NAME;
  const [fy, fz] = flap.le(0);
  pivot.position.set(0, fy, fz);
  for (const mm of buildElement(flap, m.wing, true)) pivot.add(mm);
  // actuator pod
  const pod = mesh(new THREE.CapsuleGeometry(0.02, 0.1, 4, 10), m.carbon);
  pod.rotation.x = Math.PI / 2 - THREE.MathUtils.degToRad(p.flapAoa);
  pod.position.set(0, 0.04, -0.07);
  pivot.add(pod);
  g.add(pivot);

  // endplates
  const [flapTeY, flapTeZ] = trailingEdge(flap, 0);
  const top = Math.max(flapTeY, y0) + 0.03;
  const bottom = top - p.endplateHeight;
  const zFront = rw.leadingZ + 0.15;
  const zBack = flapTeZ - 0.06;
  const plate: Pt[] = [
    [zFront, bottom],
    [zBack, bottom],
    [zBack, top],
    [rw.leadingZ - 0.05, top],
    [zFront, top - p.endplateHeight * 0.45],
  ];
  const x = rw.halfSpan + 0.012;
  g.add(plateZY(plate, 0.012, x, m.wing), plateZY(plate, 0.012, -x, m.wing));

  // swan-neck pylon
  g.add(rod(new THREE.Vector3(0, 0.49, rw.leadingZ + 0.32), new THREE.Vector3(0, y0 + 0.05, rw.leadingZ - 0.14), 0.024, m.carbon));

  // beam wing
  if (p.beam) {
    const beam1: ElementSpec = { xStart: 0, xEnd: rw.halfSpan - 0.05, chord: () => 0.15, aoa: () => 12, le: () => [bottom - 0.04, rw.leadingZ - 0.2], stations: 5 };
    const beam2: ElementSpec = { xStart: 0, xEnd: rw.halfSpan - 0.05, chord: () => 0.12, aoa: () => 24, le: () => [bottom + 0.03, rw.leadingZ - 0.31], stations: 5 };
    for (const mm of [...buildElement(beam1, m.wing), ...buildElement(beam2, m.wing)]) g.add(mm);
  }
  return g;
}

export const rearWingVariants: PartVariants<VariantId<'rearWing'>> = {
  low: {
    label: 'Low drag',
    build: (ctx) => build(ctx, { mainChord: 0.28, mainAoa: 4, flapChord: 0.2, flapAoa: 18, yOffset: 0.0, endplateHeight: 0.38, beam: false }),
  },
  standard: {
    label: 'Standard',
    build: (ctx) => build(ctx, { mainChord: 0.33, mainAoa: 9, flapChord: 0.24, flapAoa: 30, yOffset: 0.0, endplateHeight: 0.46, beam: true }),
  },
  high: {
    label: 'High downforce',
    build: (ctx) => build(ctx, { mainChord: 0.36, mainAoa: 13, flapChord: 0.27, flapAoa: 38, yOffset: 0.02, endplateHeight: 0.52, beam: true }),
  },
};
