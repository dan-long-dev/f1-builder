# F1 Builder

A stylised F1 car you can orbit, pick parts on, swap them, repaint, drop into different environments, snapshot and share. Astro + Three.js, fully procedural (no model files), static hosting.

**Try it:** run it locally (below) or open the Netlify deployment once it's connected.

## Features

- Procedural car built from code: lofted bodywork, airfoil wings, lathe wheels. No downloaded models.
- Hover to highlight a part, click to select; swap noses, front and rear wings, sidepods, engine covers, tyre compounds and rims.
- Livery: five colour zones, six pattern overlays painted onto the bodywork, eight generic logos projected onto fixed zones, race number.
- Environments: studio, pit garage, track, sunset. All procedural lighting and env maps.
- Snapshot to PNG, copy a link that reproduces the build exactly (everything lives in the URL hash).
- Six preset liveries and a randomiser. DRS flap, turntable and exploded view (keys D, T, E; R for random).

## Develop

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static build to dist/
npm run preview    # serve dist/
npm run check      # astro check (TypeScript)
npm run shot       # headless screenshot of the dev server → scratch/shot.png
```

Append `?debug` to the URL for a lil-gui panel of tunables. `?cam=front|side|top|34…` or `?cam=x,y,z` fix the camera; `?quad` renders four views at once for screenshots.

## Deploy on Netlify

`netlify.toml` is already set up: build command `npm run build`, publish directory `dist`, Node 22. Connect the repository in Netlify, keep the defaults it reads from the file, and deploy. No environment variables are needed. Shared links use the URL hash, so no redirects are required.

## Project docs

- `BRIEF.md` — what we're building and what done looks like.
- `RECIPE.md` — stack, commands, layout, conventions, technique vocabulary.
- `PLAN.md` — build order and progress.
- `AGENTS.md` — how to work in this repo.
