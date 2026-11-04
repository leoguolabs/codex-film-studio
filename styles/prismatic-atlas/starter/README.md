# Prismatic Atlas production

A `tiles` layer takes a pixel `unit` and a `cells` array. Each cell has grid
`x`, `y`, a nonnegative `height`, optional `heightTo`, and face colours
`top`, `left` and `right`. Heights use grid units. Cells draw back-to-front.
A `prism` takes `radius`, `depth`, `squash`, `facetAngle` in radians, a
`top` colour and a `sides` palette. Keep using `lib/motion.mjs` for parent
transforms, arc-length paths and attachment constraints.

In the independent project, run `npm ci` and `npm run doctor`. Fill
`content/production.json` with your frame rate, duration, shots and audio
(or set `silent: true`). Put the material layers inside each shot's `layers`
array. Use `npm run preview` for a timed excerpt and `npm run build` for
`media/film.mp4`. PRODUCTION.md documents the timeline, text, image and
group layers. Extend `src/scene.mjs` for subject-specific drawings.
