# Shared film review

Review the encoded delivery file and bind evidence to its hash. Keep these
observations explicit:

- Technical checks: complete decode, frame count/rate, dimensions, audio streams,
  duration, caption timing and seeking in the intended player.
- Still inspection: record actual frames opened, thumbnail dimensions and native
  resolution details inspected. Check text, identities, contacts and overlaps.
- Motion: watch entrances, object interactions, camera movement, transitions and
  holds. A contact sheet cannot establish motion quality.
- Listening: listen to the encoded speech and mix when the interface supports it.
  ASR, signal measurements and starting a player are different evidence.
- Style comparison: compare material, drawing, layout, motion, camera and sound
  against the reference by visual function. Record observable differences; do
  not invent an artistic similarity percentage.

Use the shared [frame-review tools](../scripts/frame_review/README.md) to decode,
index and compare frames. When every-frame review is requested, record which
consecutive ranges were actually inspected; generated atlases alone are not review.

After a repair, inspect the changed encoded ranges again. Prior pixel observations
can carry forward only for verified identical decoded frames at matching times.
This does not carry listening, playback or a style judgment forward automatically.
Keep a defect log and state unresolved limitations alongside the delivered file.

Use [revision and delivery](revision-delivery.md) to decide which checks a change
invalidates and bind the current export to its source revision and evidence.
When the brief specifies a primary medium, apply [media selection](media-selection.md):
measure source, freeze and overlay intervals separately, then inspect what the
encoded picture actually shows. Use [reference adaptation](reference-adaptation.md)
to compare the requested motion as well as the static layout.
