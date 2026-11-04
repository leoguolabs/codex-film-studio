# Production workflow

## 1. Freeze the brief and reference contract

Set audience, subject, factual question, narration and on-screen languages,
useful duration, aspect ratio, frame rate and delivery surface before generating
all audio. Read the requested reference guide and obtain the actual sample
video when a comparison is required. A demo source directory or gallery link
does not prove that the MP4 and its raster/font inputs are present locally.

Record the reference file hash, dimensions, frame rate and decoded count. Map
its meaningful operations: orbit, local map, scan, measurement, focus, return.
Extract reusable behavior without importing its plot, geography or numbers.
Agree with the brief whether review means selected frames, every-frame
thumbnails, every-frame paired images, or every frame at native resolution.

## 2. Build a source-backed geographic plan

Fill claims, assets, places, imagery plates and optional footage records using
[INPUTS.md](INPUTS.md) and [FOOTAGE.md](FOOTAGE.md). Check physical geography and
the date each image represents. Source current travel facts separately from a
historical basemap. Save provider requests, extent, projection and attribution.
Test the full zoom with low-cost stills before downloading excessive detail.

Choose scene purposes and camera endpoints. Use schematic route strokes only
when labelled as such. Compute actual quantities independently of choreography;
animation may reveal a value, not choose it. Plan screen-space reading regions
and geographic anchors before inserting long labels or video windows.

## 3. Generate and review narration

Use stable line IDs and an explicit language. Use Chatterbox through a verified
local runtime or a documented service; importing original WAV recordings is
also valid. Check the runtime's supported language and voice before a full run.
Do not assume every Chatterbox deployment exposes the same HTTP API. The
library's TECHNIQUE.md documents one service adapter; a different installation
needs its own inspected contract.

Preserve source-text, voice/reference and WAV hashes, actual durations, runtime
identity and generation settings. Keep original provider audio and reviewed
derivatives separate. A changed sentence invalidates the previous take. Use
natural speed unless the brief deliberately calls for a reviewed change.

Obtain independent word timing without feeding the intended transcript as the
recognizer's answer. Inspect disagreements, especially place names, acronyms
and the opening word. Regenerate actual bad speech; update a script only when
the new wording is acceptable, then regenerate that source-bound take. A cut
must not remove a final consonant. Two ASR models agreeing is still not a
subjective listening verdict. Listen to the dry takes and final mix when that
capability is available, and record uncertainty honestly when it is not.

## 4. Make the frame clock authoritative

Finalize the timeline from actual speech duration, entrance time, reading time
and breathing room. Use integer frames and half-open ranges `[start, end)`.
Compute `state = f(frame)`; seeking must not depend on a prior playback history.
Camera, annotations, captions, video sampling and sound events share this clock.

Split captions at meaningful phrases. Bind internal cue boundaries to reviewed
word times and verify that chunks concatenate to the exact source text.
Character-proportional timing is a draft fallback, not final word alignment.
Measure reading speed and rendered fit. Store actual timing uncertainty.
Keep file hashes with alignment so stale speech cannot pass silently.

## 5. Prototype, render and repair

Author the renderer in this project, using geographic helpers as useful. The
method package has no scene engine to invoke. Verify fonts, geometry, texture
loading and footage decoding in representative stills, then inspect actual
motion across scans, footage reveals and scene boundaries. Repair one observed
cause at a time and preserve before/after evidence when it helps.

Use the supplied `tools/frame_review/ffmpeg_gate.py` for FFmpeg commands, e.g.
`python3 tools/frame_review/ffmpeg_gate.py -i INPUT ... OUTPUT`. Inspect its
documented cooperative lock and use the same gate across concurrent films.
It waits for existing FFmpeg processes and never kills them. Legacy projects
may use another lock name; process checking alone cannot prevent an unrelated
encoder from starting later. Coordinate that shared resource before encoding.

Save the encoded picture, narration, mix, final MP4 and source manifest under
distinct names. Select output codecs for the intended player. Review the
encoded delivery, not only the browser composition or pre-encode screenshots.

## 6. Accept and deliver

Run [REVIEW.md](REVIEW.md) against the actual final hashes. Review the final
audio track as well as dry takes; mixing or muxing can introduce a new defect.
Check real playback to the end and seeking. Iterate on blocking mismatches
against the brief rather than redefining the acceptance standard after export.

Deliver the MP4, subtitles, editable source, dependencies/rebuild instructions,
source credits and accurate review record. A known unresolved defect stays
listed; do not mark it accepted by merely renaming it a material limitation.
Do not equate a numerical colour comparison with a verdict of identical style.
Public upload or publishing uses the user's explicit destination and request.
