import {
  COLOR_ZONES,
  ENVS,
  LOGOS,
  LOGO_ZONES,
  NUMBER_RANGE,
  PATTERNS,
  SLOTS,
  SLOT_LABELS,
  VARIANTS,
  variantIds,
  type ColorZone,
  type EnvId,
  type LogoId,
  type LogoZone,
  type PatternId,
  type SlotId,
  type VariantId,
} from '../catalog';
import type { Store } from '../state';
import { PRESETS, presetParts } from '../presets';
import { randomBuild } from '../random';
import { cloneLivery } from '../state';

export interface PanelEvents {
  onSelectSlot?: (slot: SlotId | null) => void;
}

/** Quick-pick swatches shown under each colour input. */
const SWATCHES = ['#d9232e', '#f26b1d', '#f2c230', '#2fb15b', '#1f8fd6', '#1b2a6b', '#7a3cff', '#f4f4f2', '#a7adb6', '#141416'];

/** Builds the controls from the catalog and keeps them in sync with the store. */
export class Panel {
  private sections = new Map<SlotId, HTMLElement>();
  private chips = new Map<SlotId, Map<string, HTMLButtonElement>>();
  private colorInputs = new Map<ColorZone, HTMLInputElement>();
  private patternChips = new Map<PatternId, HTMLButtonElement>();
  private envChips = new Map<EnvId, HTMLButtonElement>();
  private logoChips = new Map<LogoZone, Map<string, HTMLButtonElement>>();
  private numberInput!: HTMLInputElement;
  private selected: SlotId | null = null;

  constructor(root: HTMLElement, private store: Store, private events: PanelEvents = {}) {
    root.replaceChildren(this.buildSceneSection(), this.buildPartsSection(), this.buildLiverySection());
    this.sync();
    store.subscribe(() => this.sync());
  }

