# Continuity in a drawn story

Use these rules for a picture-book film whose visual language is drawing on
paper. They apply to the finished film and to its production tools. Keep the
story, cast, timings, media and review evidence in an external production.

## Sound crosses the picture cut

A new shot is not automatically a new musical cue. Compose against one global
beat and harmony clock. Do not restart a bar, change tempo, change meter or
truncate a sounding note merely because the picture changes. Scene boundaries
may select an arrangement destination; approach it over a musical phrase.

- Keep a common instrument, pulse or sustained harmony through the boundary.
- Introduce and withdraw instrumental layers gradually. Resolve incompatible
  harmonies before overlapping them; a crossfade alone cannot fix a bad join.
- Let note releases and reverberation tails continue into the next shot.
- Use gradual tempo changes where the story warrants them. Put a true stop or
  new cue at an intentional dramatic event, with enough space to hear it.
- Keep a continuous ambience bed for a shared location. Change its perspective
  with overlapping envelopes. Do not fade every scene to silence and start a
  fresh noise bed at the next cut.
- Place action sounds on the shared event clock, with natural tails. Removing a
  visual action also removes its associated sound; stationary feet do not
  receive a walking loop.
- Duck music and ambience smoothly around speech. Do not use scene boundaries
  as automatic gain envelopes.

Review at least a phrase before and after every cut, first as score/ambience
stems, then as the complete encoded mix. Check beat continuity, harmony,
orchestration, level, ambience perspective and release tails. A waveform without
clicks may still sound like disconnected cues. Listening and a numerical seam
audit must be recorded separately.

## Every new element is drawn

Assign a stable reveal group and explicit onset to every newly introduced
character, prop, setting component, label and late answer. Each group has its
own progress; completing the setting must not cause later props to appear
instantly.

1. Trace contours along actual path length. Interpolate the endpoint of the
   current stroke; do not reveal only whole segments.
2. Lay pigment down in ordered directional passes, with pressure variation and
   uncovered paper. Avoid a flat coloured fill underneath an unfinished reveal.
3. Finish small internal marks and lettering, then give the completed drawing a
   readable hold.

Keep contour and pigment budgets separate. A colour pass must not erase an
earlier line-stage budget or change unrelated groups. Character scale and
opacity stay stable during drawing; shrinking, expanding, sliding and fading
are not substitutes for a drawing operation. Handwritten typography can trace
font paths and then fill the glyph with clipped hatch strokes.

Build a compact onset review for every group: blank, partial contour, completed
contour, partial pigment and finished hold. Include elements introduced late
inside a shot. Inspect a consecutive motion segment as well as these stills.
Seeking the same frame from different histories must produce the same pixels.

## Planted characters, purposeful local actions

Start with a readable static pose. Keep the actor's root position, body scale
and planted feet constant through the shot. Do not add a generic walk cycle,
bob, whole-body sway or repeated pose change simply to keep the frame moving.

Use a new drawing or cut when the story requires another location. A restrained
camera move can direct attention after the drawing has settled. Keep paper and
pigment in the same camera space.

Allow small local motion only when it communicates something specific: a blink,
a mouth shape, a hand working a tool, or an object being lifted. Keep the hand,
grip and prop on the same event model. Moving the object while leaving its hand
behind is a continuity defect. Confirm contacts through the entire motion,
including the first and last action frames.

Record exceptions deliberately. A well-supported full-body action can be
appropriate; its root motion, foot contacts, pose transitions and sound must be
reviewed as an action, rather than accepted because it rendered.

## Acceptance evidence

Maintain three independent review columns:

| Concern | Evidence to inspect | Failure that requires revision |
| --- | --- | --- |
| Sound continuity | Every cut in musical context, stems and encoded mix | Unmotivated restart, incompatible overlap, lost release or ambience gap |
| Draw-on appearance | Every group's contour/fill stages and consecutive frames | Fade, scale pop, premature solid fill, missed late group |
| Restrained motion | Static root/scale records and full contact sequences | Unmotivated translation, bobbing, stiff limb jump or detached prop |

Bind observations to the exact export hash. A decoded file, ASR transcript,
loudness result or generated contact sheet is not perceptual approval. Preserve
specific user feedback as an observed defect in the external production and
use it to revise both the implementation and these reusable rules.

