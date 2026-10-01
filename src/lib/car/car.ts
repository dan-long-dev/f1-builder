import * as THREE from 'three';
import { config } from '../config';
import { SLOTS, type Livery, type Parts, type SlotId, type VariantId } from '../catalog';
import { disposeObject } from '../geometry/helpers';
import { Materials } from './materials';
import { Decals } from './decals';
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
import { DRS_FLAP_NAME } from './parts/rearWing';

type SwappableSlot = Exclude<SlotId, 'tyres' | 'rims'>;

const _target = new THREE.Vector3();

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
  readonly decals: Decals;
  readonly chassis: THREE.Group;
  private readonly ctx: PartContext;
  private slotGroups = new Map<SlotId, THREE.Group>();
  private wheels: THREE.Group | null = null;
  private livery: Livery;
  private decalTimer: ReturnType<typeof setTimeout> | null = null;
  private drsOpen = false;
  private exploded = false;
  private explodables: { obj: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3 }[] = [];
  private explodablesDirty = true;
  /** Called after any geometry changes (part swap, decals) so highlights can be re-applied. */
  onChanged: (() => void) | null = null;

  constructor(materials: Materials, parts: Parts, livery: Livery) {
    this.materials = materials;
    this.parts = { ...parts };
    this.livery = livery;
    this.ctx = { materials, car: config.car };
    this.group.name = 'car';
    materials.applyLivery(livery);
    this.chassis = buildChassis(this.ctx);
    this.group.add(this.chassis, buildHalo(this.ctx), buildFloor(this.ctx), buildSuspension(this.ctx));
    for (const slot of SLOTS) {
      if (slot === 'tyres' || slot === 'rims') continue;
      this.rebuildSlot(slot);
    }
    this.rebuildWheels();
    this.decals = new Decals((owner) => (owner === 'chassis' ? this.chassis : this.slotGroups.get(owner)));
    void this.decals.apply(livery).then(() => this.decalsChanged());
  }

  setPart<S extends SlotId>(slot: S, variant: VariantId<S>): void {
    if (this.parts[slot] === variant) return;
    (this.parts as Record<SlotId, string>)[slot] = variant;
    if (slot === 'tyres' || slot === 'rims') {
      this.rebuildWheels();
    } else {
      this.rebuildSlot(slot as SwappableSlot);
      void this.decals.refresh(slot as SwappableSlot).then(() => this.decalsChanged());
    }
  }

  /** Apply a livery: repaint textures and recolour zones now; re-project decals shortly after (debounced). */
  setLivery(livery: Livery): void {
    this.livery = livery;
    this.materials.applyLivery(livery);
    if (this.decalTimer !== null) clearTimeout(this.decalTimer);
    this.decalTimer = setTimeout(() => {
      this.decalTimer = null;
      void this.decals.apply(this.livery).then(() => this.decalsChanged());
    }, 90);
  }

  private decalsChanged(): void {
    // new sidepod decals start at the origin; when exploded they need to jump to the pod's current offset
    this.explodablesDirty = true;
    this.onChanged?.();
  }

  /** DRS: the rear flap pivots about its leading edge. Animated in `update`. */
  setDrs(open: boolean): void {
    this.drsOpen = open;
  }

  get drs(): boolean {
    return this.drsOpen;
  }

  /** Exploded view: parts drift apart along per-slot directions. Animated in `update`. */
  setExploded(on: boolean): void {
    this.exploded = on;
  }

  get isExploded(): boolean {
    return this.exploded;
  }

  /** Per-frame animation: DRS flap angle and explode offsets, both eased. */
  update(dt: number): void {
    const flap = this.slotGroups.get('rearWing')?.getObjectByName(DRS_FLAP_NAME);
    if (flap) {
      const target = this.drsOpen ? THREE.MathUtils.degToRad(config.anim.drsOpenDeg) : 0;
      flap.rotation.x = THREE.MathUtils.damp(flap.rotation.x, target, config.anim.damping, dt);
    }
    if (this.explodablesDirty) this.collectExplodables();
    const k = this.exploded ? 1 : 0;
    for (const e of this.explodables) {
      _target.copy(e.base).addScaledVector(e.offset, k);
      e.obj.position.x = THREE.MathUtils.damp(e.obj.position.x, _target.x, config.anim.damping, dt);
      e.obj.position.y = THREE.MathUtils.damp(e.obj.position.y, _target.y, config.anim.damping, dt);
      e.obj.position.z = THREE.MathUtils.damp(e.obj.position.z, _target.z, config.anim.damping, dt);
    }
  }

  /** The group for a slot (the wheels group for tyres/rims). */
  slotGroup(slot: SlotId): THREE.Group | undefined {
    return slot === 'tyres' || slot === 'rims' ? (this.wheels ?? undefined) : this.slotGroups.get(slot);
  }

  dispose(): void {
    this.decals.dispose();
    disposeObject(this.group, this.materials.shared);
  }

  /**
   * Build the list of objects the exploded view moves. Slot groups move as a whole; sidepods and
   * wheels move each side outward; the floor drops and the halo lifts.
   */
  private collectExplodables(): void {
    this.explodablesDirty = false;
    const ex = config.explode;
    const list: typeof this.explodables = [];
    const add = (obj: THREE.Object3D, offset: [number, number, number]): void => {
      const base = (obj.userData.basePos as THREE.Vector3 | undefined) ?? obj.position.clone();
      obj.userData.basePos = base;
      list.push({ obj, base, offset: new THREE.Vector3(...offset) });
    };
    const sideOf = (o: THREE.Object3D): number => {
      if (o instanceof THREE.Mesh) {
        o.geometry.computeBoundingBox();
        const b = o.geometry.boundingBox;
        if (b) return Math.sign((b.min.x + b.max.x) / 2 + o.position.x) || 1;
      }
      return Math.sign(o.position.x) || 1;
    };
    for (const [slot, g] of this.slotGroups) {
      if (slot === 'sidepods') {
        for (const child of g.children) {
          const sgn = sideOf(child);
          add(child, [sgn * ex.sidepods[0], ex.sidepods[1], ex.sidepods[2]]);
        }
      } else {
        const off = (ex as Partial<Record<string, [number, number, number]>>)[slot];
        if (off) add(g, off);
      }
    }
    if (this.wheels) {
      for (const w of this.wheels.children) {
        const sgn = Math.sign(w.position.x) || 1;
        add(w, [sgn * ex.wheels[0], ex.wheels[1], ex.wheels[2]]);
      }
    }
    for (const child of this.group.children) {
      if (child.name === 'halo') add(child, ex.halo);
      if (child.name === 'floor') add(child, ex.floor);
    }
    this.explodables = list;
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
    this.explodablesDirty = true;
  }

  private rebuildWheels(): void {
    if (this.wheels) {
      this.group.remove(this.wheels);
      disposeObject(this.wheels, this.materials.shared);
    }
    this.wheels = buildWheels(this.ctx, { tyres: this.parts.tyres, rims: this.parts.rims });
    this.group.add(this.wheels);
    this.explodablesDirty = true;
  }
}
