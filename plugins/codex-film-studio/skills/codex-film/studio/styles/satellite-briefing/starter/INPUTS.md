# Input contracts

All supplied lists are empty and all decisions unresolved. Fill the new subject's
inputs before authoring or rendering. These JSON files are contracts and planning
records, not an automatic renderer configuration or a substitute for validation.

## Coordinates and time

- Geographic positions are objects with `lat` and `lon`, in degrees. The helper
  takes `[lat, lon]` for surface distances. Raster bounding boxes are ordered
  `[west, south, east, north]`; document their CRS separately.
- Helpers use kilometres and a sphere of radius 6371.0088 km. Declare any other
  model explicitly. Linear units in a UI label do not define a measurement.
- Frame ranges are zero-based, integer and end-exclusive. Final timeline shots
  cover `[0, duration_frames)` exactly once. Seconds are derived from the stated
  frame rate. Media timestamps use their actual time base.
- Paths are relative to this production where possible. Hashes refer to actual
  file bytes; do not fill them with expected or placeholder values.

## Files to fill

| File | Required information when populated |
| --- | --- |
| `brief.json` | Subject, audience, viewer question, narration/on-screen languages, delivery intent and constraints |
| `sources.json` | Claims: ID, statement, source URL, relevant wording/date and uncertainty. Assets: ID, source, creator, date, terms, rights decision and attribution |
| `imagery.json` | Places: stable ID and coordinates. Plates: ID, local file/hash, source asset ID, CRS, bounding box, acquisition date, resolution and any modifications. Measures: endpoints/region, model, source/date, unrounded result, unit and display label |
| `footage.json` | Source ID, local media/hash, verified location/appearance, stream/PTS facts, selected source interval, rights/source record, render trim/crop/speed, and visual-review coverage |
| `narration.json` | Lines with stable ID, exact text and explicit language; pronunciations/claims tied to the new subject |
| `voice-inputs.json` | Provider/runtime identity, selected voice/reference hash and takes: line ID, source hash, WAV path/hash, sample rate, channels, duration, timing file/hash, ASR findings and listening status |
| `shot-plan.json` | Shot ID, purpose, visual operation, location/plate/footage IDs, camera, action, displayed reading, narration IDs, transition and sound events |
| `timeline.json` | Delivery frame rate, duration_frames and contiguous shots with `id`, `scene_type`, `start`, `end`, `headline`; plus captions/audio/events on the same clock |
| `reference-map.json` | One mapping per compared shot: `shot_id`, matching `scene_type`, `reference_start_seconds`, `reference_end_seconds_exclusive`, and the explicit `visual_function` being compared |
| `review-record.json` | Exact final/reference/timeline hashes, automated results, actual inspected ranges and resolutions, reference comparisons, playback observations, listening observations, defects and final decision |

For the generic comparator, `scene_type` is the declared visual operation, not
the destination's name. Its numeric `fps` must agree with the actual encoded
clock within the tool's supported precision. Pass exact rational rates to the
identity comparison tool when relevant. Follow `tools/frame_review/README.md`
for the detailed supported tool format.

## Finalization conditions

`draft` stays true until the authored timeline uses current, reviewed audio
and source inputs. Validate that referenced IDs exist, selected intervals lie
inside decoded streams, files match hashes, coordinates/bounds are finite and
legal, captions reproduce the source, and required claims have evidence.
Do not turn `draft` off solely to bypass missing narration. Empty inputs must
never be presented as an accepted or rendered film.

Store your renderer-specific geometry and audio parameters alongside these
files. Add dependency/version and reproduce commands for that implementation.
Keep tokens, cookies, local account configuration and model caches private.
