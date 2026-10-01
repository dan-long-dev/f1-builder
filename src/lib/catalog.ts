/**
 * Ids and labels for everything the UI and the URL refer to. Builders live elsewhere and import from here.
 */
export const SLOTS = ['nose', 'frontWing', 'rearWing', 'sidepods', 'engineCover', 'tyres', 'rims'] as const;
export type SlotId = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<SlotId, string> = {
  nose: 'Nose',
  frontWing: 'Front wing',
  rearWing: 'Rear wing',
  sidepods: 'Sidepods',
  engineCover: 'Engine cover',
  tyres: 'Tyres',
  rims: 'Wheel rims',
};

export const VARIANTS = {
  nose: { slim: 'Slim', wide: 'Wide', droop: 'Droop' },
  frontWing: { simple: 'Two-element', standard: 'Three-element', high: 'High downforce' },
  rearWing: { low: 'Low drag', standard: 'Standard', high: 'High downforce' },
  sidepods: { downwash: 'Downwash', slim: 'Zero-pod', undercut: 'Undercut' },
  engineCover: { fin: 'Shark fin', clean: 'Clean', tee: 'T-wing' },
  tyres: { soft: 'Soft', medium: 'Medium', hard: 'Hard', inter: 'Intermediate', wet: 'Wet' },
  rims: { spoke5: '5-spoke', spoke10: '10-spoke', disc: 'Aero disc' },
} as const satisfies Record<SlotId, Record<string, string>>;

export type VariantId<S extends SlotId> = keyof (typeof VARIANTS)[S] & string;
export type Parts = { [S in SlotId]: VariantId<S> };

export const DEFAULT_PARTS: Parts = {
  nose: 'slim',
  frontWing: 'standard',
  rearWing: 'standard',
  sidepods: 'downwash',
  engineCover: 'fin',
  tyres: 'soft',
  rims: 'spoke5',
};

export function variantIds<S extends SlotId>(slot: S): VariantId<S>[] {
  return Object.keys(VARIANTS[slot]) as VariantId<S>[];
}

export function isVariant<S extends SlotId>(slot: S, id: string): id is VariantId<S> {
  return Object.prototype.hasOwnProperty.call(VARIANTS[slot], id);
}
