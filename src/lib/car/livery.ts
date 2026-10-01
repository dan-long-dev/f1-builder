import * as THREE from 'three';
import type { Livery, PatternId } from '../catalog';
import type { PaintKey } from './materials';

/**
 * Canvas livery: paints a part's texture in loft UV space.
 * u runs around the section (0 = top centre, 0.25 = car's right side, 0.5 = underside, 0.75 = left side).
 * v runs along the part; `zRange` says which world z the v=0 and v=1 ends sit at, so patterns line up across parts.
 */
export interface PaintTarget {
  key: PaintKey;
  zRange: [number, number];
  /** sidepods sit beside the body; their outer face is at u≈0.75 */
  kind: 'body' | 'pod';
  width: number;
  height: number;
}

/** Overall z extent of the painted bodywork, for gradients. */
const Z_FRONT = 2.95;
const Z_BACK = -2.1;

const sat = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number): number => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const frac = (x: number): number => x - Math.floor(x);
/** distance to u=0 around the loop */
const wrapDist = (u: number): number => Math.min(u, 1 - u);

type Coverage = (u: number, z: number, eps: number, kind: PaintTarget['kind']) => number;

/** How much of the secondary colour shows at (u, z), 0..1. `eps` is one texel in u for soft edges. */
const PATTERN_COVERAGE: Record<PatternId, Coverage> = {
  solid: () => 0,
  stripe: (u, _z, eps, kind) => {
    if (kind === 'pod') return 0;
    const half = 0.045;
    return sat((half - wrapDist(u)) / eps + 0.5);
  },
  twoTone: (u, _z, eps) => sat((u - 0.25) / eps + 0.5) * sat((0.75 - u) / eps + 0.5),
  fade: (_u, z) => smooth(0.3, 0.85, (Z_FRONT - z) / (Z_FRONT - Z_BACK)),
  chevrons: (u, z, eps, kind) => {
    const side = kind === 'pod' ? Math.abs(u - 0.75) : Math.abs(Math.abs(u - 0.5) - 0.25);
    const mask = 1 - smooth(0.13, 0.19, side);
    const p = frac((z - side * 1.8) * 1.5);
    const band = sat((0.2 - Math.abs(p - 0.5)) / (eps * 4) + 0.5);
    return mask * band;
  },
  flash: (u, z, eps, kind) => {
    const side = kind === 'pod' ? Math.abs(u - 0.75) : Math.abs(Math.abs(u - 0.5) - 0.25);
    const mask = 1 - smooth(0.17, 0.23, side);
    const centre = -0.1 + side * 3.2;
    const band = sat((0.42 - Math.abs(z - centre)) / (eps * 8) + 0.5);
    return mask * band;
  },
};

const hex2rgb = (hex: string): [number, number, number] => {
  const c = new THREE.Color(hex);
  // keep sRGB bytes for the canvas: Color parses into linear, so convert back
  const s = c.convertLinearToSRGB();
  return [Math.round(s.r * 255), Math.round(s.g * 255), Math.round(s.b * 255)];
};

export function paintLivery(canvas: HTMLCanvasElement, target: PaintTarget, livery: Livery): void {
  const { width: w, height: h } = target;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const [pr, pg, pb] = hex2rgb(livery.colors.body);
  const [sr, sg, sb] = hex2rgb(livery.colors.pattern);
  const cov = PATTERN_COVERAGE[livery.pattern];
  const [z0, z1] = target.zRange;
  const eps = 1.5 / w;
  let i = 0;
  for (let y = 0; y < h; y++) {
    // canvas row 0 is the top of the image, which is v=1
    const v = 1 - (y + 0.5) / h;
    const z = z0 + (z1 - z0) * v;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const c = cov(u, z, eps, target.kind);
      d[i++] = pr + (sr - pr) * c;
      d[i++] = pg + (sg - pg) * c;
      d[i++] = pb + (sb - pb) * c;
      d[i++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Which parts are painted, and where their v axis sits in world z. */
export const PAINT_TARGETS: PaintTarget[] = [
  { key: 'chassis', zRange: [1.95, -2.1], kind: 'body', width: 1024, height: 512 },
  { key: 'nose', zRange: [1.99, 2.95], kind: 'body', width: 512, height: 256 },
  { key: 'engineCover', zRange: [0.25, -2.05], kind: 'body', width: 1024, height: 512 },
  { key: 'sidepods', zRange: [0.65, -1.75], kind: 'pod', width: 1024, height: 512 },
];

/** Relative luminance of a hex colour, for picking a contrasting ink. */
export function isDark(hex: string): boolean {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.3;
}
