# Comparing animation style across different subjects

First preserve the actual source: URL or supplier, media hash, dimensions,
stream time base, frame rate and decoded frame count. An accessible poster,
thumbnail, transcript or web page does not establish access to the whole film.
Keep the reference and production evidence outside the method library.

Decode every frame in presentation order. Record frame index and timestamp,
color and tonal distribution, edge density and frame-to-frame change. Save
numbered atlases or a frame browser so a finding can be located again. Retain
counts of expected and decoded frames. A reduced-resolution metric is a
reduced-resolution measurement even when it covers every native frame.

Verify the review decoder's colour conversion before comparing palettes. A
correctly tagged delivery can still produce biased RGB screenshots when the
extraction path applies the wrong YUV matrix or range. Check representative
colour patches against an explicit conversion and preserve the source metadata.
If that check fails, regenerate colour descriptors and comparison images for
both films. Keep previous geometry/timing observations at their original scope,
but mark earlier palette judgments as superseded. This does not require changing
the encoded film when the error is confined to the review path.

Separate visual roles before comparing: environment, person/object interaction,
isolated mechanism, array, layered volume and split comparison. Mark sponsor
segments, photographic inserts and end cards explicitly. Do not silently remove
unfavorable reference intervals from the report.

A new subject needs a new story. Pair each generated shot with a reference
interval that has a comparable visual role. Normalize position within the two
intervals and record both frame numbers for every generated frame. These pairs
are aids to style inspection, not claims of identical story timing. Raw SSIM or
perceptual image distance between unrelated subjects is not a calibrated measure
of style quality.

Inspect the beginning and end of each role interval in consecutive frames. A
convenient round-number timestamp can cross an iris, wipe or new scene. Keep a
comparison interval inside one visual role unless transition behavior is the
explicit comparison target. When a production changes composition, update the
role mapping with a recorded reason; do not choose ranges to minimize a metric.
After correcting an interval, inspect the entire replacement window at a stated
scale. Preserve the earlier mapping and correction reason, then regenerate all
affected correspondence rows even when the production's pixels did not change.

Store this role mapping separately from nearest-feature retrieval. Use explicit
half-open source and output intervals, a visual role, an action phase and the
reason for selecting each pair. Expand intervals into one correspondence row
per output frame. Keep unmatched rows with a reason instead of forcing a
misleading counterpart; reject gaps and overlaps in output coverage. For
constant-rate films, mapping the first and last included frames preserves both
ends even when interval lengths differ. This is comparison indexing, not
retiming or proof of equal movement. Bind the mapping to both media hashes.

`scripts/frame_review/correspondence.py` expands a production's authored shot contracts
and reference index into that ledger. Supply the candidate's previously verified
SHA-256 and decoded frame count, plus paths to every used reference movie; the
tool checks the movie hashes, reference bounds and complete non-overlapping
candidate coverage. It starts no FFmpeg process. The output directory must be
new, so it cannot overwrite an earlier review. Each row preserves the candidate
action phase, role and reference interval. Normalized positions are explicitly
provisional navigation, not aligned contact events or aesthetic acceptance.

During a transition that composites two shots, a single counterpart would be
misleading. Keep those rows as unmatched transition composites, identify the
incoming shot and its held source frame, and inspect both components separately.
Also report missing action-phase annotations. Do not turn complete indexing
coverage into complete observed comparison coverage. Keep the separately viewed
frame pairs and their findings in the production's review records.

Compare motion in physical playback time as well as normalized shot phase.
Different shot lengths can make adjacent-frame differences incomparable. Separate
cuts from continuous movement, then estimate the dominant camera transform when
it helps explain the result. Inspect tracked features and valid image overlap;
report estimation confidence and retain the uncorrected measurement. A warped
residual still includes parallax, interpolation, compression and object changes,
so it is not a direct measure of character animation. Do not add arbitrary motion
just to raise a frame-difference score.

