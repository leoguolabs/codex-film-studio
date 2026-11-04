# Empty input contracts

All story fields start empty. Fill them in the external project. Stable IDs join
characters, dialogue, sources, shots and audio; do not join records by array order.

| File | Authoring contract |
| --- | --- |
| `brief.json` | Subject, audience, language, takeaway, duration intent, output dimensions/rate and reference identities |
| `characters.json` | `characters[]`: `id`, description, silhouette, palette, performance and optional supplied portrait/source |
| `sources.json` | `claims[]`: `id`, precise wording, source URL/date, qualification and where the claim appears; `assets[]`: identity, path, provenance/license, hash |
| `dialogue.json` | `lines[]`: `id`, `speaker_id`, `text`, performance intent and relevant `claim_ids` |
| `voice-inputs.json` | `takes[]`: line ID, provider/model/voice identity, source-text hash, raw and accepted WAV paths/hashes, measured duration, edit map, ASR decision and listening record |
| `shot-plan.json` | `shots[]`: stable ID, purpose, subject, camera, action, text region, continuity anchor and sound role |
| `timeline.json` | `fps`, `duration_frames`, `draft`; contiguous `shots[]` with `id`, `scene_type`, `start`, `end`, `headline`; frame-based dialogue, captions and action/sound events |
| `reference-map.json` | `shots[]`: `shot_id`, `scene_type`, `reference_start_seconds`, `reference_end_seconds_exclusive`, `visual_function` |
| `review-record.json` | Exact file/evidence identities, actual observed intervals/pages, native frames, motion, listening, defects and a qualitative decision |

Times in the timeline use integer output frames and half-open intervals. The
reference map uses seconds because the two films can have different frame rates.
Sources qualify specific claims; a bare URL is not a fact-check. Credentials and
session material never belong in these JSON files. A provider failure does not
authorize silently replacing a previously accepted take or changing the service.

The JS timeline helper validates shot structure only. A production must also
validate cross-references, current audio/text hashes, caption and sound placement,
asset availability and its own domain invariants before a final export.
