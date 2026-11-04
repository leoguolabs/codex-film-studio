# Independent vector-science production

A `body` takes positive ellipse radii `rx`, `ry` and material colours
`fill`, `shadow`, `highlight`. A `ribbon` takes four local Bézier control
`points`, a `fill` and half-widths `rootWidth` and `tipWidth`. Optionally
set four `pointsTo` to deform it through the shot. Draw the ribbon before
its host body to tuck its root underneath.

The existing `npm run proof` command creates the abstract material still.
Use `npm run proof:video` for the animated diagnostic.

In the independent project, run `npm ci` and `npm run doctor`. Fill
`content/production.json` with your frame rate, duration, shots and audio
(or set `silent: true`). Put the material layers inside each shot's `layers`
array. Use `npm run preview` for a timed excerpt and `npm run build` for
`media/film.mp4`. PRODUCTION.md documents the timeline, text, image and
group layers. Extend `src/scene.mjs` for subject-specific drawings.

Install `requirements.txt` into a private Python environment for the generic
analysis tools. Invoke `python tools/scan_frames.py VIDEO OUTPUT_DIRECTORY` to
index every decoded frame and create consecutive atlases. This only creates
review material. Inspect it, record the actual visual coverage, and verify the
encoded delivery separately. See WORKFLOW.md and REVIEW.md for shared methods.

Use `python tools/compare_style.py REFERENCE_SCAN OUTPUT_SCAN COMPARISON_DIR`
to create one correspondence row per output frame. Open `tools/inspect.html`
locally, load both videos and that CSV, and step through the retrieved pairs.
The player shows requested frames and browser media timestamps separately.

For a manually selected comparison, fill `content/role-map.json` and run
`python tools/align_roles.py content/role-map.json COMPARISON_DIR`. Record the
decoded frame counts, rates and file hashes. Each segment needs an `id`, `role`,
`phase`, `reason`, an `output` interval and a `reference` interval. Intervals are
zero-based `[start, end)`; the output intervals must cover the entire film in
order. Set `reference` to `null` and explain why when no suitable counterpart
has been selected. The tool preserves these unmatched rows, normalizes phase
inside matched intervals and rejects gaps, overlaps and out-of-range frames.
Inspect the chosen intervals before describing them as a meaningful comparison.

After a revision, `python tools/compare_encodes.py BEFORE AFTER OUTPUT_DIRECTORY`
compares every decoded RGB frame, writes per-frame differences and summarizes
changed ranges. It requires equal frame counts and geometry. Use the ranges to
target reinspection; they do not measure artistic similarity.

`tools/media_guard.py COMMAND ...` waits for an existing ffmpeg process and
serializes cooperating local media work. It uses a POSIX advisory lock and
`pgrep`; Windows needs an equivalent platform-specific process gate. It cannot
prevent an unrelated application from starting ffmpeg after the initial check.
