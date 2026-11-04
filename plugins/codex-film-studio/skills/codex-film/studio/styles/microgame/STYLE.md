# Microgame

A command, one physical action, an outcome, then a return to the same show stage.
The emotional continuity comes from a protagonist and a limited life counter;
the visual discontinuity comes from switching physical media for each task.

Based on visual study of [Lemomo's Microgame film](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/microgame.mp4)
and its [style description](https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/microgame).
The retained helpers are independently written. Upstream composition, story,
characters and score are not included.

## Visual construction

Use thick near-black stage outlines, a single hard shadow, a violet sunburst,
magenta, gold and cyan furniture, a marquee, an embedded screen, a trigger and
a life counter. Recompose these for the requested aspect ratio; do not squash
an existing landscape screen into portrait.

Give each medium an actual construction: crayon pigment holes and directional
hatching, wet and dry ink with a single vermilion accent, structural amber ASCII,
misregistered colour plates, indexed pixel buffers, technical line systems, and
black/white/red geometry. A common texture laid over the same vector scene is
insufficient. Framing also changes by task: close-ups for tiny consequential
actions, technical inserts for mechanisms, wider frames for trajectories.
In terminal scenes, build the working objects and readouts from characters as
well as the performer. Preserve role-specific headwear and hand/tool contact;
amber vector icons beside an ASCII figure do not reproduce the same material.

For Swiss scenes, put a large lowercase action word and a short rule on the
grid. Keep them clear of the working hand and object after the command retreats.
For pixel scenes, quantize the small drawing buffer to an explicit palette
before nearest-neighbour enlargement; downscaling alone retains intermediate
antialias colours. Use an ordered stipple whose sparse rows alternate their
filled columns, and align its top surface with the character contact plane.
Draw the performer from square clusters, stepped contours, short solid limbs
and hard light/shadow planes. Extend the ground to the frame edge and vary its
horizon while preserving a flat contact pad beneath standing feet.
For blueprint inserts, let the working mechanism occupy the main field while
keeping the character in a separate small inset; check the whole action,
including travelling parts, at the larger scale. Use separate fine contour,
internal and hidden lines instead of scaling a thick icon outline. Keep
dimension labels clear of the fuse and draw confirmation in the same
technical vocabulary. Check these at the encoded output resolution.
Use an assembly view with connected supports and controls, action-specific
leader notes, a scale rail and a drawing title block. Anchor compression to
the support surface and move the platen to the actual deformed top surface;
follow moving parts with their leader endpoints. Reserve separate space for
the operator inset so it cannot collide with numbered study rows.
Use hand-lettered technical annotations instead of a regular UI face. Register
the OFL-licensed Architects Daughter font under that family name before using
the blueprint helper, and retain its licence with the production's font asset.

Keep two or three identity marks recognizable when the character is redrawn.
Make hands touch tools and make the manipulated object move from that contact.

For the mixed-media climax, combine large coloured print plates with paper
scenery and a receding scored foreground. Keep technical construction marks
local to the mechanism so a blueprint grid does not flatten the whole scene.
Check that the background has comparable visual density to the reference while
the working silhouette, command, status panel and fuse remain readable.
Do not use decorative arm motion as a substitute for performing the action.

## Landscape editions

`engine/widescreen.mjs` supplies an independent 16:9 layout vocabulary: uniform
action cameras, a wide fuse and replay strip, viewport-sized material passes,
technical annotations and a printed climax background. The portrait helpers
remain the default. Story-specific stage furniture, shot layout and action
selection belong to the production.

`drawGame` accepts optional `camera`, `background`, `groundBounds`, `finish`,
`noAnnotations` and `noHud` fields. The camera moves the action and its contacts
together; callbacks place the background and annotations in viewport coordinates.
The caller supplies a surface at the intended material resolution, runs the
material pass over that whole surface, then places the HUD. Pixel scenes still
use the indexed small buffer before nearest-neighbour enlargement.

For each delivery shape, recompose the show stage and embedded screen, return
and trigger zooms, reel windows, montage cards and climax panels. Keep the source
aspect ratio of inserted scenes through every transition. Check the complete
host silhouette and route blueprint leaders outside their labels. Follow the
shared [aspect-ratio method](../../methods/aspect-ratio-editions.md).

## Timing and sound

Use an integer-frame timeline shared by shots, commands, actions, score, voice
and foley. Increase tempo, character cadence, task compression, command hold and
home-stage dwell together. Early characters can step at 8 fps while the timer
and camera remain smooth. Preserve anticipation and a clear result hold.

Commands slam with an oversized first frame, settle, then shrink to a corner
before the action. Remove the burst behind the corner tag. Transition through
the embedded screen. At acceleration, reels of past game frames stop one per
beat. A failure changes the life counter and has a physical consequence. Replay
important failures with a frozen timer. A final challenge combines past media
and uses a previous failure as its solution.
Replay uses a black broadcast strip, a red record dot, half-speed indication
and a source-time readout that advances with the replayed action.
Frame each replay around the failed contact and its consequence. Account for
the source scene's existing camera scale; check its beginning, impact and end
so enlarging a failure does not crop away the broken or spilled object.

Use a continuous rhythmic score with medium-specific instruments and foley.
Leave a real quiet interval before the final impact. Short commands need
independent speech checks; provider generation success does not establish
pronunciation, intelligibility or absence of extra speech.

## Review

The engine is a toolkit under development, not an accepted film or a validated
style match. Inspect complete encoded-frame coverage, actual sequential images,
native-size critical details, normal-speed playback and final-file audio. Record
the size at which frames were inspected. Contact-sheet generation is not visual
review. No metric or checklist establishes 100 percent perceptual identity.