When a user confirms a particular quality, record their exact reply, its scope
and the export hash. Keep that separate from agent listening or visual review;
confirmation of smooth transitions does not certify every other audio property.
For later picture-only revisions, copy the accepted encoded audio stream rather
than remixing or re-encoding it. Compare packet payload hashes, packet timing,
codec configuration and duration before carrying that acceptance forward.

For material adjustments, compare the same drawing at native output resolution
with paper, lighting and camera fixed. Test a small range of pressure values
before changing the whole film. Pigment pressure can reduce excessive bare-paper
gaps without thickening dark contours; it must still follow the actual drawing
strokes. Use coherent irregular bends and interrupted pressure for directional
materials such as wood, rather than uniform full-width parallel lines. Check
the result in a moving encoded sequence as well as stills. A material trial is
not accepted merely because its pixel statistics moved toward a reference.

When paper-white holes look too stark inside coloured wax, test a thin residual
deposit in the low fibres beneath existing strokes. Keep the undrawn interior
empty and retain the same stroke coverage; do not put a solid undercoat behind
an incomplete reveal. Hold the deposit strength constant over time. Compare
blank paper, a contour-only frame, partial pigment and a finished hold, with
white and dark identifying features checked separately. A softer grain is
useful only if the directional drawing marks remain visible in the encoded
result; pixel changes alone do not establish an improvement.

Separate visible paper relief, pigment grain and contour erosion. One shared
noise mask can make faces, clothing, foliage and small marks look equally worn.
Choose pigment granularity at native output scale, use stable form-specific
pressure and drawing direction, and retain enough pigment in small identifying
marks. Pressure seeds must follow object identity, never the changing position
of a moving hand or prop. Check the rotated fill bounds as well as the texture:
a directional change must not leave an unintended unpainted wedge in the form.

When repeated hatch bands dominate a coloured form, vary stroke length, overlap,
endpoint placement and local pressure while keeping the intended drawing
direction. Changing only global grain does not break long parallel bands.
Compare small white and dark features separately: a treatment suitable for
foliage can obscure eyes or noses. Keep the original treatment for those marks
when the trial shows a regression. Preserve deterministic object seeds and
recheck contour/fill budgets after changing stroke topology.

Match the length and grouping of the reference marks before adding more
randomness. A hand can make long, nearly parallel strokes while varying their
spacing and pressure together across a region. Extend those gestures with a
stable field in form coordinates; independent noise on every short segment
produces a different texture. Grain compositing can amplify a modest pressure
change into a large bare-paper patch. Reject that trial, reduce the pressure
range, and compare several colours and form sizes. A long-stroke treatment must
still trace partially drawn paths and preserve small identifying marks.

Distinguish dry-grain holes from regular gaps between adjacent pen passes.
The latter may need a wider wax footprint or greater overlap, rather than more
pigment everywhere. Test a modest range with pressure and paper held fixed;
too much overlap erases the directional evidence of drawing. Broad dark fills
may need the same pass model as coloured areas, while small identifying dark
marks remain protected. Check size thresholds after the scene transforms.
Changing pass topology invalidates measured reveal counts: use a fresh renderer
or clear that cache before comparing partially drawn trials.

Repeated props need stable individual drawings. Keep a common design, but vary
their local contour, hatch direction and pressure with an explicit identity key.
Nest component keys under their parent object and reuse them across shots.
Do not derive this identity from screen position, current time or call order:
that would change the material when an object moves or the scene is rearranged.
Protect grip coordinates, feet and identifying facial details. Compare a row
of repeated objects, then the same object at several times; variation must
reduce copying without introducing animation or identity drift. Verify scoped
state restoration and reveal budgets after adding these variants.

Inspect reference and candidate at the same native output scale before deciding
that a texture is too coarse or smooth. A reduced contact tile is useful for
sequence coverage but cannot judge line tooth. If the coloured wax already
matches and only contours look too clean, adjust contour deposition separately.
Do not weaken pupils, lettering or the entire picture to distress an outline.
Test fine limbs and drawing-stage frames as well as large closed shapes, and
hold material pressure constant throughout the reveal. Preserve the accepted
movie until the encoded candidate passes its own visual review.

When colour ends exactly at every contour, inspect whether edge marks are being
sampled by individual polygon segments. Dense curves can silently receive none
when every segment is shorter than the sampling interval. Sample cumulative
perimeter length instead, keep dry passes aligned with local hatching, and
limit their reach so silhouettes and contact points stay readable. Preserve
small facial marks, white features and dark identifying shapes. Compare a large
circle, an angular form and a grip at native size, then the complete draw-on
sequence. A rougher finished still does not prove a continuous pigment reveal.

