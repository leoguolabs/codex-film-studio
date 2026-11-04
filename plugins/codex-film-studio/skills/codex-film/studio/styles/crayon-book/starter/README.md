# Your crayon picture-book project

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


This project contains material tools and an empty `input-contract.json`.
Read `STYLE.md`, `WORKFLOW.md` and `REVIEW.md`, then supply your own subject,
characters, shots, narration and music. Extend the supplied scene renderer as needed. No film has been generated.

Run `npm ci` to install the pinned Canvas and OpenType dependencies.
The optional `scripts/synthesize_paper.py` needs Python, NumPy, SciPy and Pillow.
Use the copied `tools/frame_review/` for encoded-file inspection. Keep source
assets, provider records and outputs in this external project.

Use `Wax.reveal(key, progress, draw)` for each independent contour/colour group.
Register a licensed font with `registerWaxFont(name, bytes)` as well as the
Canvas font registry when letters need continuous path drawing. Configure
material options using `STYLE.md`; choose values from native-resolution proofs.

For a physical book reveal, keep the drawing attached to its page and use
`lib/book-camera.mjs` to move the whole desk/book scene. Run
`node scripts/check_book_camera.mjs` for the geometry checks; inspect encoded
motion and surface lighting separately.

For selected soft contours, use `lib/contours.mjs`; open paths preserve their
contact endpoints. `Wax.withHatchFlow` adds fixed curvature to broken pigment
passes. Run `node scripts/check_soft_forms.mjs` and inspect the partial draw-on
stages before adopting either control.
