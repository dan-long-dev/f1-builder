# PLAN

Build order. Tick boxes as they land; one phase per commit.

## Phase 1 — Scaffold and viewer
- [x] Astro 7 + three + lil-gui, TypeScript strict, `netlify.toml`, `.gitignore`
- [x] Viewer: renderer, camera, OrbitControls, resize, render loop, ACES tone mapping, soft shadows
- [x] Studio floor and lights; placeholder blocked-out car so framing and scale can be judged
- [x] Page shell: full-bleed canvas + side panel, responsive CSS
- [x] `npm run build` passes; `npm run shot` produces a screenshot

## Phase 2 — Procedural car
- [x] Profile + loft utilities with UVs and caps; airfoil loft; rod helper
- [x] Parts: chassis, nose, front wing, rear wing, sidepods, engine cover + airbox, floor + diffuser, halo, wheels + suspension, driver + headrest + mirrors
- [x] Car assembled from `config.car`, one variant per slot; reads as an F1 car from every angle

## Phase 3 — Picking and swapping
- [ ] Hover highlight, click to select, click empty space to deselect
- [ ] Variants: 3 noses, 3 front wings, 3 rear wings, 3 sidepods, 3 engine covers, 5 tyre compounds, 3 rim styles
- [ ] Panel lists slots and variants; selecting in 3D focuses the slot in the panel and vice versa
- [ ] State module with URL encode/decode (parts only so far)

## Phase 4 — Livery
- [ ] Zone colours: body, pattern, wings, rims, helmet
- [ ] Patterns: solid, stripe, two-tone, fade, chevrons, flash (canvas livery)
- [ ] Preset logo set (8 generic SVGs) on logo zones via decal projection
- [ ] Race number decal on nose and engine cover
- [ ] Livery in URL state

## Phase 5 — Environments
- [ ] Studio, pit garage, track, sunset: background, env map, lights, floor, fog
- [ ] Env in URL state; switching is instant and disposes the old one

## Phase 6 — Snapshot, share, presets
- [ ] Snapshot: PNG download, Web Share where available
- [ ] Share: copy link button; build loads from URL on open
- [ ] 6 preset liveries + randomise

## Phase 7 — Flourishes and polish
- [ ] DRS toggle (animated), turntable, exploded view
- [ ] Mobile layout (panel as bottom sheet), touch picking
- [ ] Debug GUI for tunables; perf pass (pixel-ratio cap, draw-call count)
- [ ] README with Netlify deploy notes
