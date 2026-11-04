# Luminous Worlds production

Place a `field` behind the action with `sky`, `horizon` and optional
`width` and `height`. Interleave authored image plates and vector shapes
with a `route`. Its `points` are the four local control points of a cubic
Bézier curve. The emitted marker follows that same curve from shot start
to end. Adjust `radius`, `stroke`, `width` and `emission` per route.
Use `tools/README.md` for full-frame analysis.

In the independent project, run `npm ci` and `npm run doctor`. Fill
`content/production.json` with your frame rate, duration, shots and audio
(or set `silent: true`). Put the material layers inside each shot's `layers`
array. Use `npm run preview` for a timed excerpt and `npm run build` for
`media/film.mp4`. PRODUCTION.md documents the timeline, text, image and
group layers. Extend `src/scene.mjs` for subject-specific drawings.
