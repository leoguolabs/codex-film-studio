# Author a new geographic film

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


This folder starts empty. No film has been generated or accepted.

1. Fill `content/brief.json`: subject, viewer, question, language and delivery.
2. Read [STYLE.md](STYLE.md), [WORKFLOW.md](WORKFLOW.md) and [INPUTS.md](INPUTS.md).
3. Source the actual location and dates; use [FOOTAGE.md](FOOTAGE.md) for real clips.
4. Author the edit with `lib/scene.mjs` and `lib/terrain.mjs`; `lib/geo.mjs` supplies the shared geographic camera math.
5. Review and deliver the encoded file using [REVIEW.md](REVIEW.md).

The project creator also supplies `prompt.txt`, `PROVENANCE.md`, `LICENSE`,
`METHOD.md` and `tools/frame_review/`. Read the tools' README before installing
optional media dependencies. `node --test tests/geo.test.mjs` runs the math checks
without a package install. The docs' production commands are steps to implement
or use with real inputs; this starter does not promise a one-command film build.

Keep source media, provider responses and exports here, outside the method
library. Keep credentials in environment variables or an approved private
configuration, never in narration, source ledgers or Git. Return only generic
improvements to the library.
