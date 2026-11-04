# Independent Exploded Teardown production

This project contains an offline Three.js renderer and shared picture/audio pipeline.
Supply new geometry, evidence, narration and timing; no previous sample story or CAD is inherited.

```sh
npm ci
npm run setup-renderer
npm run doctor
npm run proof -- --width 640
```

Node 20+ (CI: 24), Python 3.11+, FFmpeg/FFprobe and the pinned Chromium render engine are required. On Linux CI install its system libraries with `npx playwright install --no-shell --with-deps chromium`. This engine is an isolated, headless WebGL computation process; it uses no user browser profile or external service. Interactive review may use your preferred browser, including Ego Lite. `doctor` reports a missing engine and the install command.

`content/film.json` records the object's sources and modeling assumptions. Author the frame timeline in `content/production.json`. Each shot uses `assembly: {file: "assets/object.json", camera: {azimuth: 32, travel: -30, elevation: 28}}`. Register that file as a hash-pinned asset with `type: "json"`. Camera angles are degrees; the renderer keeps the camera outside the full assembly bounds, including separated positions.

The model is `{illustrative: true, parts: [...]}`. Each part needs a unique `id`, `shape`, `position: [x,y,z]`, positive `size: [x,y,z]`, `explode: [dx,dy,dz]`, and `material: {color: "#727b85", roughness: 0.25, metalness: 0.9}`. Optional `rotation` is Euler XYZ radians, `delay` is 0–0.12 of the shot and `label` is at most 28 characters. `labelSide` is `left` (default) or `right` and stays fixed across the shot to prevent jumps at screen center. Supported geometry: rounded box, plate with optional circular `holes: [[x,z,radius],...]`, cylinder (size X/Z are top/bottom diameters), sphere, or mesh with finite non-indexed triangle `vertices`. Mesh size is descriptive; vertices carry actual dimensions. Use consistent units. Model recesses, holes and mating faces with authored triangle geometry or component groups. This is not text-to-CAD.

The reusable scene supplies PBR material response, warm key/cool rim lighting, environment reflections, soft shadows, staggered separation/return, an outside camera orbit and projected labels above the caption safe area. Cinematic DOF/bloom, moving hinges, curved camera paths and subject-specific close-ups remain authoring work; the retained original sample packs contain those richer compositions.

Import accepted voice/music/effect files and captions using PRODUCTION.md. After authoring:

```sh
npm run check
npm run preview -- --start 0 --end 144 --width 640
npm run build
npm run verify -- media/film.mp4
npm run serve
```

For a separate six-second engineering exercise in an empty project, run `node tools/runtime/smoke_inputs.mjs` then `npm run build -- --width 480`. Its calibration assembly and sync tones are new synthetic inputs, not either published sample. The two-second proof checks materials only.

Read STYLE.md, DIRECTOR.md, TECHNIQUE.md and methods/. Record technical, still-frame, motion and listening reviews separately. Preserve output receipts; successful encoding is not artistic acceptance. Exact replay uses an external source bundle and its REBUILD.md, not this starter.
