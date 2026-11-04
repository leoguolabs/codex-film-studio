# New Art Deco production

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


Read `STYLE.md`, `DIRECTOR.md`, `TECHNIQUE.md`, `WORKFLOW.md` and `REVIEW.md` before authoring.

`content/film.json` is an empty input contract. Use integer frame intervals `[start, end)` and keep narration, camera, captions, animation and sound on this timeline.

`lib/material.mjs` exports Canvas 2D primitives: metallic `gold`, `line`, `poly`, `arch`, `fan`, `rays`, `bulb`, `plaque`, `brassTube`; `camera` and `ppoly` for projection; and `person` for articulated figures. Its internal coordinate system is 1080×1920. Scale the context uniformly to the output size. Functions are deterministic in their explicit time argument. `person` supports `greenUniform`, pose, emotion, gaze, head tilt and local hand targets; the production must author valid reachable targets and stage body placement.

The shared runtime installs from a lockfile and renders through `scripts/render.mjs`. Use a browser Canvas 2D context or a compatible raster implementation, load Limelight/Poiret One/Josefin Sans before drawing, and author new scene layers or extend `src/scene.mjs` for the new story. A successful primitive render is not a complete film.

`lib/finishing.py` reads `content/finishing.json` with `encoding_finish(path)` and returns an FFmpeg video-filter string, extra encoder arguments and a hash-bound profile record. The supplied profile adds restrained seeded temporal luma grain after conversion from full-range BT.601 image input to limited-range BT.709 YUV420P. It is calibrated for 1080×1920 H.264 at CRF 16 with the medium preset; retain explicit BT.709 output tags and recheck the encoded texture for other formats or settings. The helper does not launch FFmpeg. Keep the returned record beside the encoded film, and use the shared gate for the actual encoder call.

Store generated media, source reference files, audio and reviews locally under ignored directories. Use `tools/frame_review/ffmpeg_gate.py` before launching FFmpeg when other productions share the host. Use `tools/frame_review/audit_frames.py` for complete frame coverage, then perform and record actual visual/audio review.
