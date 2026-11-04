# Independent chart production

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


1. Fill `content/film.json` with sourced observations, metric definitions and a frame-based event plan. Keep missing observations missing until an explicit policy is chosen.
2. Author chart scenes and the score using `lib/chart.mjs` and the shared runtime. The style guide explains the visual vocabulary; this folder intentionally contains no example composition.
3. Install `requirements-review.txt` in a production-local environment when using the review utility.
4. Run `python tools/review_frames.py VIDEO OUTPUT_DIRECTORY` to decode every frame and create the frame ledger. Add `--sheets` to retain consecutive thumbnail sheets.
5. Inspect the images and motion, record actual coverage, repair findings and verify the final encoded file.

For shared macOS/Linux encoding capacity, run `python tools/ffmpeg_gate.py ffmpeg ...`. Cooperating jobs share a file lock; the gate also waits while an existing `ffmpeg` process is visible. It never terminates another process. Set `--lock` consistently if a different shared path is required. Non-cooperating jobs can still start after a process scan, so coordination is best when all jobs use the gate.

Keep all generated content in this independent production directory.
