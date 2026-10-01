import { DEFAULT_PARTS, type Livery, type Parts } from './catalog';

/** Named starting points. Generic names and colours; no real teams. */
export interface Preset {
  id: string;
  label: string;
  livery: Livery;
  parts?: Partial<Parts>;
}

export const PRESETS: Preset[] = [
  {
    id: 'scarlet',
    label: 'Scarlet',
    livery: {
      colors: { body: '#d9232e', pattern: '#f4f4f2', wings: '#141416', rims: '#2b2d31', helmet: '#f2c230' },
      pattern: 'stripe',
      logos: { sidepod: 'velox', engineCover: 'apex', rearWing: 'nitro', frontWing: '', nose: 'orbit' },
      number: 16,
    },
  },
  {
    id: 'tangerine',
    label: 'Tangerine',
    livery: {
      colors: { body: '#f26b1d', pattern: '#141416', wings: '#141416', rims: '#f26b1d', helmet: '#1f8fd6' },
      pattern: 'twoTone',
      logos: { sidepod: 'kinetic', engineCover: 'vortex', rearWing: 'halcyon', frontWing: 'nitro', nose: 'velox' },
      number: 4,
    },
    parts: { sidepods: 'undercut', engineCover: 'clean' },
  },
  {
    id: 'quicksilver',
    label: 'Quicksilver',
    livery: {
      colors: { body: '#b9bec6', pattern: '#1fb8a6', wings: '#141416', rims: '#141416', helmet: '#1fb8a6' },
      pattern: 'flash',
      logos: { sidepod: 'strata', engineCover: 'orbit', rearWing: 'kinetic', frontWing: '', nose: 'apex' },
      number: 44,
    },
    parts: { sidepods: 'slim', nose: 'wide', rims: 'spoke10' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    livery: {
      colors: { body: '#1b2a6b', pattern: '#f2c230', wings: '#1b2a6b', rims: '#f2c230', helmet: '#f2c230' },
      pattern: 'chevrons',
      logos: { sidepod: 'vortex', engineCover: 'halcyon', rearWing: 'strata', frontWing: 'kinetic', nose: '' },
      number: 1,
    },
    parts: { rearWing: 'high', frontWing: 'high', engineCover: 'tee' },
  },
  {
    id: 'glacier',
    label: 'Glacier',
    livery: {
      colors: { body: '#f4f4f2', pattern: '#1f8fd6', wings: '#1b2a6b', rims: '#f4f4f2', helmet: '#d9232e' },
      pattern: 'fade',
      logos: { sidepod: 'orbit', engineCover: 'nitro', rearWing: 'velox', frontWing: 'apex', nose: 'strata' },
      number: 10,
    },
    parts: { nose: 'droop', rims: 'disc', tyres: 'hard' },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    livery: {
      colors: { body: '#1f6b3a', pattern: '#141416', wings: '#141416', rims: '#2fb15b', helmet: '#f4f4f2' },
      pattern: 'twoTone',
      logos: { sidepod: 'halcyon', engineCover: 'kinetic', rearWing: 'apex', frontWing: 'orbit', nose: 'vortex' },
      number: 55,
    },
    parts: { rearWing: 'low', frontWing: 'simple', tyres: 'medium' },
  },
];

/** Apply a preset over the default parts so unspecified slots reset too. */
export function presetParts(p: Preset): Parts {
  return { ...DEFAULT_PARTS, ...(p.parts ?? {}) };
}
