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

/* ---- livery ---- */

export const PATTERNS = {
  solid: 'Solid',
  stripe: 'Centre stripe',
  twoTone: 'Two-tone',
  fade: 'Fade',
  chevrons: 'Chevrons',
  flash: 'Flash',
} as const;
export type PatternId = keyof typeof PATTERNS;

/** Colour zones, in panel order. */
export const COLOR_ZONES = {
  body: 'Body',
  pattern: 'Pattern',
  wings: 'Wings',
  rims: 'Rims',
  helmet: 'Helmet',
} as const;
export type ColorZone = keyof typeof COLOR_ZONES;

export const LOGOS = {
  velox: 'Velox',
  apex: 'Apex',
  nitro: 'Nitro',
  strata: 'Strata',
  orbit: 'Orbit',
  kinetic: 'Kinetic',
  vortex: 'Vortex',
  halcyon: 'Halcyon',
} as const;
export type LogoId = keyof typeof LOGOS;

/** Places a logo can go. Each is mirrored on both sides where that makes sense. */
export const LOGO_ZONES = {
  sidepod: 'Sidepods',
  engineCover: 'Engine cover',
  rearWing: 'Rear wing endplates',
  frontWing: 'Front wing endplates',
  nose: 'Nose sides',
} as const;
export type LogoZone = keyof typeof LOGO_ZONES;

export interface Livery {
  colors: Record<ColorZone, string>;
  pattern: PatternId;
  logos: Record<LogoZone, LogoId | ''>;
  number: number;
}

export const DEFAULT_LIVERY: Livery = {
  colors: { body: '#d9232e', pattern: '#f4f4f2', wings: '#141416', rims: '#2b2d31', helmet: '#f2c230' },
  pattern: 'stripe',
  logos: { sidepod: 'velox', engineCover: 'apex', rearWing: 'nitro', frontWing: '', nose: 'orbit' },
  number: 7,
};

export const NUMBER_RANGE = { min: 1, max: 99 } as const;

export function isPattern(id: string): id is PatternId {
  return Object.prototype.hasOwnProperty.call(PATTERNS, id);
}
export function isLogo(id: string): id is LogoId {
  return Object.prototype.hasOwnProperty.call(LOGOS, id);
}
export function isLogoZone(id: string): id is LogoZone {
  return Object.prototype.hasOwnProperty.call(LOGO_ZONES, id);
}
export function isHexColor(s: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(s);
}
