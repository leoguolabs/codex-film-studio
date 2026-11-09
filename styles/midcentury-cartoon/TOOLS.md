# Mid-century Cartoon · executable package

Create with `python3 scripts/new_film.py NAME --style midcentury-cartoon`.
Run `npm ci` then `npm run proof` inside the external project.

| Module | Public tools |
| --- | --- |
| `lib/print.mjs` | `PALETTE`, `plateOffset`, `inkSegments`, `drawInk`, `drawCel`, `starPoints`, `drawPaper` |
| `lib/performance.mjs` | `solveLimb`, `roundedJointPath`, `decisiveEase`, `motionPhase`, `poseBoundary` |
| `lib/print-cels/` | Licensed printed-cel drawing primitives and a generic hand |
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

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/leoguolabs/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).

`performance.mjs` supplies geometry and timing primitives, not a finished actor.
Author the shoulder, wrist, bone lengths and elbow branch for the new subject,
then inspect the torso occlusion and resting hand silhouette in both directions.
Use separate approach, contact, movement and release phases; keep reading time
separate from travel. Store phase ranges once for picture and sound, and use
`poseBoundary` to align contacts with the chosen pose clock.
