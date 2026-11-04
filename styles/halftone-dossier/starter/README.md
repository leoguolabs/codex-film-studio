# New Halftone Dossier film

Use a `screen` layer for a filled polygon with an ink-dot screen. Supply local
`points`, a `fill`, an optional outline `stroke`, dot colour `ink` and dot
`pitch` in pixels (at least 2). A `stamp` takes `text`, `size`, `ink` and a
shot-local `contactFrame`. Anchor it with `x`, `y` and optional `rotation`.
Its first visible impression falls on the contact frame.

In the independent project, run `npm ci` and `npm run doctor`. Fill
`content/production.json` with your frame rate, duration, shots and audio
(or set `silent: true`). Put the material layers inside each shot's `layers`
array. Use `npm run preview` for a timed excerpt and `npm run build` for
`media/film.mp4`. PRODUCTION.md documents the timeline, text, image and
group layers. Extend `src/scene.mjs` for subject-specific drawings.
