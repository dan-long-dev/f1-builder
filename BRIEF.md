# BRIEF

Drafted from the kickoff conversation. Edit freely; this is the owner's statement of intent.

## What

A browser-based F1 car builder. A stylised 3D car you can orbit, pick parts on, swap them, repaint, drop into different environments, snapshot and share.

Astro + Three.js, deployed as a static site on Netlify. No backend.

## Who it's for

Anyone who wants to play with an F1-style car for a few minutes. It should be understandable without instructions, on a laptop or a phone.

## Must have

- A full car on screen, orbitable, that looks good at a glance.
- Hover highlights a part; click selects it and shows its options.
- Swappable parts: nose, front wing, rear wing, sidepods, engine cover, tyre compound, wheel rims.
- Livery: colours per zone, a set of pattern overlays, preset logos on fixed zones, a race number.
- Environment presets: studio, pit garage, track, sunset.
- Snapshot: download a PNG of the current view.
- Share: the whole build is encoded in the URL; opening the link reproduces it.
- Preset liveries to start from, and a randomise button.
- Flourishes: DRS flap toggle, turntable auto-rotate, exploded view.

## Constraints

- The car is procedural: every part is built in code from Three.js geometry. No downloaded models. Stylised, not photoreal.
- Logos are a built-in generic set. No real teams, sponsors or trademarks anywhere.
- Static hosting only. Shareable state must fit in a URL.
- Smooth on a mid-range laptop, usable on a recent phone.

## Done looks like

Someone opens the Netlify URL, orbits the car, clicks the rear wing and swaps it, changes two colours and a pattern, picks a logo, switches to the sunset environment, downloads a snapshot, and copies a link that reproduces the build in a fresh tab.
