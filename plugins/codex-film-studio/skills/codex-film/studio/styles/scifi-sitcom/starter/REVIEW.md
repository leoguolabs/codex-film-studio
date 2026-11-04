# Reference comparison and delivery review

## Define the comparison before rendering

List the style properties in STYLE.md, the user's requested changes and what
must remain recognizable. Match shots by visual role: a reaction with a reaction,
an insert with an insert, a departure with a departure. Map relative progress
inside each interval. Different topics may require new objects, durations,
compositions and identities. Do not turn those content differences into defects
unless their execution violates the agreed style or obstructs the explanation.

Use the empty `content/reference-map.json` to record shot IDs, scene types,
reference start/end seconds and the visual function of each pairing. Never claim
that role mapping means the two films depict the same event.

## Gather evidence at distinct scales

| Evidence | What it can establish | What it cannot establish |
| --- | --- | --- |
| Full decode and frame inventory | Stream properties, timing, frame count, decode errors | Visual quality or style match |
| Consecutive paired sheets actually opened | Image continuity and visible style at the stated thumbnail scale | Native-detail review or actual-time motion judgment |
| Native-resolution samples actually opened | Faces, line weight, symbols, text and selected boundary details | Every-frame native review |
| Motion playback | Rhythm, continuity and visible timing in the intervals watched | Playback of intervals not watched |
| Independent ASR and waveform measurements | Text/timing comparisons and measured signal properties | Subjective intelligibility, pronunciation or a pleasing mix |
| Listening to the delivered soundtrack | Heard voice, timing, masking and sound quality in the listened intervals | Listening to unplayed intervals |

Record actual pages/ranges opened, image dimensions, native frame numbers,
playback intervals, listening intervals, observations and unresolved issues.
The blank `content/review-record.json` starts with no completed observations.
Do not automatically set a pass when tools finish or a player starts.

Include a locked-camera dialogue hold, a reaction close-up, a label-heavy insert,
and a portal boundary in the motion checks. Fixed edges, the torso and pupils
must not oscillate while mouths, blinks or deliberate gestures change. Compare
consecutive encoded frames over several former boil cycles; also play the sample
at normal speed. Check a slow camera move for texture crawl. Pixel differences
can diagnose a supposedly static region, but cannot judge acting quality.

## Use the copied tools

Read `tools/frame_review/README.md` for dependencies and input contracts. From
the external project, after authoring the timeline and mapping:

```sh
.venv/bin/python tools/frame_review/audit_frames.py reference/source.mp4 review/reference
.venv/bin/python tools/frame_review/compare_frames.py media/final.mp4 reference/source.mp4 content/timeline.json content/reference-map.json review/pairs --large-width 1920
.venv/bin/python tools/frame_review/compare_frames.py serve . --port 8876
```

Output folders must be new or empty. The current comparator creates 50 frame
pairs per page with 160×90 images; `--large-width 1920` requests larger samples
at that width, not additional detail beyond the source. Review every pair when
every-frame review is required, and inspect critical frames at their true native
size. Obtain exact frame samples at cuts and defects beyond automatic sampling.
Reference and candidate may have different lengths and frame rates.

## Revisions and carried observations

Preserve each rejected export and its actual review coverage. After changing a
render, identify all affected frames, including downstream timing changes and
global effects. Reopen those encoded regions; inspecting only changed source code
is not enough.

For unchanged regions, compare full decoded RGB pixels, exact timestamps, color
and display metadata against the previously inspected file:

```sh
.venv/bin/python tools/frame_review/compare_decoded_versions.py media/previous.mp4 media/final.mp4 review/identity --width 1920 --height 1080 --fps 24
```

Use the actual output contract, including a rational frame rate when required.
Only a completed comparison tied to exact input hashes can identify candidate
ranges. Intersect those with prior actual observation coverage at its stated
scale. Identical JPEG thumbnails alone establish identical thumbnails; they
do not prove that native frames are identical. Never promote thumbnail evidence
to native detail. A different file can encode visually similar frames differently.

Identity never carries a listening session, motion playback, or artistic verdict
forward automatically. New audio needs its own checks even if all pixels match.
An unchanged soundtrack may retain its exact prior audio observations only when
the relevant audio content and timing are independently shown to be unchanged.

## Judge and stop

For each issue, record frame/range, visible defect, intended repair, new export
hash and reinspection result. Typical checks include small-pose outlines, portal
handoff, face/caption collisions, prop contact, numerical readouts and insert
framing. Do not keep changing scene coordinates solely to imitate a different
story's staging.

The final decision is qualitative: does the film consistently execute the agreed
drawing, acting, camera, typography and sound language, with no material unresolved
defect at the documented review scales? Report uncertainty and remaining limits.
Palette percentages, edge density, hashes and motion statistics are diagnostics,
not an artistic similarity percentage. Do not invent a “100% identical” score.

Check the final MP4's dimensions, rate, full decode, duration, streams, frame
clock, caption timing and playback through the natural end with a seek. Listen
when tools allow; otherwise state that listening is unverified. Keep the assistant's
review decision separate from the user's acceptance. Once the relevant checks
pass, stop repeating tests without a new failure or revision.
