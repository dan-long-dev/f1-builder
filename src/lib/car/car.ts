import * as THREE from 'three';
import { config } from '../config';
import { SLOTS, type Parts, type SlotId, type VariantId } from '../catalog';
import { disposeObject } from '../geometry/helpers';
import { Materials } from './materials';
import type { PartContext, PartVariant } from './parts/types';
import { buildChassis } from './parts/chassis';
import { buildHalo } from './parts/halo';
import { buildFloor } from './parts/floor';
import { buildSuspension } from './parts/suspension';
import { buildWheels } from './parts/wheels';
import { noseVariants } from './parts/nose';
import { frontWingVariants } from './parts/frontWing';
import { rearWingVariants } from './parts/rearWing';
import { sidepodVariants } from './parts/sidepods';
import { engineCoverVariants } from './parts/engineCover';

type SwappableSlot = Exclude<SlotId, 'tyres' | 'rims'>;

const BUILDERS: { [S in SwappableSlot]: Record<VariantId<S>, PartVariant> } = {
  nose: noseVariants,
  frontWing: frontWingVariants,
  rearWing: rearWingVariants,
  sidepods: sidepodVariants,
  engineCover: engineCoverVariants,
};

/**
 * The assembled car. Fixed parts are built once; swappable slots are rebuilt on demand.
 * Every swappable group carries `userData.slot` so picking can resolve a hit.
 */
export class Car {
  readonly group = new THREE.Group();
  readonly materials: Materials;
  readonly parts: Parts;
  private readonly ctx: PartContext;
  private slotGroups = new Map<SlotId, THREE.Group>();
  private wheels: THREE.Group | null = null;

  constructor(materials: Materials, parts: Parts) {
    this.materials = materials;
    this.parts = { ...parts };
    this.ctx = { materials, car: config.car };
    this.group.name = 'car';
    this.group.add(buildChassis(this.ctx), buildHalo(this.ctx), buildFloor(this.ctx), buildSuspension(this.ctx));
    for (const slot of SLOTS) {
      if (slot === 'tyres' || slot === 'rims') continue;
      this.rebuildSlot(slot);
    }
    this.rebuildWheels();
  }

  setPart<S extends SlotId>(slot: S, variant: VariantId<S>): void {
    if (this.parts[slot] === variant) return;
    (this.parts as Record<SlotId, string>)[slot] = variant;
    if (slot === 'tyres' || slot === 'rims') this.rebuildWheels();
    else this.rebuildSlot(slot as SwappableSlot);
  }

  /** The group for a slot (the wheels group for tyres/rims). */
  slotGroup(slot: SlotId): THREE.Group | undefined {
    return slot === 'tyres' || slot === 'rims' ? (this.wheels ?? undefined) : this.slotGroups.get(slot);
  }

  dispose(): void {
    disposeObject(this.group, this.materials.shared);
  }

  private rebuildSlot<S extends SwappableSlot>(slot: S): void {
    const old = this.slotGroups.get(slot);
    if (old) {
      this.group.remove(old);
      disposeObject(old, this.materials.shared);
    }
    const variant = BUILDERS[slot][this.parts[slot]];
    const g = variant.build(this.ctx);
    g.name = slot;
    g.userData.slot = slot;
    this.group.add(g);
    this.slotGroups.set(slot, g);
  }

  private rebuildWheels(): void {
    if (this.wheels) {
      this.group.remove(this.wheels);
      disposeObject(this.wheels, this.materials.shared);
    }
    this.wheels = buildWheels(this.ctx, { tyres: this.parts.tyres, rims: this.parts.rims });
    this.group.add(this.wheels);
  }
}
