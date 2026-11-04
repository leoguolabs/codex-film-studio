# Newsreel · executable package

Create with `python3 scripts/new_film.py NAME --style newsreel`.
In the external project run `npm ci`, then `npm run proof`.
Read `PRODUCTION.md`, author scenes in `src/scene.mjs`, fill the empty
`content/production.json`, and run `npm run build`.

`lib/newsprint.mjs` supplies warm print finishing, a narrow film gate's
supporting treatment, deterministic exposure/grain, nine-card montage timing,
left-spine turn geometry, and iris/blinds/clock masks. `lib/scene.mjs` connects
those tools to the shared renderer. Story images, card contents and narration
are inputs. Fonts and licenses are included in `starter/fonts/`.

The runtime exports frames, accepted audio, captions and a verified encoded
file. A proof is a diagnostic, not an original-sample reconstruction. Restore
a sealed external source bundle for the latter; see
[reproduction](../../methods/reproduction.md).

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/visiontrail/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).
