# Crayon Picture Book · Style guide

A subject-independent material and production method for tactile, hand-drawn
picture-book films. Start a production in an external directory and fill in
`input-contract.json` there. This directory contains no example story, cast,
narration, edit, media or acceptance record. It is registered as a material toolkit in `styles.json`. Its tools do not
establish that an arbitrary render matches a reference.

## Visual grammar

- Warm ivory paper with multiscale fibre relief. Treat paper as a surface under
  the drawing: a camera move carries both grain and pigment, while illumination
  can stay in camera space. Keep fine tooth, broader relief and longer fibres
  separately adjustable; compare the encoded texture at its intended scale.
- Dark indigo contours with restrained position and pressure variation. Keep
  eyes, mouths and small text readable; do not erode every object equally.
- Wax deposited in directional passes with irregular uncovered paper. Vary
  pressure by pigment and by form. Allow small, intentional strokes outside
  boundaries instead of applying the same speckle mask to every shape. Subdivide
  long polygon edges with small seeded displacements; protect tiny features.
- Handwritten titles and captions with stable baselines and explicit safe areas.
  Text must remain legible at the delivery resolution and a smaller player size.
- Poses may hold for two frames while camera motion remains continuous. Derive
  all state from the requested frame so arbitrary seeking stays deterministic.
- Reveal actual drawing strokes in order. Where the reference separates line
  drawing and colouring, keep separate stroke budgets for those passes. Drawing
  one fully coloured object after another is a visibly different reveal.
  `Wax.outlineOnly`, `strokeBudget` and `fillBudget` permit independent stages;
  `begin(frame)` resets their state so the caller sets them after each begin.
  A wash advances with brush bands,
  bristle variation, pooling edges and wax resistance.
- Give every new element its own contour and pigment progress, including late
  props, answers and lettering. Trace partial paths to an interpolated endpoint,
  then deposit colour in directional passes. Keep position, scale and opacity
  stable during the reveal; a fade, scale pop or flat fill is not drawing.
  Review each group's onset, partial contour, partial pigment and finished hold.
- A physical book ending needs a hinge, two paper surfaces, self-shadow, gutter,
  desk grain and a camera destination. Combine irregular long fibres, broken
  highlights and broad tonal bands to avoid periodic wood stripes. Preserve contact and continuity through
  the turn rather than treating the image as a flat wipe.

`starter/lib/material.mjs` provides deterministic canvas primitives and wax/paper
compositing. `starter/lib/desk.mjs` provides an independent wood material and spread
lighting. `deskTexture(paper, {meander, wear, layered})` can bend long fibres and vary
local ridge density and contrast; `wear` defaults to 0. Use a fixed seed and
compare both sparse and dense regions rather than adding uniform white noise.
When fine highlights form a regular striped pattern, `layered: true` provides
an alternative built from broad pigment ribbons, pressure-varying dark fibres
and independently masked worn catches. It defaults to false and leaves the
earlier material unchanged. `meander` bends its fibres and `wear` varies its
regional abrasion. All three layers share surface coordinates and fixed seeds.
Judge the result against a native-resolution desk crop, then through a camera
move. Removing every bright scratch can make illustrated wood look artificially
smooth; keep localized dry marks without tracing each groove with a highlight.
The optional `handGrain` control defaults to 0; values within 0–1 widen and bend
the grain and add broader dry catches. Compare several moderate strengths.
For broad bands that overpower the finer structure, `fibreDetail` accepts 0–1
and defaults to 0. In layered mode it reduces broad contrast, increases fine
grooves, and adds long catches with a fixed irregular deposition mask. This
mask breaks smooth highlights into rough marks; it is evaluated in surface
coordinates and never reseeded by the camera. Compare the widest and closest
views, since smooth bright fibres can look plastic even when broad bands improve.
For fibres that remain too continuous, `dryScumble` accepts 0–1 and defaults to
0. In layered mode it reduces the smooth under-grain, adds small sideways
deviations to the catches, and clusters their missing pigment at a shorter scale.
Compare moderate strengths before the maximum: widening and brightening every
catch can create large gold patches that compete with the drawing. Balance
particle size, local pressure and density together; do not try to fix this by
adding white noise over the book. Keep the paper interior and lighting fixed
while comparing native-size stills. A selected still remains a trial until the
encoded pullback and push-in have been inspected for shimmer and bright bands.
Run `node scripts/check_desk_material.mjs` for material invariants, then inspect
the encoded camera move for shimmer and excessive bright-line density.

