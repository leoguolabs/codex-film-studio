# Independent art-collage production

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


This is an empty production starter. Fill `content/brief.json`, write a new
story and shot plan, then supply required portraits in `content/characters.json`.
No scene, narration or identity from a previous production is included.

For each specific real person, record an `id`, `kind: "real"`, `name`, `portrait` local path,
`source: "user-supplied"`, and optional `crop: [x, y, width, height]` in pixels.
Ask the user for a missing portrait. Use `kind: "anonymous"` for an intentionally
fictional character; design that character for this production.

Run `npm ci` with the supplied dependency lock. `lib/paper.mjs` provides
surface and cutout primitives; author scene layers around the new shot plan.
Read `METHOD.md` for production and verification steps. Keep inputs, finished
media and review records here, outside the method library.
