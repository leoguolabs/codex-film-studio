# Art Collage · Style and production rules

This package contains visual rules, empty input contracts and reusable tools.
It contains no completed story, narration, cast, portrait, brand asset, research
claim, film or per-production review. Create each production outside this repository.

## Inputs

Supply the subject, audience, language, narration scope and delivery format.
Supply a reference video when a particular visual treatment is required. Keep
that video and its frame evidence in the external production directory.

A reference person's face is not a style requirement. For a named or otherwise
specific person, the user supplies a portrait and identifies which person it
represents. Request the missing portrait before building that character. Do not
silently reuse the reference cast or a portrait from another production. For
anonymous characters, agree on the character design and preserve it across shots.

Use `starter/content/characters.json` to record portrait inputs and crops. Keep
portrait files external. Record logos, flags and other required identities in the
production's own asset manifest, using identifiable geometry and correct symbols.
Paper texture and ink treatment may change; essential identity must remain legible.

## Derive the visual rules

Inspect the whole reference, not just its opening. Record shot boundaries and
actual frame ranges for these independent properties:

| Property | What to record and reproduce |
| --- | --- |
| Surface | Fibre scale, pigment variation, print grain, paper thickness, edge damage |
| Cutouts | Photographic or illustrated treatment, edge silhouette, ink density, tonal range |
| Composition | Main subject size, overlap, occupied area, negative space, cropping |
| Typography | Letter sources, size contrast, baseline variation, reading order, backing paper |
| Motion | Physical entrance, object interaction, replacement, camera movement, settling and holds |
| Editing | Cut frequency, transition direction, action continuity, pauses and sound accents |

Separate visual rules from reference-specific people, objects, words and claims.
Changing the subject calls for new composition and action. It does not justify
discarding the reference's scale, layering, camera behaviour or material quality.

## Build the film

1. Write the story and source ledger in the external project. Plan each shot as
   an action or a visible relationship. Avoid repeatedly placing captions over
   an unchanged decorative background.
2. Prepare the user's portraits and required identities. Save original files,
   exact generation/edit prompts, input roles, crops and hashes. Use transparent
   cutouts when appropriate; keep edge detail and consistent character identity.
3. Render backgrounds at delivery resolution. Texture coordinates belong to the
   paper object. Avoid frame-random noise and repeated synthetic fibre marks.
   Always specify destination dimensions when drawing a texture: its source
   image dimensions are independent of the frame dimensions.
4. Make a single integer-frame timeline authoritative for image, narration,
   captions and sound. Derive every scene from its frame index. Separate facts
   and quantities from animation interpolation.
5. Give objects entrances, contact, overlap, exits and replacements that serve
   the narration. Use purposeful camera moves and readable holds. A rigid card,
   a face cutout and a handwritten annotation need different motion behaviour.
6. Obtain narration before locking timing. For Chatterbox, use the configured
   service contract, authenticated job polling and preserved provider WAVs.
   Keep credentials and job evidence in the external project. A repaired line
   invalidates dependent timing, captions and mix; preserve prior evidence.
7. Render representative native-size frames and motion previews. Check dense
   overlaps, all backgrounds, changed assets, extremes of camera movement and
   transitions before a complete encode. Serialize FFmpeg with other running
   jobs. Never stop another project's encoder to gain capacity.

The starter's `lib/paper.mjs` supplies deterministic torn-paper geometry,
dimension-safe material loading and cutout compositing. It deliberately has no
story renderer or supplied portrait. Author shots for the new subject.

## Compare and repair

Use the shared [frame-review tools](../../scripts/frame_review/README.md) on the
encoded delivery file. Map shots to reference intervals by visual function and
relative progress; this does not imply matching content or equal running time.

Inspect every generated pair when an every-frame review is requested. Record
which files and ranges were actually opened. State the thumbnail resolution;
check selected frames at native resolution for grain, edges, symbols and text.
Verify each saved image's pixel dimensions before describing it as native
resolution. If an exported comparison is smaller than the encoded stream,
extract a fresh frame at stream dimensions and inspect that file.
Watch actual movement and playback separately. Record each concrete defect,
its repair and the new evidence. Generated contact sheets alone are not review.

After a revision, inspect changed encoded frames again. Prior image observations
may carry forward only where full decoded RGB pixels and exact timestamps match
and intersect the prior actual review coverage. This never carries listening,
motion-playback or a style verdict forward automatically.

Assess the visual properties above, excluding reference-person identity when
the user chooses another portrait. Do not invent a percentage of artistic
similarity from palette, edge, motion or hash statistics. Report remaining
observable differences and revise them when they conflict with the brief.

## Delivery boundary

Verify the final file's complete decode, dimensions, rate, frame clock, streams,
captions, audio identity and playback. Listening is a separate observation from
ASR, signal measurements or starting a player. Record the actual scope.

Keep all finished films, story sources, images, sound, provider responses and
review records in the external project. Contributions back to this library must
remain useful after replacing the subject, cast, facts, voice and reference.