Carry the selected wax settings into secondary drawing surfaces as well as the
main illustration. A fresh pen instance with default settings can leave desk
props thinner or more geometric than the story drawing. Copy material settings
explicitly, without sharing canvases, reveal budgets or temporal state. Judge
small tools at their final camera size: distinguish the handle, grip and tip,
and use sparse lengthwise wax catches to describe a rounded side. Compare the
original, shared-material and local-detail trials before changing production.
Keep the book interior and camera fixed during this comparison; a stronger
white accent is not automatically a better material match.

Keep paper fibre direction separate from the direction of individual crayon
passes. Stretching one grain field across the whole image can put identical
slanted scratches on unrelated forms. Compare several colours and differently
oriented shapes before accepting a grain change; retain a rejected trial so
later revisions do not repeat it.

`shadeSpread(context, x, y, pageWidth, height, {tableLight, paperLight})` adds a fixed warm
light pool with asymmetric edge falloff; `tableLight` defaults to 0. Compare
paper illumination separately from the underlying paper colour and relief.
The optional `paperLight: true` selects an alternative tint/illumination/falloff
model; it replaces the older `tableLight` model rather than stacking with it.
Use this when accumulated brown overlays make the centre of a blank spread
too dark. Inspect several paper patches and the encoded grain, not only a mean.
Use the same shaded reverse surface during a page turn and after it settles,
and reverse the texture coordinate order when the page faces away. Inspect
the last turning frame and first settled frame for brightness and grain jumps.
These controls have no scene or character knowledge. Copy them into an external
project, install the dependencies from `starter/package.json` there, and author the
production-specific composition separately. In a generated working copy, these
files are at `lib/` and `package.json`, without the `starter/` prefix.

`starter/lib/book-camera.mjs` frames a drawing on a fixed physical page. Pass
`bookCamera(progress, {width, height, page: {x, y, width, height}})` and apply
the returned scale and translation to the complete book/desk scene before
drawing it. Keep the illustration inside its page rectangle throughout the
move. The camera pulls back, holds for the turn and pushes toward that page;
`revealEnd`, `pushStart` and `finalScale` control those phases. A page with the
output aspect ratio covers the initial viewport exactly; other ratios use a
cover crop. Page bounds must fit inside the scene and final scale must be at
least one. Camera centres are constrained to prevent empty canvas edges;
choose framing that avoids hitting that constraint during a smooth move.
Do not shrink an independently composited image while leaving its paper and
hinge stationary. Inspect the first moving frame, the middle of the pullback,
the page settlement and the final crop at native resolution. Run the generic
`scripts/check_book_camera.mjs` in the working copy to check camera geometry.

Inspect the cover and exposed sheet stack at the closest camera position as
well as the wide spread. A small source-space offset can become a broad band
after the push-in. Give the cover its own material colour and restrained corner
radius; show paper thickness as a thin edge. Keep the illustrated page plane
and hinge fixed while refining those surrounding layers, and verify that text
and leaf registration do not change.

`starter/lib/book-motion.mjs` separates camera and page timing. Pass
`bookMotion(frame, {start, revealEnd, turnStart, settle, pushStart, pushEnd})`;
all values use the same frame clock. Its `progress`, `revealEnd` and `pushStart`
feed `bookCamera`; `light` controls the illustration's light transfer and `turn`
controls the leaf. The camera holds during the turn and after `pushEnd`. Place
`settle` on the accepted contact sound when audio must remain unchanged.

