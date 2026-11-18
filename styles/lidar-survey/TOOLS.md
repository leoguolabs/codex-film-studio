# LiDAR Survey production tools

The starter includes a local-coordinate CSV importer, hashed JSON data loading,
camera projection, depth ordering, height/class point colours, canopy masking,
raking-lit surface triangles, scan fronts and anchored sections. Point coordinates
are retained unchanged. Supply verified data and authored survey layers; no site
or measurements are invented. Large LAS/LAZ production surveys retain their native
WebGL pipeline in the external source bundle.

Run `npm ci`, `npm run proof`, or `python3 tools/runtime/build.py --proof` in a fresh
project. The 48-frame proof is explicitly synthetic. Author `content/production.json`
for the film and declare survey assets with `type: "json"` and SHA-256. A `survey`
layer names its `file`, camera, scan/cut, optional triangle surface and section.
Use `scripts/prepare_survey.py --help` for data provenance and coordinate inputs.

Licensed Barlow Condensed and IBM Plex Mono fonts, a pinned dependency lock,
audio mixing, captions and decoded-output validation travel with every new project.
For the original film's exact point data, shaders, camera and accepted recordings,
restore its external source bundle using `--replay-bundle`; do not substitute the
diagnostic surface for measured terrain.

Use `npm run doctor`, `npm run preview -- --start 0 --end 96 --width 640`, `npm run build`, `npm run verify -- media/film.mp4` and `npm run serve` in the independent project. Frame ranges use the production FPS. Original-source availability and rebuild scope are listed independently in [the capability table](https://github.com/visiontrail/codex-film-studio/blob/main/styles/README.md#capabilities--能力与网页).
