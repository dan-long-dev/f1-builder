import * as THREE from 'three';
import { DEFAULT_LIVERY, type Livery } from '../catalog';
import { PAINT_TARGETS, paintLivery } from './livery';

export type PaintKey = 'chassis' | 'nose' | 'sidepods' | 'engineCover' | 'halo' | 'helmet';

/**
 * Shared materials for the car. Painted parts get their own material instance carrying a canvas
 * livery texture; structural materials are shared.
 */
export class Materials {
  readonly carbon = new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.5, metalness: 0.35 });
  readonly matteBlack = new THREE.MeshStandardMaterial({ color: '#0e0e10', roughness: 0.9, metalness: 0.0 });
  readonly rubber = new THREE.MeshStandardMaterial({ color: '#161616', roughness: 0.92, metalness: 0.0 });
  readonly steel = new THREE.MeshStandardMaterial({ color: '#8d9096', roughness: 0.35, metalness: 0.9 });
  readonly visor = new THREE.MeshPhysicalMaterial({ color: '#202428', roughness: 0.1, metalness: 0.6, clearcoat: 1 });
  readonly wing: THREE.MeshPhysicalMaterial;
  readonly rim: THREE.MeshStandardMaterial;
  readonly compound = new THREE.MeshStandardMaterial({ color: '#d1222e', roughness: 0.7, metalness: 0 });
  readonly shared: Set<THREE.Material>;
  private paints = new Map<PaintKey, THREE.MeshPhysicalMaterial>();
  private canvases = new Map<PaintKey, { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }>();
  private livery: Livery = DEFAULT_LIVERY;

  constructor() {
    this.wing = this.makePaint(DEFAULT_LIVERY.colors.wings);
    this.wing.roughness = 0.55;
    this.wing.clearcoat = 0.15;
    this.wing.clearcoatRoughness = 0.3;
    this.rim = new THREE.MeshStandardMaterial({ color: DEFAULT_LIVERY.colors.rims, roughness: 0.3, metalness: 0.85 });
    this.shared = new Set([this.carbon, this.matteBlack, this.rubber, this.steel, this.visor, this.wing, this.rim, this.compound]);
  }

  /** Painted body material for a part. Created on first use so every painted part has its own instance. */
  paint(key: PaintKey): THREE.MeshPhysicalMaterial {
    let m = this.paints.get(key);
    if (m) return m;
    const target = PAINT_TARGETS.find((t) => t.key === key);
    if (target) {
      const canvas = document.createElement('canvas');
      paintLivery(canvas, target, this.livery);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.wrapS = THREE.RepeatWrapping;
      m = this.makePaint('#ffffff');
      m.map = texture;
      this.canvases.set(key, { canvas, texture });
    } else {
      m = this.makePaint(key === 'helmet' ? this.livery.colors.helmet : this.livery.colors.body);
    }
    this.paints.set(key, m);
    this.shared.add(m);
    return m;
  }

  /** Repaint everything for a livery. Cheap enough to call on every colour change. */
  applyLivery(livery: Livery): void {
    this.livery = livery;
    for (const target of PAINT_TARGETS) {
      const entry = this.canvases.get(target.key);
      if (!entry) continue;
      paintLivery(entry.canvas, target, livery);
      entry.texture.needsUpdate = true;
    }
    this.paints.get('halo')?.color.set(livery.colors.body);
    this.paints.get('helmet')?.color.set(livery.colors.helmet);
    this.wing.color.set(livery.colors.wings);
    this.rim.color.set(livery.colors.rims);
  }

  private makePaint(color: string): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.32,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
  }
}
