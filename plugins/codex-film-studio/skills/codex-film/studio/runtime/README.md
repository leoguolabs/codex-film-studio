# Shared film runtime

This directory contains generic production tools, not a film. `new_film.py`
copies it into every renderer-ready blank project as `tools/runtime/`. The style's own
`lib/scene.mjs` supplies its material renderer; `src/scene.mjs` is the extension
point for new drawings and choreography. All paths resolve from the project.

In the generated project:

```sh
npm ci
python3 tools/runtime/build.py --proof
node scripts/render.mjs --frame 24 --proof --out review/proof.png
python3 tools/runtime/build.py --check
python3 tools/runtime/build.py
```

`--proof` renders an explicitly labelled material/animation diagnostic. It is
not a demo story or evidence of reference equivalence. The normal build rejects
empty shots. Fill `content/production.json` and author your own objects/actions.
Existing style-specific contracts remain useful for planning; this file is the
executable delivery timeline. All intervals are integer frames, `[start,end)`.

Each shot has `id`, `start`, `end`, and `layers`. Layers support `type: shape`,
`text`, or `image`, explicit positions, and `motion: {from: [x,y], to: [x,y]}`.
Shapes use `points`, `fill`, and `stroke`; images use a project-relative `file`,
`width` and `height`; text uses a registered `font`, `size`, and `maxWidth`.
Style modules add richer types and expose their original material helpers.
Override `drawFrame(context, state)` in `src/scene.mjs` for authored scenes.
State includes the exact frame, local frame, shot, progress, assets and canvas
dimensions. Camera, captions, narration and effects must derive from this clock.

Declare every image in `assets` as `{file, sha256}` and every font in
`fonts/manifest.json` as `{file, family, sha256, license}`. The loader refuses
changed or missing assets instead of silently substituting them. Fonts and their
licenses are shipped with the project. New languages need explicit glyph checks.
Data files use `{file, sha256, type: "json"}` and are available through the same
asset map. Unsupported asset types fail validation.

Audio entries are `{file, sha256, start, end, role, gain}`. `role` is `voice`,
`music`, or `effect`; gain is a linear multiplier. `end-start` must contain the
complete recording. Voice is never stretched or clipped. Supply recordings or
use the TTS contract in TECHNIQUE.md, then bind the accepted WAV hash. An empty
soundtrack requires `silent: true`. The mixer ducks music under the voice bus.
Caption entries are `{text,start,end}` and must be non-overlapping. The build
exports VTT/SRT from those same frames, burns them into the picture, and records
input hashes and tool versions. Caption styling can be overridden in scene code.

The encoder uses explicit RGB→BT.709 limited-range conversion, then fully
decodes the MP4 and checks frame count, dimensions, cadence and audio duration.
It refuses to overwrite existing output; use a new `--out` path for revisions.
The technical report leaves visual/motion/listening review unperformed. Use the
copied frame-review tools and record those observations separately.

To reproduce an existing film, use a sealed external reproduction bundle;
see `methods/reproduction.md`. A generic material proof cannot replace the
original scene composition, source assets, audio or production settings.

## Preview and environment

```sh
npm run doctor
npm run check
npm run preview -- --start 72 --end 120 --width 640
npm run verify -- media/preview.mp4
npm run serve -- --port 8249
```

Frame endpoints use the source FPS (at 24 fps, 72–120 is seconds 3–5).
Preview keeps authored coordinates and downsamples only after drawing. Audio and
captions are cut to that same interval and start at zero in the delivery. The
preview defaults to eight seconds and 640 pixels wide. All commands run after
`npm ci`, with Python 3.11+ and FFmpeg/FFprobe on PATH. No Python packages or paid
services are needed by this runtime. Node 20+ is required; CI uses Node 24.
`verify` rechecks the delivery hash and complete decode against its JSON receipt.
The loopback preview server serves the project on the requested port.

For a deterministic integration test in an **empty external test project**, run
`node tools/runtime/smoke_inputs.mjs`, then `npm run build`. This explicitly
synthetic six-second fixture exercises each style's available mechanism, imported
PCM in voice/music/effect buses and captions. It is an engineering input, not a
starter story, real survey, original-sample reproduction or style-match verdict.
The library's `scripts/smoke_render.py --style ID --output /external/NEW` runs this
from a fresh copy and checks nonzero-start preview sound onsets as well.

Nested `group` layers retain a shared local pivot for authored limbs and props.
`motion.rotation: [from,to]` animates that pivot; `motion.holdFrames: 2` holds
poses on twos while the main frame clock stays continuous. Supply your own
geometry and identity; the runtime supplies no story cast.

Exploded Teardown additionally requires `npm run setup-renderer` after `npm ci` (Linux CI: `npx playwright install --no-shell --with-deps chromium`). See its README for the 3D model contract and documented limits. Its headless engine is isolated from interactive browser profiles.

Output height is the nearest even integer, with exact half-way values rounded upward in both Python and JavaScript. Thus a 16:9 source at `--width 720` exports 720×406; receipts record the actual dimensions.
