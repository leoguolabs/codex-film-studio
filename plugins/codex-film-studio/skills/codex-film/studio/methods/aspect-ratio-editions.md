# Recompose alternate aspect-ratio editions

Use this method when a film needs more than one delivery shape. Keep the
accepted edition intact and give each new edition its own composition, exports,
review records and manifest. A file with different dimensions is not yet a
reviewed alternate edition.

## Separate the action from the stage

Retain local coordinates for connected people, hands, tools and moving parts.
Move that action into the new frame with a uniform camera transform so contacts,
proportions and physical consequences survive. Choose the framing for each kind
of action rather than scaling the whole old canvas. A tight mechanism insert,
a long trajectory and a facial reaction need different space.

Place headings, captions, timers, stage furniture, readouts and picture-in-picture
screens in the new viewport. Extend authored scenery and texture to its edges.
Do not use stretched figures, duplicated edge strips or blurred padding as a
substitute for a composition unless that treatment is explicitly intended.
Preserve image aspect ratios inside screens, transition rectangles and montage
cards throughout their interpolation, not only at the endpoint.

Inspect the complete action envelope: headwear and feet, the working hand,
tool extremes, released objects, splashes, jump peaks and reaction marks.
Check replay start, impact and end against its overlay strips. Route annotation
leaders around lettering and keep their endpoints attached to moving parts.

## Keep the rendering and evidence edition-aware

Texture, grain, pixel and post-processing buffers need actual viewport dimensions.
Include dimensions in cache keys; a cache shared by two shapes must not silently
reuse the first shape's field. Preserve indexed colour and nearest-neighbour
sampling where the material requires discrete pixels. Derive all state from the
requested frame, including transitions that render earlier scenes into cards.

When extending a shared renderer, use explicit per-edition layout parameters.
Keep the prior layout as the default and compare meaningful old-edition frame
hashes before and after the change. This checks regression at the sampled frames;
it does not replace review of the newly composed edition.

The old timeline and audio can remain authoritative when neither content nor
pacing changes. Copying the accepted audio stream avoids an unnecessary lossy
encode; verify sample identity after final muxing before carrying its evidence
forward. A new aspect ratio does not justify a new voice job by itself, and audio
identity does not create a subjective listening review that never happened.

## Review and retain both results

Inspect every shot's new composition before full export, then consecutive motion
around the risky transitions. Renew the encoded-frame review, native-size detail
checks, complete decode, player playback, seek and ending for the new file.
Record automated coverage separately from images actually opened and listening.

Keep each edition's path, aspect ratio, dimensions, timing and evidence hashes in
the delivery index. Preserve the accepted source snapshot for each edition, even
when a newer shared renderer can reproduce both. Package the new composition and
its fonts, dependency versions and retained audio so the alternate edition can
be rebuilt without provider credentials or an unrelated production directory.
