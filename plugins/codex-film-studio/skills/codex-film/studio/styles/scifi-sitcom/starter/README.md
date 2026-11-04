# Your sci-fi sitcom production

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


This is an empty project. Start with [STYLE.md](STYLE.md),
[WORKFLOW.md](WORKFLOW.md) and [REVIEW.md](REVIEW.md).

Fill `content/brief.json`, `characters.json`, `sources.json`, `dialogue.json`,
`voice-inputs.json` and `shot-plan.json` for the new subject. After accepting the
audio, write `timeline.json` and the reference-role map in `reference-map.json`.
The empty arrays are intentional; there is no default story, cast or country.

Author a composition that imports `lib/ink.mjs` and `lib/timeline.mjs` if useful.
These modules work with standard JavaScript and a Canvas 2D context; they do not
include a story renderer, font bundle, TTS client or automatic film generator.
Node.js 20+ runs the included tests without installing packages:

```sh
node --test tests/*.mjs
```

Store footage and sound in `assets/`, exports in `media/`, and inspection evidence
in `review/`. Keep originals and accepted input hashes. Private provider settings
belong in environment variables or external configuration, never committed here.
If this directory is versioned, review its ignore rules before adding any files.

`tools/frame_review/` contains the copied shared decoding/comparison tools.
Install its documented dependencies only if using them. They generate evidence;
they do not watch images or listen on your behalf. Use the copied `ffmpeg_gate.py`
for FFmpeg subprocesses when sharing the machine with other film tasks.