Inspect native-resolution pairs for silhouette, palette roles, subject size,
shadow facets, labels, density, perspective and depth order. Inspect consecutive
frames around every transition and named event for anticipation, causal action,
follow-through, camera velocity and continuity. Check that growing geometry
does not render degenerate fragments before it exists, incoming material moves
toward its destination, and joined objects retain coherent contact and rotation. View a full-speed playback and
listen when the interface provides actual audio perception. Keep a ledger of
observed faults, revisions and the checks invalidated by each revision.

For an intentionally continuous boundary, render the outgoing last frame and
incoming first frame from the shared object state. Check both the retained shape
and its context: a small pixel difference can verify a quiet boundary, but cannot
justify an unmotivated scale change later in the shot. Inspect the middle of the
move for subject readability and avoid letting a shrinking subject disappear
before its growth or transformation becomes the explanation.

Check object clearance using the visible silhouettes after rotation, squash,
stretch and delayed appendage motion. Centre-to-centre distance alone cannot
detect contact. For a reaction, locate the first visible stimulus, the gaze
change, preparation, release and settling frames. A reaction that precedes its
visible cause can read as an arbitrary loop even when its motion is smooth.

For revisions, compare decoded images and record an independent total-frame
counter, per-frame differences and contiguous changed ranges. Do not reuse a
range-building loop index as the decoded frame count. Include the following
shot in the recheck when encoding changes propagate beyond the source edit.
Associate the review ledger with the delivery hash and retain earlier-version
observations under their original version.

Before reusing an export helper, bind its inputs and output directory explicitly
to the new revision. Check actual file identity as well as resolved paths:
different paths can be hard links to the same file. Reject any encoder output
that shares an inode with an input, and write a new export before replacing a
delivery link. Validate version substitutions in helper filenames and codec
settings; word boundaries and filename separators are not interchangeable.
If a retained export is touched accidentally, restore and verify its original
hash before using it as comparison evidence.

A previous visual observation may carry forward only for frames whose decoded
pixels are exactly unchanged and whose earlier inspection is recorded. Bind
both the equality comparison and the earlier ledger to their media hashes.
Inspect every changed frame at the declared review resolution, including any
encoding changes outside the edited shot. Report newly viewed frames separately
from inherited observations; a small numerical difference is not exact identity.
Audio identity and listening coverage need their own evidence.

Check the editable rebuild entrypoint separately from rendering isolated frames.
Pass output paths explicitly from each producer to its consumer; revision names
in independent defaults can drift while individual modules still run. A dry run
can verify that the renderer's output is the muxer's input and that subsequent
checks address the new master. Export into a fresh directory so a reconstruction
cannot replace the reviewed delivery. Record this as command-wiring validation,
not as a complete rebuild or a clean dependency installation.

Report coverage in separate fields: all-frame numerical scan, atlas availability,
actually viewed frames, normal-speed motion, speech transcription, audio signal
checks and subjective listening. Generating a contact sheet is not viewing it;
playing a file through a UI is not proof that its sound was heard. Do not convert
feature differences into an invented similarity percentage.

Keep player overlays separate from authored pixels. Controls, captions supplied
by the player and display transforms can change the apparent contrast or obscure
the composition. Recheck a suspected defect in an unobstructed player frame and
an explicitly decoded image before revising the film.

Record the displayed resolution as well as the stored thumbnail dimensions.
An image tool may downscale an atlas even when its original detail is requested.
Use smaller sheets or inspect separate crops when that reduction hides the
detail being judged; do not report the stored dimensions as the viewing scale.

For concurrent productions, wait for existing ffmpeg processes before starting a
new ffmpeg job, use a cooperative lock when available, and never terminate
another task's process. Shared TTS queues likewise require patience or a separate
explicitly configured voice source, not service restarts.

After reviewing, verify the encoded delivery rather than only the source frames:
decode count, timestamps, stream metadata, audio peaks/loudness, subtitles and
playback. Preserve the exact reviewed export hash. Aesthetic acceptance remains
a stated judgment with its remaining differences, not a side effect of passing
an encoder or a statistics script.
