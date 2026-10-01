# RECIPE

## Stack

- Astro 7, static output, one page. Astro is the shell and bundler; the app is vanilla TypeScript.
- Three.js 0.186, `WebGLRenderer`. No framework wrapper.
- lil-gui for the debug panel. It only mounts when the URL has `?debug`.
- TypeScript strict. Plain CSS with custom properties.
- Dev only: playwright-core for the screenshot helper (uses the system Chromium; no browser download).
- No other dependencies without asking.

## Commands

- `npm install`
- `npm run dev` — dev server on http://localhost:4321
- `npm run build` — static build to `dist/`
- `npm run preview` — serve `dist/`
- `npm run check` — `astro check` (TypeScript across `.astro` and `.ts`)
- `npm run shot -- [url] [out.png]` — headless screenshot of a running server (default http://localhost:4321 → `scratch/shot.png`). Use it to look at the result after a change.

Deploy: Netlify reads `netlify.toml` (build `npm run build`, publish `dist`, Node 22).

## Layout

```
src/
  pages/index.astro         the page: canvas + panel markup
  layouts/Base.astro        html shell, global css
  styles/global.css         custom properties, layout, panel styles
  lib/
    config.ts               tunables: car dimensions, default colours, camera, lights
    catalog.ts              ids and labels: part slots + variants, livery zones, patterns, logos, envs
    state.ts                BuildState, defaults, URL encode/decode, change events
    presets.ts              preset liveries
    geometry/
      profiles.ts           2D profile generators (rounded rect, airfoil, tyre section)
      loft.ts               lofted cross-sections → BufferGeometry with UVs
      helpers.ts            rods, mirror, merge, dispose
    car/
      car.ts                assembles parts from state; explode + DRS animation
      parts/<slot>.ts       one module per slot; exports its variants
      materials.ts          livery materials, tyre compound colours
      livery.ts             canvas-painted pattern textures
      decals.ts             logo + number decals
    scene/
      viewer.ts             renderer, camera, controls, resize, render loop
      environments.ts       environment presets
      picking.ts            raycast hover + select
    ui/
      panel.ts              builds the panel from the catalog, binds to state
      snapshot.ts           PNG capture + download/share
      share.ts              copy link
      debug.ts              lil-gui
public/logos/*.svg          preset logo set
scripts/shot.mjs            screenshot helper
```

## Conventions

- Units are metres. +Z is the car's front, +Y is up, +X is the driver's left. Origin is on the ground at the car's midpoint.
- Every swappable part is a `Group` with `userData.slot = '<slotId>'`. Picking walks up to that group.
- A part module exports `{ slot, variants: { [id]: { label, build(ctx) } } }`. `build` returns a fresh `Group`; the car disposes the old one on swap.
- Numbers someone will want to tune go in `config.ts`, not inline in builders. Part builders derive from `config.car`.
- State is the single source of truth: UI calls `setState(patch)`; subscribers (car, scene, panel, URL) react. Nothing writes to the scene from the UI directly.
- Colours in state are `#rrggbb` strings. Livery zones and ids are declared once in `catalog.ts`; everything else imports from there.
- Lofted meshes carry UVs with u around the profile (0 at top centre, 0.5 at bottom centre) and v along the length (0 at the part's front). Canvas liveries are painted in that space.
- Dispose geometries, materials and textures when a part or environment is replaced.
- Check the result after each change: `npm run build`, then `npm run dev` + `npm run shot` or a browser.

## Technique vocabulary

Use these names; they define the intended result.

| Name | Means | Reference |
| --- | --- | --- |
| Lofted body | A closed 2D profile swept through a list of stations (position + optional scale/rotation), triangulated into a surface with caps and UVs. Used for the monocoque, nose, sidepods, engine cover. | CAD loft; `THREE.BufferGeometry` with indexed quads |
| Parametric profile | A profile generated from a few numbers (width, height, corner radius, squareness) with a fixed point count, so stations interpolate cleanly. | Superellipse / rounded rectangle |
| Airfoil extrude | A cambered airfoil polygon (thickness + camber functions) lofted along the span, with per-station chord and angle of attack. Used for all wing elements. | NACA 4-digit thickness function |
| Shape extrude | A 2D `THREE.Shape` extruded to a thickness for flat parts: endplates, floor, fin, mirrors. | `THREE.ExtrudeGeometry` |
| Lathe | A 2D profile revolved around an axis: tyres, rims, helmet. | `THREE.LatheGeometry` |
| Rod | A capsule or cylinder between two points: suspension arms, pylons, halo tubing. | `THREE.CapsuleGeometry` + `lookAt` |
| Canvas livery | A `CanvasTexture` painted in loft UV space with base colour, pattern and zone colours; one per painted part. | `THREE.CanvasTexture` |
| Decal projection | A logo or number projected onto a mesh at a surface point found by raycast, so it survives part swaps. | `three/addons/geometries/DecalGeometry` |
| Procedural environment | An env map generated from a small lit scene or `RoomEnvironment`, plus matching background, fog, floor and key light. No HDRI files. | `PMREMGenerator.fromScene` |
| Emissive highlight | Hover/select feedback by tinting a part's materials' emissive colour; restored on leave. | — |
| URL state | The build serialised to short `key=value` pairs in the URL hash; decoded on load, re-encoded on every change. | `URLSearchParams` |
| Frame capture | Render, then read the canvas in the same tick with `toBlob`, so `preserveDrawingBuffer` stays off. | — |
| Explode offsets | Each slot has a direction; exploded view lerps the group along it. | — |
| Tween | A value eased toward a target in the render loop (`lerp`/`damp`). No tween library. | `THREE.MathUtils.damp` |