`leafStrips(turn, {x, y, width, height}, {curl, segments, profile})` returns a projected
sheet in far-to-near order. Each strip has material coordinates `u`/`v`,
projected edges `a`/`b`, a `front` flag and a self-shadow strength. Use front
coordinates `u` to `v`, and reverse coordinates `1-v` to `1-u` on the back.
Both faces may be visible during one frame. The helper supplies geometry, not
a complete renderer; the caller must sample textures, shade and composite it.
`curl` defaults to 1 and accepts 0–1.5; `segments` defaults to 240. Compare
moderate trials at native resolution and retain fixed surface coordinates.
`profile` defaults to `rounded`. The optional `hinge` profile keeps depth
monotonic toward the free edge, bends the sheet near its hinge, and delays the
angular midpoint without moving either endpoint. This gives a straighter outer
span than the rounded bow. Select from consecutive native frames, since global
rotation and local curvature can look similar in a single still. Run
`node scripts/check_leaf_profile.mjs` to check endpoints, hinge attachment,
finite projection and visible front/back coexistence with contrasting textures.
Run `node scripts/check_book_motion.mjs` for generic geometry and timing checks,
then separately inspect the encoded motion and the settled page handoff.

`starter/lib/leaf-raster.mjs` supplies an optional CPU rasterizer for opaque
paper. `rasterizeLeaf(strips, front, back, {width, height, samples})` accepts
`leafStrips` geometry and two `{width, height, data}` RGBA textures. It returns
a `Uint8ClampedArray` for an output image. `samples` is the grid size per axis,
defaults to 4, and accepts 1–4. Resolve the nearest paper surface for each
sample, interpolate perspective-correct texture coordinates, and shade once.
This avoids independent antialiased strip borders and overlapping shade bands.
Use `putImageData` on a separate canvas, then composite that canvas with the
book's camera transform. It is intended for opaque sheets, not stacked
translucent materials. Run `node scripts/check_leaf_raster.mjs`; inspect native
edges, texture and encoded motion separately from the synthetic tests.

For pigment that looks too neatly clipped, `Wax.edgeScumble` accepts a fixed
strength from 0 to 1; its default is 0 and retains the earlier edge treatment.
It places short dry passes along the whole perimeter, using arc length rather
than vertex count or individual segment length. This makes dense circular
outlines and sparse polygons both eligible for boundary overruns. Marks follow
the form's hatch direction and stable seed. Small coloured marks, white features
and indigo shapes retain their original treatment. Inspect faces, grip contacts,
silhouettes and partial colour stages before enabling it for a production.
The strength is material pressure/extent, never a time-based opacity entrance.

## Soft forms without added motion

Design a subject-specific silhouette instead of assembling its finished body
from repeated ellipses and straight limb bars. Use continuous authored curves
for the transitions between masses, with different proportions, joint bends
and resting poses for different subjects. Small eyes or spots may remain simple,
but the outer shape should identify the subject without a label or colour.
Inspect a flat silhouette sheet, then the textured drawing at delivery size.
Recheck every reused scene for changed bounds, occlusion and contact points.

Use `lib/contours.mjs` only on forms whose hard polygon corners are visibly
unwanted. `roundCorners(points, radius, {closed, steps})` creates sampled
quadratic corners; `closed: false` preserves both original endpoints exactly.
The radius is limited by adjacent edge lengths. Apply the same path to the
inner and outer strokes of a limb, and keep grip and foot coordinates shared
with their props. Preserve intentional corners in architecture and tools.
Do not resample already dense curves merely to make every form smoother.

`Wax.withHatchFlow(strength, draw)` bends neighbouring broken hatch passes with
a fixed field in local surface coordinates. It requires formed and broken
hatching; strength is clamped to 0–1 and defaults to 0. Use it selectively where
straight parallel passes flatten a rounded form. The field follows the object's
stable seed and is not animated. Nested calls restore the previous setting,
even if drawing throws. Keep separate pressure, direction and contour controls.

Inspect partial contours, partial pigment, completed silhouettes and contact
poses at native resolution. Clear measured reveal counts after changing paths.
Check arbitrary seeking and encoded motion; a smoother still alone is not an
acceptance result. Run `node scripts/check_soft_forms.mjs` for endpoint, bounds,
determinism and scoped-state checks.

## Paper calibration from a blank sample

