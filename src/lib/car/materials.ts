import * as THREE from 'three';
import { config } from '../config';

export type PaintKey = 'chassis' | 'nose' | 'sidepods' | 'engineCover' | 'halo' | 'helmet';

/**
 * Shared materials for the car. Painted parts get their own material instance (so each can carry
 * its own livery texture later); structural materials are shared.
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

  constructor() {
    this.wing = this.makePaint(config.colors.wings);
    this.wing.roughness = 0.55;
    this.wing.clearcoat = 0.15;
    this.wing.clearcoatRoughness = 0.3;
    this.rim = new THREE.MeshStandardMaterial({ color: config.colors.rims, roughness: 0.3, metalness: 0.85 });
    this.shared = new Set([
      this.carbon,
      this.matteBlack,
      this.rubber,
      this.steel,
      this.visor,
      this.wing,
      this.rim,
      this.compound,
    ]);
  }

  /** Painted body material for a part. Created on first use so every painted part has its own instance. */
  paint(key: PaintKey): THREE.MeshPhysicalMaterial {
    let m = this.paints.get(key);
    if (!m) {
      m = this.makePaint(key === 'helmet' ? config.colors.helmet : config.colors.body);
      this.paints.set(key, m);
      this.shared.add(m);
    }
    return m;
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
