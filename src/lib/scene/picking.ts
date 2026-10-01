import * as THREE from 'three';
import type { SlotId } from '../catalog';
import type { Viewer } from './viewer';
import type { Car } from '../car/car';

export interface PickerEvents {
  onHover?: (slot: SlotId | null) => void;
  onSelect?: (slot: SlotId | null) => void;
}

const HOVER = { color: new THREE.Color('#ffffff'), intensity: 0.1 };
const SELECTED = { color: new THREE.Color('#ffffff'), intensity: 0.22 };

/**
 * Raycast hover + click selection with emissive highlight.
 * A hovered/selected slot's meshes get a cloned material with emissive set, restored on leave,
 * so shared materials (both wings, all four rims) only light up for the slot under the pointer.
 */
export class Picker {
  hovered: SlotId | null = null;
  selected: SlotId | null = null;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDirty = false;
  private pointerInside = false;
  private down: { x: number; y: number; t: number } | null = null;
  private swapped = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private offFrame: () => void;

  constructor(
    private viewer: Viewer,
    private car: Car,
    private events: PickerEvents = {},
  ) {
    const el = viewer.canvas;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerleave', this.onLeave);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    window.addEventListener('keydown', this.onKey);
    this.offFrame = viewer.onFrame(() => this.update());
  }

  dispose(): void {
    const el = this.viewer.canvas;
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerleave', this.onLeave);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    this.offFrame();
    this.restoreAll();
  }

  /** Select a slot programmatically (from the panel). */
  select(slot: SlotId | null): void {
    if (slot === this.selected) return;
    this.selected = slot;
    this.applyHighlights();
    this.events.onSelect?.(slot);
  }

  /** Re-apply highlights after a part was rebuilt. */
  refresh(): void {
    this.applyHighlights();
  }

  private onMove = (e: PointerEvent): void => {
    const r = this.viewer.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.pointerDirty = true;
    this.pointerInside = true;
  };

  private onLeave = (): void => {
    this.pointerInside = false;
    this.setHovered(null);
  };

  private onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onUp = (e: PointerEvent): void => {
    const d = this.down;
    this.down = null;
    if (!d) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved > 6 || performance.now() - d.t > 500) return;
    this.onMove(e);
    const hit = this.pick();
    this.select(hit);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.select(null);
  };

  private update(): void {
    if (!this.pointerDirty || !this.pointerInside) return;
    this.pointerDirty = false;
    this.setHovered(this.pick());
  }

  private pick(): SlotId | null {
    this.raycaster.setFromCamera(this.pointer, this.viewer.camera);
    const hits = this.raycaster.intersectObject(this.car.group, true);
    for (const h of hits) {
      const slot = slotOf(h.object);
      if (slot) return slot;
      // hit a fixed part first: it occludes anything behind it
      return null;
    }
    return null;
  }

  private setHovered(slot: SlotId | null): void {
    if (slot === this.hovered) return;
    this.hovered = slot;
    this.viewer.canvas.style.cursor = slot ? 'pointer' : '';
    this.applyHighlights();
    this.events.onHover?.(slot);
  }

  private applyHighlights(): void {
    this.restoreAll();
    if (this.selected) this.tint(this.selected, SELECTED);
    if (this.hovered && this.hovered !== this.selected) this.tint(this.hovered, HOVER);
  }

  private tint(slot: SlotId, style: { color: THREE.Color; intensity: number }): void {
    this.car.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (slotOf(o) !== slot) return;
      if (this.swapped.has(o)) return;
      const src = o.material;
      if (Array.isArray(src)) return;
      if (!('emissive' in src)) return;
      const clone = (src as THREE.MeshStandardMaterial).clone();
      clone.emissive.copy(style.color);
      clone.emissiveIntensity = style.intensity;
      this.swapped.set(o, src);
      o.material = clone;
    });
  }

  private restoreAll(): void {
    for (const [m, src] of this.swapped) {
      const clone = m.material;
      m.material = src;
      if (!Array.isArray(clone)) clone.dispose();
    }
    this.swapped.clear();
  }
}

/** Walk up to the nearest ancestor (or self) that names a slot. */
export function slotOf(obj: THREE.Object3D): SlotId | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const s = o.userData.slot as SlotId | undefined;
    if (s) return s;
    o = o.parent;
  }
  return null;
}