## Shape softness is independent of movement

An organic subject needs a designed silhouette before it needs texture. Use
basic solids to locate masses during construction, then draw a continuous
outer contour that connects the head, neck, trunk and supporting limbs. Give
different subjects their own proportions, joint bends, posture and negative
spaces; changing only ears, colour or markings on a shared body is insufficient.
Inspect flat silhouettes without labels first. Round corners only after the
underlying shape reads correctly: smoothing a generic template does not make
it a convincing drawing.

After a silhouette changes, revisit every composition using it. Count the full
extent of ears, horns, tails and wings when setting spacing. Check contacts,
foreground occlusion and text clearance at both the largest and smallest
displayed sizes. Preserve deliberate stillness and expose the new geometry
through the same contour-then-pigment sequence.

Repair angular soft forms in their drawing geometry. Round selected corners
within their adjacent segments, preserving the endpoints of open limbs and
shared contact anchors. Use the same curve for paired inner and outer strokes.
Leave intentional structural corners intact. An organic silhouette may combine
several fixed spatial rhythms; repeating equal lobes often looks stamped.

Curving neighbouring pigment passes can describe rounded volume without moving
the object. Keep that field in surface coordinates with stable seeds. Do not
animate its phase or increase whole-body motion to disguise stiff drawings.
Compare contour-only and partly coloured frames as well as the finished pose;
path resampling can change reveal counts, mark spacing and fine line texture.
Recheck deterministic seeking, contact coordinates and the full encoded sequence.

## Occlusion follows the drawn material

When a pale foreground drawing shows unwanted background lines, first isolate
the compositing operation with two overlapping primitives at the actual scene
transform. A correct result at the canvas origin does not establish correct
translated or rotated clipping. Compare the background, isolated foreground,
overlap and partial drawing stages before increasing pigment density.

For a stroke-by-stroke reveal, remove the lower layer only along strokes already
drawn. Clearing the whole silhouette can create a blank cutout before the colour
arrives. If transformed erasure misbehaves, capture the visible stroke paths and
their matrices, erase their device-space footprints under the retained shape
clip, and replay the same pigment. Preserve pressure, drawing order and reveal
budgets. State which transforms the footprint implementation supports; multiplying
line width by one scale factor does not handle arbitrary affine transforms.

Check empty, contour-only, partial-pigment and completed states, plus deterministic
seeking. Compare isolated pigment to detect unintended material changes, allowing
only explicitly measured rasterization differences. Inspect a full encoded reveal
and fine foreground features; a primitive overlap test does not certify every
production frame or establish perceptual style equivalence.

## Continuous material through a physical transition

Separate base material, local wear and illumination. A washed-out page edge
may be a light-field error even when the paper colour is correct; inspect the
centre, edges and gutter before changing the whole drawing palette. On wood,
vary the density and contrast of coherent fibres over broad regions instead
of increasing the same speckle everywhere. Keep material variation fixed in
surface space during camera moves.

Build wood at three scales: broad pigment bands, directional fibres, and small
abrasion marks. Give highlights a separate pressure mask from the dark grooves;
outlining every groove with a bright neighbour creates regular stripes even
when the paths bend. Compare quiet and worn regions at native size. Reducing
all fine contrast can overcorrect the problem into blurred wood, so retain
localized dry catches. Texture statistics help identify the scale of a defect,
but a closer variance or colour mean does not establish a closer visual style. If broad
bands dominate, redistribute some contrast to coherent fine fibres. Give those
fibres irregular deposition and broken edges: adding smooth bright curves alone
can replace blurred wood with a plastic sheen. Keep the deposition mask fixed
to the material, then inspect it during camera scaling for shimmer.

If small catches still read as rows of bright dots, change their characteristic
width and spacing as well as the shared fibre bend. Keep the broad colour bands,
grooves and dry catches in the same directional field, with independent pressure
masks. Compare several strengths at both the widest and closest camera scales:
stronger grooves can compete with the page even when a small crop looks richer.
Verify that a background-material repair leaves the book interior unchanged,
and that revisiting a camera position reproduces the same grain.

A turning leaf and its settled surface must share the same texture orientation
and light treatment. Reverse sampling order on the back face, carry the gutter
with the hinge, and remove the moving self-shadow continuously as the leaf
settles. Inspect consecutive native-resolution frames across that handoff;
checking only the midpoint and final pose can miss a brightness jump.

