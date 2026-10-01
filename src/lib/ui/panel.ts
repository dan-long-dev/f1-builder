import { SLOTS, SLOT_LABELS, VARIANTS, variantIds, type SlotId, type VariantId } from '../catalog';
import type { Store } from '../state';

export interface PanelEvents {
  onSelectSlot?: (slot: SlotId | null) => void;
}

/** Builds the controls from the catalog and keeps them in sync with the store. */
export class Panel {
  private root: HTMLElement;
  private sections = new Map<SlotId, HTMLElement>();
  private chips = new Map<SlotId, Map<string, HTMLButtonElement>>();
  private selected: SlotId | null = null;

  constructor(root: HTMLElement, private store: Store, private events: PanelEvents = {}) {
    this.root = root;
    root.replaceChildren();
    root.append(this.buildPartsSection());
    this.sync();
    store.subscribe(() => this.sync());
  }

  /** Reflect a selection made in the 3D view. */
  setSelected(slot: SlotId | null): void {
    this.selected = slot;
    for (const [id, el] of this.sections) {
      const on = id === slot;
      el.classList.toggle('is-selected', on);
      if (on) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private buildPartsSection(): HTMLElement {
    const wrap = el('section', 'group');
    wrap.append(el('h2', 'group__title', 'Parts'));
    for (const slot of SLOTS) {
      const sec = el('div', 'slot');
      sec.dataset.slot = slot;
      const head = el('button', 'slot__head') as HTMLButtonElement;
      head.type = 'button';
      head.append(el('span', 'slot__label', SLOT_LABELS[slot]), el('span', 'slot__value', ''));
      head.addEventListener('click', () => {
        const next = this.selected === slot ? null : slot;
        this.events.onSelectSlot?.(next);
      });
      sec.append(head);

      const row = el('div', 'chips');
      const map = new Map<string, HTMLButtonElement>();
      for (const id of variantIds(slot)) {
        const chip = el('button', 'chip', VARIANTS[slot][id]) as HTMLButtonElement;
        chip.type = 'button';
        chip.addEventListener('click', () => {
          this.store.setPart(slot, id as VariantId<typeof slot>);
          this.events.onSelectSlot?.(slot);
        });
        map.set(id, chip);
        row.append(chip);
      }
      this.chips.set(slot, map);
      sec.append(row);
      this.sections.set(slot, sec);
      wrap.append(sec);
    }
    return wrap;
  }

  private sync(): void {
    const parts = this.store.state.parts;
    for (const slot of SLOTS) {
      const current = parts[slot];
      const sec = this.sections.get(slot);
      const value = sec?.querySelector('.slot__value');
      if (value) value.textContent = (VARIANTS[slot] as Record<string, string>)[current] ?? current;
      for (const [id, chip] of this.chips.get(slot) ?? []) {
        const on = id === current;
        chip.classList.toggle('is-on', on);
        chip.setAttribute('aria-pressed', String(on));
      }
    }
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}
