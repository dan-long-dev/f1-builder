import * as THREE from 'three';

/** A 2D point in a profile plane. */
export type Pt = [number, number];

/**
 * Parametric profile: a superellipse with separate top and bottom halves.
 * Points start at top centre and go counter-clockwise, so a loft's u=0 is the top centreline
 * and u=0.5 is the bottom centreline.
 */
export interface SectionSpec {
  /** total width */
  w: number;
  /** height above the centre line */
  hTop: number;
  /** height below the centre line */
  hBottom: number;
  /** superellipse exponent for the top half: 2 = round, 6 = boxy */
  eTop?: number;
  /** superellipse exponent for the bottom half */
  eBottom?: number;
  /** centre offset */
  x?: number;
  y?: number;
}

export const SECTION_POINTS = 48;

export function section(spec: SectionSpec, n = SECTION_POINTS): Pt[] {
  const { w, hTop, hBottom, eTop = 2.5, eBottom = 2.5, x: cx = 0, y: cy = 0 } = spec;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const e = s >= 0 ? eTop : eBottom;
    const h = s >= 0 ? hTop : hBottom;
    const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / e) * (w / 2);
    const py = Math.sign(s) * Math.pow(Math.abs(s), 2 / e) * h;
    pts.push([cx + px, cy + py]);
  }
  return pts;
}

export interface AirfoilOptions {
  /** max thickness as a fraction of chord */
  thickness?: number;
  /** max camber as a fraction of chord; positive = downforce (curves down) */
  camber?: number;
  /** position of max camber along the chord, 0..1 */
  camberPos?: number;
  /** points per surface */
  n?: number;
}

/**
 * Closed airfoil polygon. x runs 0 (leading edge) to chord (trailing edge), y is thickness.
 * NACA 4-digit thickness distribution with a parabolic camber line, flipped so camber pulls down.
 */
export function airfoil(chord: number, opts: AirfoilOptions = {}): Pt[] {
  const { thickness = 0.12, camber = 0.05, camberPos = 0.4, n = 14 } = opts;
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = 0.5 - 0.5 * Math.cos((i / n) * Math.PI);
    const yt =
      5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    const p = camberPos;
    const m = -camber;
    const yc = x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
    upper.push([x * chord, (yc + yt) * chord]);
    lower.push([x * chord, (yc - yt) * chord]);
  }
  // trailing edge → leading edge along the upper surface, then back along the lower surface
  const pts: Pt[] = [];
  for (let i = n; i >= 0; i--) pts.push(upper[i]!);
  for (let i = 1; i < n; i++) pts.push(lower[i]!);
  return pts;
}

/** Rotate profile points about a pivot (radians, counter-clockwise). */
export function rotate2D(pts: Pt[], angle: number, pivot: Pt = [0, 0]): Pt[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return pts.map(([x, y]) => {
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c];
  });
}

export function translate2D(pts: Pt[], dx: number, dy: number): Pt[] {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}

/** Signed area; positive when counter-clockwise. */
export function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Tyre cross-section for a lathe: (radius, axial) pairs from the inner sidewall around the tread. */
export function tyreProfile(outerR: number, rimR: number, width: number, shoulder = 0.055): THREE.Vector2[] {
  const h = width / 2;
  const sidewallR = rimR + (outerR - rimR) * 0.5;
  const pts: [number, number][] = [
    [rimR + 0.004, -h + 0.012],
    [sidewallR, -h + 0.014],
    [outerR - 0.02, -h + 0.03],
    [outerR - 0.004, -h + shoulder * 0.7],
    [outerR, -h + shoulder],
    [outerR, h - shoulder],
    [outerR - 0.004, h - shoulder * 0.7],
    [outerR - 0.02, h - 0.03],
    [sidewallR, h - 0.014],
    [rimR + 0.004, h - 0.012],
  ];
  return pts.map(([r, a]) => new THREE.Vector2(r, a));
}
