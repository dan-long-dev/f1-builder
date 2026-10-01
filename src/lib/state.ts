import {
  DEFAULT_LIVERY,
  DEFAULT_PARTS,
  NUMBER_RANGE,
  SLOTS,
  isHexColor,
  isLogo,
  isPattern,
  isVariant,
  type ColorZone,
  type Livery,
  type LogoZone,
  type Parts,
  type SlotId,
  type VariantId,
} from './catalog';

/** Everything that defines a build. Serialisable to the URL. */
export interface BuildState {
  parts: Parts;
  livery: Livery;
}

export interface Patch {
  parts?: Partial<Parts>;
  livery?: Partial<Omit<Livery, 'colors' | 'logos'>> & { colors?: Partial<Livery['colors']>; logos?: Partial<Livery['logos']> };
}

export type Listener = (state: BuildState, patch: Patch) => void;

/** Single source of truth. UI calls `set`; the car, URL and panel subscribe. */
export class Store {
  private current: BuildState;
  private listeners = new Set<Listener>();

  constructor(initial: BuildState) {
    this.current = initial;
  }

  get state(): BuildState {
    return this.current;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  set(patch: Patch): void {
    const cur = this.current;
    const next: BuildState = {
      parts: patch.parts ? { ...cur.parts, ...patch.parts } : cur.parts,
      livery: patch.livery
        ? {
            ...cur.livery,
            ...patch.livery,
            colors: { ...cur.livery.colors, ...(patch.livery.colors ?? {}) },
            logos: { ...cur.livery.logos, ...(patch.livery.logos ?? {}) },
          }
        : cur.livery,
    };
    this.current = next;
    for (const fn of this.listeners) fn(next, patch);
  }

  /** Replace the whole state (load a preset, follow a hash change). */
  replace(state: BuildState): void {
    this.current = state;
    for (const fn of this.listeners) fn(state, { parts: state.parts, livery: state.livery });
  }

  setPart<S extends SlotId>(slot: S, variant: VariantId<S>): void {
    if (this.current.parts[slot] === variant) return;
    this.set({ parts: { [slot]: variant } });
  }

  setColor(zone: ColorZone, hex: string): void {
    if (this.current.livery.colors[zone] === hex) return;
    this.set({ livery: { colors: { [zone]: hex } } });
  }
}

export function defaultState(): BuildState {
  return { parts: { ...DEFAULT_PARTS }, livery: cloneLivery(DEFAULT_LIVERY) };
}

export function cloneLivery(l: Livery): Livery {
  return { ...l, colors: { ...l.colors }, logos: { ...l.logos } };
}

/* ---- URL ---- */

const SLOT_KEYS: Record<SlotId, string> = { nose: 'n', frontWing: 'fw', rearWing: 'rw', sidepods: 'sp', engineCover: 'ec', tyres: 'ty', rims: 'rm' };
const COLOR_KEYS: Record<ColorZone, string> = { body: 'c1', pattern: 'c2', wings: 'cw', rims: 'cr', helmet: 'ch' };
const ZONE_ORDER: LogoZone[] = ['sidepod', 'engineCover', 'rearWing', 'frontWing', 'nose'];

export function encodeState(s: BuildState): string {
  const p = new URLSearchParams();
  for (const slot of SLOTS) p.set(SLOT_KEYS[slot], s.parts[slot]);
  for (const zone of Object.keys(COLOR_KEYS) as ColorZone[]) p.set(COLOR_KEYS[zone], s.livery.colors[zone].replace('#', ''));
  p.set('pat', s.livery.pattern);
  p.set('lg', ZONE_ORDER.map((z) => s.livery.logos[z] || '-').join('.'));
  p.set('num', String(s.livery.number));
  return p.toString();
}

/** Parse a hash/query string into a full state, falling back to defaults for anything missing or invalid. */
export function decodeState(hash: string): BuildState {
  const s = defaultState();
  const raw = hash.replace(/^#/, '');
  if (!raw) return s;
  const p = new URLSearchParams(raw);
  for (const slot of SLOTS) {
    const v = p.get(SLOT_KEYS[slot]);
    if (v && isVariant(slot, v)) (s.parts as Record<SlotId, string>)[slot] = v;
  }
  for (const zone of Object.keys(COLOR_KEYS) as ColorZone[]) {
    const v = p.get(COLOR_KEYS[zone]);
    if (v && isHexColor('#' + v)) s.livery.colors[zone] = '#' + v.toLowerCase();
  }
  const pat = p.get('pat');
  if (pat && isPattern(pat)) s.livery.pattern = pat;
  const lg = p.get('lg');
  if (lg) {
    const ids = lg.split('.');
    ZONE_ORDER.forEach((zone, i) => {
      const id = ids[i];
      if (id === undefined) return;
      s.livery.logos[zone] = id !== '-' && isLogo(id) ? id : '';
    });
  }
  const num = Number(p.get('num'));
  if (Number.isInteger(num) && num >= NUMBER_RANGE.min && num <= NUMBER_RANGE.max) s.livery.number = num;
  return s;
}

export function writeStateToUrl(s: BuildState): void {
  const encoded = encodeState(s);
  const url = `${location.pathname}${location.search}#${encoded}`;
  history.replaceState(null, '', url);
}
