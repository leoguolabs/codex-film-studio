# Empty production inputs

All content starts empty. Select delivery dimensions, frame rate, duration intent,
language and motion profile from the new brief. Stable IDs join the records.

| File | Fill in the production |
| --- | --- |
| `content/brief.json` | Subject, audience, takeaway, reference, medium and delivery intent |
| `content/sources.json` | Claims with qualifications; assets with provenance, context, permission status and hash |
| `content/narration.json` | Text, claim IDs, original take identity, accepted audio hash and measured timing |
| `content/shot-plan.json` | Purpose, visible action, framing, caption region, source choice and sound role |
| `content/timeline.json` | Integer output frames; half-open shots, source mapping, captions, chapters and events |
| `content/review-record.json` | Export hash, observed coverage, defects, audio/listening scope and delivery decision |

The picture edit records source in/out times, crop or fit, playback speed and
freezes. Evidence labels must remain correct after edits. Caption/graphic values
come from sources, independently of entrance animation. Reject stale audio/text,
missing assets, unintended timeline gaps and overlapping captions before export.

Portraits for a specific real person are supplied for that production. Archive
video, when requested, retains its actual source/context and permissions; its
appearance is not evidence of a new statement. No identity is inherited from a
reference or previous project. Keep credentials and provider receipts out of the
reusable library.
