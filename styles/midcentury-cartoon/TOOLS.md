# Mid-century Cartoon · executable package

Create with `python3 scripts/new_film.py NAME --style midcentury-cartoon`.
Run `npm ci` then `npm run proof` inside the external project.

| Module | Public tools |
| --- | --- |
| `lib/print.mjs` | `PALETTE`, `plateOffset`, `inkSegments`, `drawInk`, `drawCel`, `starPoints`, `drawPaper` |
| `lib/performance.mjs` | `solveLimb`, `roundedJointPath`, `decisiveEase`, `motionPhase`, `poseBoundary` |
| `lib/scene.mjs` | `drawStyle` |
| `lib/timeline.mjs` | `frameClock`, `readingHoldSeconds`, `createTimeline` |

The runtime handles frame export, accepted audio import, mixing, captions and
encoded-file checks. `src/scene.mjs` is the story extension point.
`content/production.json` is intentionally empty. Read `PRODUCTION.md` in the
created project for the executable contract. The source font inventory, hashes
and license paths are in `starter/fonts/manifest.json`.

Material diagnostics exercise tools; they do not reproduce a prior story.
Use an external sealed source bundle for original-sample reconstruction.
See [reproduction](../../methods/reproduction.md).

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/visiontrail/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).

`performance.mjs` supplies geometry and timing primitives, not a finished actor.
Author the shoulder, wrist, bone lengths and outward elbow branch in local
coordinates, then mirror the whole drawing. Check the torso occlusion and the
resting hand silhouette in both directions. Draw straight bone segments with a
locally rounded joint; keep the entry side of an offscreen sleeve fixed.

Use separate phase ranges for approach, contact, movement and release. Keep
reading time separate from travel. Store those ranges once for picture and
sound, and use `poseBoundary` for contact events on the chosen pose clock. See
[performance guidance](reference/performance.md) for review and reference use.