  /** Reflect a selection made in the 3D view. */
  setSelected(slot: SlotId | null): void {
    this.selected = slot;
    for (const [id, sec] of this.sections) {
      const on = id === slot;
      sec.classList.toggle('is-selected', on);
      if (on) sec.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ---- scene ---- */

  private buildSceneSection(): HTMLElement {
    const wrap = el('section', 'group');
    wrap.append(el('h2', 'group__title', 'Scene'));
    const card = el('div', 'card');
    card.append(el('h3', 'card__title', 'Environment'));
    const row = el('div', 'chips chips--flush');
    for (const id of Object.keys(ENVS) as EnvId[]) {
      const chip = chipButton(ENVS[id], () => this.store.set({ env: id }));
      this.envChips.set(id, chip);
      row.append(chip);
    }
    card.append(row);
    wrap.append(card);

    const presets = el('div', 'card');
    presets.append(el('h3', 'card__title', 'Presets'));
    const prow = el('div', 'chips chips--flush');
    for (const p of PRESETS) {
      prow.append(chipButton(p.label, () => this.store.set({ parts: presetParts(p), livery: cloneLivery(p.livery) })));
    }
    const rnd = chipButton('Random', () => this.store.set(randomBuild()));
    rnd.classList.add('chip--accent');
    prow.append(rnd);
    presets.append(prow);
    wrap.append(presets);
    return wrap;
  }

  /* ---- parts ---- */

  private buildPartsSection(): HTMLElement {
    const wrap = el('section', 'group');
    wrap.append(el('h2', 'group__title', 'Parts'));
    for (const slot of SLOTS) {
      const sec = el('div', 'slot');
      sec.dataset.slot = slot;
      const head = el('button', 'slot__head') as HTMLButtonElement;
      head.type = 'button';
      head.append(el('span', 'slot__label', SLOT_LABELS[slot]), el('span', 'slot__value', ''));
      head.addEventListener('click', () => this.events.onSelectSlot?.(this.selected === slot ? null : slot));
      sec.append(head);

      const row = el('div', 'chips');
      const map = new Map<string, HTMLButtonElement>();
      for (const id of variantIds(slot)) {
        const chip = chipButton(VARIANTS[slot][id], () => {
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

  /* ---- livery ---- */

  private buildLiverySection(): HTMLElement {
    const wrap = el('section', 'group');
    wrap.append(el('h2', 'group__title', 'Livery'));

    // colours
    const colors = el('div', 'card');
    colors.append(el('h3', 'card__title', 'Colours'));
    for (const zone of Object.keys(COLOR_ZONES) as ColorZone[]) {
      const row = el('label', 'color');
      const input = document.createElement('input');
      input.type = 'color';
      input.className = 'color__input';
      input.addEventListener('input', () => this.store.setColor(zone, input.value));
      const name = el('span', 'color__label', COLOR_ZONES[zone]);
      const swatches = el('span', 'swatches');
      for (const hex of SWATCHES) {
        const b = el('button', 'swatch') as HTMLButtonElement;
        b.type = 'button';
        b.style.background = hex;
        b.title = hex;
        b.setAttribute('aria-label', `${COLOR_ZONES[zone]} ${hex}`);
        b.addEventListener('click', (e) => {
          e.preventDefault();
          this.store.setColor(zone, hex);
        });
        swatches.append(b);
      }
      row.append(input, name, swatches);
      colors.append(row);
      this.colorInputs.set(zone, input);
    }
    wrap.append(colors);

    // pattern
    const pattern = el('div', 'card');
    pattern.append(el('h3', 'card__title', 'Pattern'));
    const prow = el('div', 'chips chips--flush');
    for (const id of Object.keys(PATTERNS) as PatternId[]) {
      const chip = chipButton(PATTERNS[id], () => this.store.set({ livery: { pattern: id } }));
      this.patternChips.set(id, chip);
      prow.append(chip);
    }
    pattern.append(prow);
    wrap.append(pattern);

    // number
    const number = el('div', 'card');
    number.append(el('h3', 'card__title', 'Race number'));
    const nrow = el('div', 'number');
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'number__input';
    input.min = String(NUMBER_RANGE.min);
    input.max = String(NUMBER_RANGE.max);
    input.inputMode = 'numeric';
    input.addEventListener('change', () => {
      const n = Math.round(Number(input.value));
      if (Number.isFinite(n) && n >= NUMBER_RANGE.min && n <= NUMBER_RANGE.max) this.store.set({ livery: { number: n } });
      else input.value = String(this.store.state.livery.number);
    });
    const rnd = chipButton('Random', () => {
      const n = NUMBER_RANGE.min + Math.floor(Math.random() * (NUMBER_RANGE.max - NUMBER_RANGE.min + 1));
      this.store.set({ livery: { number: n } });
    });
    nrow.append(input, rnd);
    number.append(nrow);
    this.numberInput = input;
    wrap.append(number);

    // logos
    const logos = el('div', 'card');
    logos.append(el('h3', 'card__title', 'Logos'));
    for (const zone of Object.keys(LOGO_ZONES) as LogoZone[]) {
      logos.append(el('div', 'card__sub', LOGO_ZONES[zone]));
      const row = el('div', 'logos');
      const map = new Map<string, HTMLButtonElement>();
      const none = chipButton('None', () => this.store.set({ livery: { logos: { [zone]: '' } } }));
      none.classList.add('chip--small');
      map.set('', none);
      row.append(none);
      for (const id of Object.keys(LOGOS) as LogoId[]) {
        const b = el('button', 'logo') as HTMLButtonElement;
        b.type = 'button';
        b.title = LOGOS[id];
        b.setAttribute('aria-label', LOGOS[id]);
        const img = document.createElement('img');
        img.src = `/logos/${id}.svg`;
        img.alt = '';
        img.loading = 'lazy';
        b.append(img);
        b.addEventListener('click', () => this.store.set({ livery: { logos: { [zone]: id } } }));
        map.set(id, b);
        row.append(b);
      }
      this.logoChips.set(zone, map);
      logos.append(row);
    }
    wrap.append(logos);
    return wrap;
  }

  private sync(): void {
    const { parts, livery, env } = this.store.state;
    for (const [id, chip] of this.envChips) setOn(chip, id === env);
    for (const slot of SLOTS) {
      const current = parts[slot];
      const value = this.sections.get(slot)?.querySelector('.slot__value');
      if (value) value.textContent = (VARIANTS[slot] as Record<string, string>)[current] ?? current;
      for (const [id, chip] of this.chips.get(slot) ?? []) setOn(chip, id === current);
    }
    for (const [zone, input] of this.colorInputs) if (input.value !== livery.colors[zone]) input.value = livery.colors[zone];
    for (const [id, chip] of this.patternChips) setOn(chip, id === livery.pattern);
    if (document.activeElement !== this.numberInput) this.numberInput.value = String(livery.number);
    for (const [zone, map] of this.logoChips) for (const [id, b] of map) setOn(b, id === livery.logos[zone]);
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function chipButton(label: string, onClick: () => void): HTMLButtonElement {
  const chip = el('button', 'chip', label) as HTMLButtonElement;
  chip.type = 'button';
  chip.addEventListener('click', onClick);
  return chip;
}

function setOn(b: HTMLButtonElement, on: boolean): void {
  b.classList.toggle('is-on', on);
  b.setAttribute('aria-pressed', String(on));
}
