# Whiteboard production tools

The existing editable sample remains the style's rendering source. Create its
external working copy with `scripts/new_film.py NAME --style whiteboard`, then
run `npm ci`. For the released sample, follow `scripts/fetch_demo.py` in that
project or restore the sealed external source bundle. Accepted narration and
alignment remove a TTS dependency during exact replay.

`node scripts/render.mjs --stills --times 2` produces a native still;
`python3 scripts/build.py` runs rendering, mix, metadata, decode verification
and evidence generation. Short and long editions use the retained edition
selection. `npm test` checks timeline and drawing choreography. Follow the
sample's own README and STYLE.md for fonts and the English-lettering constraint.

New subjects require new narration, drawings, choreography and reviewed sources.
The existing renderer, eraser, stroke planning and shared frame tools remain
available. Evidence generation does not replace visual or listening review.
