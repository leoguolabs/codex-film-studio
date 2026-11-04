# Independent caption-led production

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


Fill `content/brief.json`, then author the inputs described in [INPUTS.md](INPUTS.md).
Read [STYLE.md](STYLE.md), [WORKFLOW.md](WORKFLOW.md), [REVIEW.md](REVIEW.md)
and [the shared methods](methods/README.md) in the generated working copy.

`lib/caption.mjs` provides deterministic entrance and highlight progress.
`lib/scene.mjs` and the shared runtime turn authored headlines and media layers
into frames, mix imported audio, and export the film. Licensed fonts and pinned
dependencies are included; supply the subject's own media. Verify caption timing
helpers with `node --test tests/*.mjs`.

Import recordings or configure a voice provider in the external environment.
Preserve accepted takes and measure timing before finalizing the edit. Source
media, extracted frames, captions, audio, delivery files and review evidence all
stay here. No previous film's narration, people, brands or facts are supplied.
