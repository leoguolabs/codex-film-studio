# Microgame Frenzy · executable package

Create with `python3 scripts/new_film.py NAME --style microgame`.
Run `npm ci` then `npm run proof` inside the external project.

| Module | Public tools |
| --- | --- |
| `lib/scene.mjs` | `drawStyle` |
| `engine/` | Material, character, action and widescreen helpers copied with the project |

The runtime handles frame export, accepted audio import, mixing, captions and
encoded-file checks. `src/scene.mjs` is the story extension point.
`content/production.json` is intentionally empty. Read `PRODUCTION.md` in the
created project for the executable contract. The source font inventory, hashes
and license paths are in `starter/fonts/manifest.json`.

Material diagnostics exercise tools; they do not reproduce a prior story.
Use an external sealed source bundle for original-sample reconstruction.
See [reproduction](../../methods/reproduction.md).

The action engine uses 30 fps and a 540 × 960 logical portrait stage (uniformly
scaled to portrait output). A shot's `game` object supplies `medium`, `action`,
`object`, `command`, positive `character_fps`/`bpm`, `round` (0–2), and boolean
`success`; explicitly author the production's `hero` or replace the performer
in `src/scene.mjs`. Material-only proofs do not exercise a game action.
For landscape composition use `engine/widescreen.mjs` with a new camera/layout;
the original landscape films are retained in the external source bundle.

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/visiontrail/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).