When a procedural grain looks like sand instead of paper, isolate a genuinely
blank reference area or frame and compare several texture scales before tuning.
With Python, NumPy, SciPy and Pillow installed, `scripts/synthesize_paper.py`
accepts a reference image and an output path. It removes slow illumination,
smooths the power spectrum, randomizes spatial phase and iteratively matches the
relief histogram. The resulting little-endian float32 map has new spatial
structure. Record the reference license, image hash, seed, output hash and any
render gain in the external production. Keep both input and generated assets
outside this library.

Load the map as a `Float32Array` and pass it to
`paperTexture({reliefMap, reliefGain})`. Its dimensions must match the canvas;
the gain defaults to 1. The map controls visible paper relief; the separate
wax-tooth field still controls pigment deposition. Include the map in render
cache keys. Compare the encoded result, since grading, scaling and compression
change fine texture. Matched statistics and low spatial correlation are process
checks, not proof of identical perceived style.

## Independent pigment and stroke controls

`paperTexture({reliefMap, reliefGain, toothScale})` keeps the visible paper and
original contour tooth unchanged while `toothScale` adjusts the coloured-wax
sampling scale. Its default is 1. Test finer grain against the same picture at
native resolution; making all marks finer can accidentally clean up the dark
contours as well. `Wax.pigmentLift` defaults to 0 and changes coloured-pigment
pressure without replacing the draw-on paths.

`Wax.pigmentResidue` accepts a constant value from 0 to 1, defaulting to 0.
It leaves a thin coloured wax deposit in low paper fibres underneath strokes
that have already been drawn. Use it when exposed-paper pits look too harsh;
it adjusts their contrast without flattening the paper relief. It does not
fill the undrawn interior of a shape. White and indigo marks keep their original
compositing. Compare several strengths at native size, then inspect an encoded
contour-to-colour sequence. Check that blank paper and the contour-only stage
remain identical and that the completed colour still shows directional marks.

Set `Wax.formedHatching = true` to vary pass direction and pressure by stable
shape seed. `withHatch(angleInRadians, draw)` chooses a deliberate direction for
a form, restoring the previous direction afterward. The clipping boundary stays
in object space and the pen rotates within it. Extend rotated pass bounds far
enough to cover the whole form. Keep seeds independent of moving positions so a
hand or prop does not change pigment pressure while it moves.

If native-scale review reveals uniform bands across large coloured shapes,
set `Wax.brokenHatching = true` with formed hatching enabled. It staggers short
pass endpoints, overlaps neighbouring strokes and varies pressure locally.
A number from 0 to 1 controls the pressure variation; 0 disables this option.
White features and indigo marks retain the original pass model so eye whites
and pupils do not acquire the same treatment as foliage. Review their actual
sizes before adopting the setting. Long directional marks may be correct for
a reference; use the option only when a held-frame comparison supports it.

If neighbouring passes form excessively regular light/dark bands, try
`Wax.hatchOverlap` between 0 and 1 with formed and broken hatching enabled.
It broadens the existing directional wax strokes; the default 0 keeps the
previous drawing. Positive values also allow larger indigo fills to use the
broken-pass model, while white fills and small indigo features keep their
existing treatment. The size boundary is 28 by 36 scene units, so verify the
actual displayed feature sizes after transforms. Excess overlap can flatten
the drawing: compare native-size trials and reject a setting that removes the
reference's directional marks. Keep the value fixed during a reveal and clear
cached reveal counts when changing material settings for an experiment.

`Wax.hatchGesture` accepts a fixed strength from 0 to 1, defaulting to 0.
With formed and broken hatching enabled, it extends pass lengths and varies
spacing, bend, width and pressure over neighbouring passes. The field stays in
form coordinates. White and indigo fills retain their existing treatment;
small shapes receive no change, and yellow and peach receive less variation.
Use it when a reference has coherent long marks and the current fill reads as
short, regular segments. Greater randomness is not automatically a closer match.
Large pressure changes can create bare-paper blotches after grain compositing;
keep those changes restrained and compare several pigments at native size.
Clear reveal counts between trials. Run `node scripts/check_gesture.mjs`, then
inspect a complete encoded drawing sequence before a full export.

