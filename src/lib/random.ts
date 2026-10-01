import { LOGOS, LOGO_ZONES, NUMBER_RANGE, PATTERNS, SLOTS, variantIds, type Livery, type LogoId, type LogoZone, type Parts, type PatternId, type SlotId } from './catalog';

const PALETTE = ['#d9232e', '#f26b1d', '#f2c230', '#2fb15b', '#1f6b3a', '#1f8fd6', '#1b2a6b', '#7a3cff', '#1fb8a6', '#f4f4f2', '#b9bec6', '#141416', '#ff5fa2'];

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** A random build: parts from every slot, contrasting body/pattern colours, random logos and number. */
export function randomBuild(): { parts: Parts; livery: Livery } {
  const parts = {} as Record<SlotId, string>;
  for (const slot of SLOTS) parts[slot] = pick(variantIds(slot));

  const body = pick(PALETTE);
  let pattern = pick(PALETTE);
  for (let i = 0; i < 8 && Math.abs(luminance(pattern) - luminance(body)) < 0.25; i++) pattern = pick(PALETTE);
  const dark = luminance(body) < 0.4;
  const wings = Math.random() < 0.5 ? '#141416' : dark ? pattern : body;
  const rims = pick(['#141416', '#2b2d31', '#b9bec6', '#f2c230', pattern]);
  const helmet = pick(PALETTE);

  const logos = {} as Record<LogoZone, LogoId | ''>;
  for (const zone of Object.keys(LOGO_ZONES) as LogoZone[]) logos[zone] = Math.random() < 0.75 ? pick(Object.keys(LOGOS) as LogoId[]) : '';

  return {
    parts: parts as Parts,
    livery: {
      colors: { body, pattern, wings, rims, helmet },
      pattern: pick(Object.keys(PATTERNS) as PatternId[]),
      logos,
      number: NUMBER_RANGE.min + Math.floor(Math.random() * (NUMBER_RANGE.max - NUMBER_RANGE.min + 1)),
    },
  };
}
