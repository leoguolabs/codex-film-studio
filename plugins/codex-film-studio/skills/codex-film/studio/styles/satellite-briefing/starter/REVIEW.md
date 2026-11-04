# Review the actual delivery

## Keep five kinds of evidence separate

| Evidence | Establishes | Does not establish |
| --- | --- | --- |
| Full decode and per-frame metrics | Frame count, timing, dimensions and numeric anomalies | Visual quality or actual viewing |
| Actually opened all-frame atlases | Thumbnail-scale visual coverage for recorded ranges | Native-resolution inspection of every frame |
| Actually opened individual or paired full-size frames | Fine detail at the displayed pixel size | Motion or all intervening frames |
| Playback to the end plus seeking | Behavior in that player for that exact file | Subjective listening unless audio was actually heard |
| Listening to dry takes and final track | Intelligibility, pronunciation and mix observations | Universal absence of errors |

Record the pixel dimensions actually displayed by the review tool. A 3840-pixel
pair file reduced to 2048 pixels is not a native-size inspection of two 1920-pixel
frames. A successful ASR comparison cannot be relabelled as listening.

## Comparison plan

Bind the reference, final file and timeline by SHA-256. Compare operations such
as a descent, scan, measurement and title return using their relative progress.
Record the mapping; different geography and durations do not justify arbitrary
pairing. Do not compute pixel SSIM between unrelated locations and call it a
percentage of artistic similarity.

The supplied tools can inventory all frames and create every-frame paired
sheets plus representative native samples. Generation is preparation, not
review. If the user requests every-frame comparison, open and inspect every
paired sheet and record all covered ranges. If native inspection of every frame
is required, thumbnail coverage cannot satisfy it. Log each actually inspected
range, file, display size, reviewer, finding and evidence hash. Report gaps.

Typical commands, after filling the actual contracts and installing the optional
dependencies in `tools/frame_review/README.md`:

```sh
python3 tools/frame_review/audit_frames.py reference/reference.mp4 review/reference
python3 tools/frame_review/compare_frames.py media/final.mp4 reference/reference.mp4 content/timeline.json content/reference-map.json review/pairs
python3 tools/frame_review/compare_frames.py serve . --port 8876
```

Output directories must be new or empty; use a new review directory per revision.
No command here has been run successfully merely because it appears in a guide.

## Visual checks by failure mode

- Inspect intermediate zooms for plate rectangles, seams, missing pixels and
  loss of detail. Resolve source/date problems through acquisition, blending,
  framing or an explicitly accepted limitation; do not paint fake evidence.
- Confirm pins, leaders, map outline and photographs stay registered. Check
  altitude against the actual camera and scale against screen-to-ground rays.
- Compare the actual last/first rendered poses of adjoining continuous scenes.
  The animation's nominal endpoint is insufficient when a hold includes drift.
- Verify the local paper mask, title scaling and scan edge through the full
  transition. Surrounding imagery should remain photographic.
- Check the range line/counter share progress and the stated measurement model.
  Never mistake a straight line for a route length or an itinerary for a survey.
- Inspect every insert's reveal/exit, backing and source endpoints. Confirm real
  decoded pixels, geographic identity, crop and speed; no blank backing flash.
- Check parent fades, route marker resets, flag geometry, brand recognition,
  text clipping, measured font width, minimum practical size and reading time.
- Verify that the reticle-to-title transition and geographic background continue
  smoothly; a still image alone does not establish the camera's motion.

## Audio, file and playback checks

Check the final encoded audio stream, source-to-WAV hashes, phrase coverage,
caption timing, intelligibility, proper names, music masking and opening/closing
tails. Record ASR disagreements and actual listening separately. Measure the
delivery's loudness and true peak rather than assuming a gain setting achieves
the target. No full-scale PCM samples alone does not prove no intersample peaks.

Verify dimensions, rate/time base, duration, decoded count, stream presence,
monotonic timestamps and complete decode of the final MP4. Inspect anomalies
instead of treating all black/frozen frames as errors regardless of intent.
Load the replacement file afresh in the intended player. Record progression,
end state, seek result and file identity; an old cached export is not evidence.

## Revision and decision

For each defect record location/time, observed behavior, required correction,
changed source, replacement file hash and reinspection result. Recheck changed
ranges and adjacent transitions. A new encoded file invalidates its old playback
record. Only exact decoded-pixel and timestamp comparison may carry forward
prior visual observations for the intersection of actually inspected identical
ranges; it does not carry forward playback, listening or an artistic verdict.
Use `compare_decoded_versions.py` with the actual dimensions and frame rate,
not unchecked defaults. Matching a few JPEGs cannot prove unseen frames match.

Keep `style_decision` unresolved until the agreed visual criteria have actually
been evaluated. A completed render is not acceptance. Remaining defects and
missing review capabilities must be explicit; a strict requested criterion must
not be silently relaxed. Preserve useful iterations without presenting them as
the final version. Deliver a compact human-readable summary alongside evidence.