`Wax.hatchPressureDrift` accepts a fixed strength from 0 to 1, defaulting to
0. With formed and broken hatching enabled, it varies deposited pressure along
a pass using a field shared by neighbouring passes in the same form. Independent
per-pass variation can disappear under overlaps; a shared field creates gradual
changes in local density. It does not alter paper grain, outlines, pass geometry
or stroke order. White, indigo and very small shapes retain their old pressure.
Keep the gradient anchored to the full stroke while a reveal exposes only its
prefix; recalculating it from the partial endpoint changes already drawn marks.
Store the pressure field with queued occlusion strokes and replay it under the
same transform. Compare several pigments and scene scales for unwanted broad
pale patches. Run `node scripts/check_pressure.mjs`, then inspect an encoded
contour-to-colour sequence. This control is optional; its invariants do not
establish perceptual equivalence to a reference.

For overlapping drawings, `Wax.strokeOcclusion = true` removes lower-layer
marks only beneath the pigment strokes that have actually been revealed. It
queues each visible stroke with its transform, erases its footprint in device
coordinates, then replays its original colour and pressure inside the shape
clip. The contour-only stage keeps the interior visible; there is no early
solid silhouette or opacity ramp. This also avoids background ghosts observed
with transformed `destination-out` operations in the Canvas runtime.

The option is off by default to preserve existing compositions. Its device-space
stroke width supports translation, rotation, reflection and uniform scaling;
nonuniform scaling or shear requires a different footprint implementation.
Replaying a captured matrix can slightly change antialiasing at stroke edges.
Test translated overlapping primitives, partial reveals and out-of-order seeks,
then inspect the encoded drawing sequence. Check fine eyes, light features and
dark footwear separately: removing lower-layer pigment may expose more paper
tooth than the old accidental overprint. Gaps between wax strokes intentionally
retain the lower layer; this option does not make every closed shape opaque.

`Wax.organicContours = true` adds gradual stroke-width variation along indigo
contours. `Wax.contourPressure` defaults to 1 and scales pressure only on indigo
contour strokes up to 6 scene units wide, excluding pigment passes and glyphs.
Lower values expose more paper tooth inside the line. Choose the value from
native-resolution comparisons of broad outlines, fine limbs and internal face
marks; excess erosion can turn a closed contour into a broken silhouette.
Keep the value constant over time. This is a material setting, not a reveal
opacity envelope. `Wax.protectSmallMarks = true` increases pressure on small dark marks;
check pupils, nostrils and mouth shapes at their displayed sizes instead of
eroding them as heavily as a large coloured field. These options are off by
default. Their native-resolution and encoded motion proof belongs to the new
production; the toolkit supplies no universal material acceptance setting.

Repeated objects should share a design without sharing every pen mark. Wrap a
repeated drawing in `Wax.withVariant(stableKey, draw)` to give it a stable
identity. The key changes local hatch, pressure and contour seeds, and adds
small smooth displacements inside larger shapes while preserving their bounding
extremes. Nested keys distinguish components within an object. Keys must not
contain the current frame, moving coordinates or draw-order counters; retain
the same key when an object returns. Leave identifying facial marks and exact
contact geometry outside a variant scope unless separately reviewed.

The scope restores its previous seed even when drawing throws. A null or zero
key inherits the current scope. Set `Wax.variantStrength = 0` before drawing to
disable variant scopes for a controlled baseline; 1 uses the normal shape
variation. Calls outside a variant scope retain the original material. Compare
both repeated objects and a return to the same object, then recheck draw-on
budgets and out-of-order seeks. Different seeds alone do not establish a better
hand-drawn result; inspect the rendered silhouettes and pigment.

For drawing reveals, `Wax.reveal(key, progress, draw)` measures each group and
keeps its contour and pigment budgets separate. Use a stable key and unchanging
stroke topology for the group. There is no solid colour rectangle underneath an
unfinished hatch. Register licensed font bytes with `registerWaxFont` and the
Canvas font registry to trace partial letters along paths; unregistered fonts
fall back to whole glyphs and require a separate lettering solution.

## Direction and timing