Measure pullback, pre-turn hold, leaf motion, contact, push and final hold as
separate intervals. A single normalized transition can allocate too much time
to the turn and too little to the camera or reading hold. If audio is already
accepted, anchor the leaf's landing to its existing contact sound and work
backward to the turn onset. Keep the camera still through the leaf motion, then
leave a quiet final frame after the push ends. Record visually estimated timing
boundaries with their uncertainty rather than inventing exact source timings.

For a bowed sheet, project its depth before deciding which face of each strip
is visible. A single global front/back switch can erase one face too early.
Paint farther strips before nearer ones, keep the hinge fixed, and let the
depth profile vary independently of the transverse bend. Retain the front's illumination
until its last visible strip disappears. Test both flat endpoints, the narrow
side-on pose, partial front/back coexistence and the final material handoff at
native size. Geometry checks do not establish natural motion; inspect every
changed encoded frame and the complete transition at normal speed.

Judge curvature from a short consecutive sequence, including the outer edge
and the hinge. A rounded middle bow and a straighter outer span may share a
similar silhouette in one pose. Separate the local bend, the overall rotation
and the perspective before changing their strength. Preserve the fixed hinge
and contact time while testing the new profile. To check simultaneous face
visibility, render contrasting front/back test colours and count visible
pixels after occlusion; orientation flags alone cannot establish visibility.

If a deformed page acquires regular stripes, isolate the rasterization with a
uniform material and constant shade. Extra internal variation then indicates
compositing or sampling, rather than paper grain. Resolve visibility before
shading, sample the continuous material coordinates, and apply light once per
visible sample. Supersample the outer silhouette without treating every mesh
boundary as a new edge. Verify opaque interior coverage, subdivision stability,
front/back orientation and occlusion, then return to the real textured sheet
and inspect its complete motion. A zero-error synthetic plane is not evidence
of perceptual style equivalence.

A pullback from an illustration reveals an existing physical page. Keep the
image, paper, cover, hinge and desk in one scene coordinate system and move one
camera around them. Independently shrinking the image while the book remains
stationary produces a floating-card effect. Match the page and image aspect
ratios when the initial full-frame drawing must remain uncropped. Check that
the first camera transform reproduces the preceding frame, and that the final
crop stays inside the available background. Render at output resolution after
applying the camera; repeatedly shrinking and enlarging a precomposited image
can soften the drawing during the reveal.

Treat paper tint, light and shadow as separate controls. Layering several brown
shadows can darken the whole page while leaving the gutter relatively weak.
Compare representative blank patches across the spread, preserve the grain,
and share the chosen lighting model between the moving reverse and settled
leaf. Patch colours are diagnostic evidence, not a perceptual similarity score.

Apply the physical page light to its illustration as well as its blank paper.
Otherwise the revealed drawing can look like a cooler pasted rectangle. Test
the light transfer on dark contours and text: a screen or coloured overlay can
match the paper while washing out the ink. A bounded multiplicative gain field
derived from lit versus neutral paper preserves existing dark values. Bring
that field in smoothly with the physical reveal, starting at identity, and
carry it with the page during the turn. Inspect adjacent frames and seek the
same frame from different histories; a matching finished still does not prove
a continuous handoff. Keep the old treatment available for a controlled trial.

For a local picture repair, preserve earlier encoded GOPs when the splice
boundary permits it. Before inheriting an earlier visual review, decode and
compare every reused frame and its timestamp, bind both source file hashes,
and explicitly record the inherited range. Review all newly encoded frames
and the splice boundary. A stream-copy command alone is insufficient evidence.
`scripts/frame_review/check_video_prefix_identity.py` checks the decoded prefix
and writes per-frame hashes and timestamp comparisons to an external report.

## Colour interpretation is part of the evidence

Specify the RGB-to-YUV matrix and signal range during encoding, then write the
same values into the bitstream and container. A resolution alone does not tell
a reviewer which matrix was used. When an older file has unspecified metadata,
verify the actual encoder conversion with known colour patches and an explicit
conversion before adding labels; do not guess a matrix from the picture size.

A metadata-only repair can preserve every decoded YUV sample and timestamp,
while still changing how a player interprets those samples. Verify the complete
sample sequence and accepted audio identity, then regenerate RGB comparisons
with the declared matrix and range. Repeat playback on the repaired file.
Do not inherit an earlier display-colour observation solely from YUV identity.
Include colour conversion policy and exact file hashes in the review record.
