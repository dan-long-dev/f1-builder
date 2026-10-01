import { DEFAULT_PARTS, SLOTS, isVariant, type Parts, type SlotId, type VariantId } from './catalog';

/** Everything that defines a build. Serialisable to the URL. */
export interface BuildState {
  parts: Parts;
}

export type Patch = Partial<BuildState>;
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
    const next: BuildState = { ...this.current };
    if (patch.parts) next.parts = { ...this.current.parts, ...patch.parts };
    this.current = next;
    for (const fn of this.listeners) fn(next, patch);
  }

  setPart<S extends SlotId>(slot: S, variant: VariantId<S>): void {
    if (this.current.parts[slot] === variant) return;
    this.set({ parts: { ...this.current.parts, [slot]: variant } });
  }
}

export function defaultState(): BuildState {
  return { parts: { ...DEFAULT_PARTS } };
}

/** Short URL keys per slot. */
const SLOT_KEYS: Record<SlotId, string> = {
  nose: 'n',
  frontWing: 'fw',
  rearWing: 'rw',
  sidepods: 'sp',
  engineCover: 'ec',
  tyres: 'ty',
  rims: 'rm',
};

export function encodeState(s: BuildState): string {
  const p = new URLSearchParams();
  for (const slot of SLOTS) p.set(SLOT_KEYS[slot], s.parts[slot]);
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
  return s;
}

export function writeStateToUrl(s: BuildState): void {
  const encoded = encodeState(s);
  const url = `${location.pathname}${location.search}#${encoded}`;
  history.replaceState(null, '', url);
}