Resolve the source identity before writing. Record the intended audience,
story spine, visual reference, permitted adaptation and delivery format in the
external production. Keep source identity separate from style identity.

Use one integer-frame timeline with half-open ranges `[start, end)`. Reference
named events from both animation and sound. Caption timing follows recorded
speech. A change to the action frame must automatically move its sound cue.

Give each action shot a camera destination: follow the active character, move
closer to a small action, or settle with the pose. Keep educational choice
spreads wide enough to read. Evaluate the whole move, not only its midpoint,
for clipped titles, lost contact points and limbs outside the frame.

Default to planted actor roots and readable held poses. Avoid generic walking,
bobbing and whole-body sway. Use small blinks, mouth shapes and necessary hand
or prop actions, with shared contact coordinates. Begin restrained camera moves
after the drawing settles. A full-body move is an explicit exception requiring
continuous foot, hand, prop and sound review.

`composite(wax, paper, canvas, scale, centerX, centerY)` samples the paper in
the same camera space as the drawing. Centers use output-pixel coordinates;
omitted centers default to the canvas center. Convert scene coordinates by
the rendering scale and keep the sampled viewport within the paper bounds.

## Music and sound

Define musical sections by narrative purpose, with explicit tempo, meter,
harmonic progression, motif, orchestration and transition. Use variations,
rests and a final cadence. A quiet scene should change the arrangement, not
merely turn down an unchanged loop.

Compose on one continuous beat and harmony clock. A picture cut must not restart
a bar, truncate notes or reset the ambience. Approach new orchestration over a
musical phrase, preserve release tails, and change tempo gradually when needed.
Keep shared-location ambience continuous with overlapping perspective changes.
Remove footfall loops when characters are planted. Check every transition in
musical context as stems and as the encoded mix; numerical seam checks alone
cannot establish perceived continuity.

The shared [drawn-story continuity method](../../methods/drawn-story-continuity.md)
details these sound, reveal and performance rules. They apply to new productions
even when the material toolkit requires additional renderer implementation.

Keep separate narration, score, ambience and event-sound stems. Place footsteps,
contacts, material noises and character/environment sounds where the depicted
actions occur. Alternate samples or synthesis seeds to avoid mechanical repeats.
Use restrained stereo placement, short perspective-appropriate reverberation,
and speech-driven ducking. Richness means relevant layers and dynamic contrast,
not a loud sound on every frame.

Record source URL, author, license, actual downloaded-file hash and edits for
each external sound. Keep this ledger and the sounds outside this repository.
Preserve original provider output when generating narration. Listen to the
encoded result when the interface supports it; ASR, loudness measurements and
successful playback do not establish auditory review.

## Reference comparison and delivery

Use `../../scripts/frame_review/` with output paths in the external project.
Map new shots to reference phases by visual function and relative progress.
Compare paper, stroke, pigment, lettering, motion, camera and physical effects;
different subjects or day/night settings are not themselves style defects.

Decode every frame and retain indexed, consecutive-frame evidence. Record
actual thumbnail inspection separately from native-resolution inspection,
motion playback and listening. An exported contact sheet is not a reviewed
contact sheet. Palette or edge statistics are descriptive and must not become
an invented artistic similarity percentage. Use a separate defect log and
re-render each observed mismatch. Only verified identical frame ranges can
inherit earlier pixel-level observations.

Declare the actual YUV matrix and signal range in each export. Generate RGB
review images using those declared values rather than a decoder's default.
Resolve missing metadata from the encoder configuration and controlled colour
patches before comparing paper or pigment colours. A metadata-only repair
still needs new display-colour review and playback, even when all YUV samples
and accepted audio remain identical.

Verify the encoded delivery file: complete decode, frame count and timing,
dimensions, audio streams and loudness, start/end and seeking in the intended
player. Serve local video with byte-range support. Bind evidence to the exact
delivered hash. Preserve revisions externally. Use the shared FFmpeg gate and
wait for another encoder instead of stopping it.

## Reference provenance

Visual grammar was studied from the `crayon-book` example in
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar), attributed to LemoLab
under CC BY 4.0. The material code here is independently authored. A future
production must verify and retain the license of the particular reference
and assets it actually uses.
