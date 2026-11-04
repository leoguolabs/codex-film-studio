# New Hologram HUD film

A `wireframe` takes local `vertices` as [x,y,z] triples and `edges` as pairs
of zero-based vertex indices. Set its screen centre with `x` and `y`,
`yaw`, `yawTo` and `pitch` in radians, and `scan: true` for a moving scan
band. Add a separate `projector` layer with a positive `radius` beneath
the subject. Each component can move independently in a group.

In the independent project, run `npm ci` and `npm run doctor`. Fill
`content/production.json` with your frame rate, duration, shots and audio
(or set `silent: true`). Put the material layers inside each shot's `layers`
array. Use `npm run preview` for a timed excerpt and `npm run build` for
`media/film.mp4`. PRODUCTION.md documents the timeline, text, image and
group layers. Extend `src/scene.mjs` for subject-specific drawings.
