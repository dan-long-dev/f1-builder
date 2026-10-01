import * as THREE from 'three';
import { airfoil, rotate2D } from '../../geometry/profiles';
import { loft, wingStation, mirrorX } from '../../geometry/loft';
import { mesh } from '../../geometry/helpers';

/** One wing element described across the span. `x` is the absolute span position (0 at centre). */
export interface ElementSpec {
  /** inboard end of the element (0 = runs through the centre) */
  xStart: number;
  /** outboard end */
  xEnd: number;
  chord: (x: number) => number;
  /** angle of attack in degrees; positive raises the trailing edge */
  aoa: (x: number) => number;
  /** leading edge [y, z] at span position x */
  le: (x: number) => [number, number];
  thickness?: number;
  camber?: number;
  stations?: number;
}

/** Trailing edge [y, z] of an element at x. */
export function trailingEdge(e: ElementSpec, x: number): [number, number] {
  const [y, z] = e.le(x);
  const a = THREE.MathUtils.degToRad(e.aoa(x));
  const c = e.chord(x);
  return [y + c * Math.sin(a), z - c * Math.cos(a)];
}

/** A flap that sits behind and above the previous element's trailing edge by a fixed gap. */
export function follow(prev: ElementSpec, gapZ: number, gapY: number): (x: number) => [number, number] {
  return (x) => {
    const [y, z] = trailingEdge(prev, x);
    return [y + gapY, z + gapZ];
  };
}

/**
 * Build one element as a mesh. If xStart is 0 the loft runs across the whole span; otherwise it is built
 * for +x and mirrored. `leOrigin` builds the element relative to its own leading edge at x=0 (used for
 * pivoting flaps): positions are offset so le(0) lands at the origin.
 */
export function buildElement(e: ElementSpec, material: THREE.Material, leOrigin = false): THREE.Mesh[] {
  const stations = e.stations ?? 10;
  const [oy, oz] = leOrigin ? e.le(0) : [0, 0];
  const half = (sign: 1 | -1): THREE.BufferGeometry => {
    const sts = [];
    const x0 = e.xStart === 0 ? -e.xEnd : e.xStart;
    const x1 = e.xEnd;
    const count = e.xStart === 0 ? stations * 2 : stations;
    for (let i = 0; i <= count; i++) {
      const xs = x0 + ((x1 - x0) * i) / count;
      const x = Math.abs(xs);
      const pts = rotate2D(airfoil(e.chord(x), { thickness: e.thickness ?? 0.11, camber: e.camber ?? 0.05 }), THREE.MathUtils.degToRad(e.aoa(x)));
      const [y, z] = e.le(x);
      sts.push(wingStation(pts, new THREE.Vector3(sign * xs, y - oy, z - oz)));
    }
    return loft(sts, { capStart: true, capEnd: true });
  };
  const meshes: THREE.Mesh[] = [];
  if (e.xStart === 0) {
    meshes.push(mesh(half(1), material));
  } else {
    const g = half(1);
    meshes.push(mesh(g, material), mesh(mirrorX(g), material));
  }
  return meshes;
}
