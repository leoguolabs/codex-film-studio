# Crayon Picture Book · executable package

Create with `python3 scripts/new_film.py NAME --style crayon-book`.
Run `npm ci` then `npm run proof` inside the external project.

| Module | Public tools |
| --- | --- |
| `lib/book-camera.mjs` | `bookCamera` |
| `lib/book-motion.mjs` | `bookMotion`, `leafStrips` |
| `lib/contours.mjs` | `roundCorners` |
| `lib/desk.mjs` | `deskTexture`, `shadeSpread` |
| `lib/leaf-raster.mjs` | `rasterizeLeaf` |
| `lib/material.mjs` | `registerWaxFont`, `W`, `C`, `clamp`, `ease`, `paperTexture`, `Wax`, `composite` |
| `lib/scene.mjs` | `drawStyle` |

The runtime handles frame export, accepted audio import, mixing, captions and
encoded-file checks. `src/scene.mjs` is the story extension point.
`content/production.json` is intentionally empty. Read `PRODUCTION.md` in the
created project for the executable contract. The source font inventory, hashes
and license paths are in `starter/fonts/manifest.json`.

Material diagnostics exercise tools; they do not reproduce a prior story.
Use an external sealed source bundle for original-sample reconstruction.
See [reproduction](../../methods/reproduction.md).

`page-turn` layers connect the retained projected leaf geometry and rasterizer
to the executable timeline. Supply declared `frontFile`/`backFile` images,
`x`/`y` hinge, `width`/`height`, local `start`/`end` frames, optional `curl` and
`profile` (`rounded` or `hinge`). The source-page image stays attached to the
curved sheet; occlusion and face selection follow its projected strips.

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/visiontrail/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).
