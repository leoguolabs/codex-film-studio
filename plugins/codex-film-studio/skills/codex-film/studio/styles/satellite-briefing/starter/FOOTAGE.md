# Optional YouTube footage: a verified insert pipeline

Use a real clip when it supplies something the geographic view cannot show:
street-level scale, a recognizable structure, activity or atmosphere. The map
remains the spatial explanation. The workflow is independent of an application
Task queue and does not require the upstream reference's rendering tools.

## Discover and verify before selection

Search the actual place, viewpoint and needed action. Prefer the user's
authorized source material or a source with usable, recorded terms. Treat the
title and description as leads. Open actual frames across the source: verify
landmark geometry, surrounding buildings, viewpoint, scene changes, watermarks
and whether the clip appears to be an illustration or generated reconstruction.
Record what is visible; do not credit a generic city title as proof of a landmark.

For a chosen source retain its URL/video ID, uploader, title, retrieved date,
platform metadata, source interval and the rights/attribution decision. A
platform reuse label is an uploader assertion, not independent proof of
ownership. Re-check the specific source when reusing it in another production.
Keep original source audio out of the mix unless it has been deliberately
selected and reviewed. Credit excerpting, cropping, grading and other changes.

## Acquire with explicit boundaries

Use a supported connector, the source's download, or a maintained downloader
for accessible authorized media. Inspect installed tool capabilities; do not
borrow credentials or embed signed stream URLs in the public method library.
Keep the original media and a compact metadata record in this external project.
Hash the received bytes. Check completeness before extracting an excerpt.

If acquisition requires FFmpeg, use the shared gate before merge or transcode,
including downloader post-processing. A video-only stream or a native decoder
can avoid unnecessary encoding. Availability of that fallback is platform
specific; a method must not assume macOS AVFoundation exists on other systems.
Preserve enough failure information to resume rather than disguising an
unavailable source with unrelated or generated material.

## Decode time, not just container metadata

Inspect stream dimensions, rate, duration, presentation timestamps and decoded
frame count. A container's reported duration can disagree with its actual video
stream. Do not fill a mistaken interval by repeating its last frame. For a
variable-rate source select frames by actual presentation timestamps, not
`frame_index / nominal_fps`.

The source trim is `[source_start_seconds, source_end_seconds_exclusive)`.
For an inserted clip, each output frame maps to a source time using its authored
speed and start. Record that mapping and any cropping or resizing. Keep it
deterministic during seeks. Verify first/last images and transitions within the
selected interval. Full decode and a sample contact sheet are separate evidence;
record the actual visual coverage instead of claiming unseen frames were viewed.

## Composite without losing place identity

Anchor the insert's leader to the verified location using the geographic
camera. A vertical or horizontal scan may reveal the clip within a restrained
frame. Its backing must be clipped to the same visible region; otherwise a
black placeholder appears before the first real pixels. Fade brackets, title,
source note, backing and image consistently at exit.

Verify the encoded insert at its actual display size. Dark night footage can
be intentional; a frozen/blank frame or an unrecognizable landmark cannot be
excused by the title. Confirm playback speed, no end-frame padding and no
accidental source soundtrack. A new candidate MP4 requires fresh frame binding.

## Library boundary

Keep source clips, source metadata snapshots, rights decisions and review
artifacts with the production. The reusable library contains only this process
and empty contracts. No preset channel, destination, signed URL or inherited
clip selection is part of the method.
