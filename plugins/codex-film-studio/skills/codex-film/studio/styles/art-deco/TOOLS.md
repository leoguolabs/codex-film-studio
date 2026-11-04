# Art Deco · executable package

Create with `python3 scripts/new_film.py NAME --style art-deco`.
Run `npm ci` then `npm run proof` inside the external project.

| Module | Public tools |
| --- | --- |
| `lib/material.mjs` | `C`, `clamp`, `ease`, `mix`, `tau`, `path`, `gold`, `line`, `poly`, `rect`, `ellipse`, `glow`, `lightBeam`, `portraitLighting`, `stageLighting`, `bulb`, `rays`, `sparkle`, `archPoints`, `arch`, `chevrons`, `fan`, `fanPair`, `fanFigure`, `text`, `plaque`, `backdrop`, `stars`, `moon`, `vignette`, `camera`, `ppoly`, `projectedRadialAngle`, `radialMotionTime`, `radialTilt`, `radialFanOpening`, `radialBeat`, `radialFloor`, `room`, `gear`, `dial`, `leaf`, `garmentPanel`, `clothTrim`, `clothSleeve`, `reactionActing`, `person`, `brassTube` |
| `lib/scene.mjs` | `drawStyle` |

The runtime handles frame export, accepted audio import, mixing, captions and
encoded-file checks. `src/scene.mjs` is the story extension point.
`content/production.json` is intentionally empty. Read `PRODUCTION.md` in the
created project for the executable contract. The source font inventory, hashes
and license paths are in `starter/fonts/manifest.json`.

Material diagnostics exercise tools; they do not reproduce a prior story.
Use an external sealed source bundle for original-sample reconstruction.
See [reproduction](../../methods/reproduction.md).

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/visiontrail/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).
