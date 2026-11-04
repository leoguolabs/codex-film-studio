# Production workflow

## 1. Resolve the new brief

Fill the empty brief with subject, audience, language, intended takeaway and
delivery requirements. Set duration from the story and the user's needs. Record
reference paths/hashes in the external project. Keep reference assets external.
Write a claim ledger for factual content; fiction does not require invented
research. Distinguish allegations, reported counts and established findings.

Invent the cast and their relationship. Document required real identities and
the new project's supplied portraits or brand/flag references. The old film's
people, country, statistics, sources, voice names and number of worlds are not
defaults. Use `characters.json` and `sources.json` as fresh inputs.

## 2. Turn the subject into visible events

Write dialogue with stable line IDs. For each proposed shot, record its purpose,
subject, framing, visible action, reaction, continuity anchor, text and sound.
Examples of shot functions are relationship, reaction, mechanism, reveal and
travel. These are options, not a required sequence or fixed scene count.

Separate facts from animated presentation. A numerical readout comes from the
same authoritative value as its label. Animation can choose when to reveal it;
it cannot interpolate a count into an unsupported factual assertion.

Sketch every world and the densest inserts at delivery size. Inspect a close-up,
a small character pose, a two-shot, a transition boundary and a label-heavy frame
before committing to the whole film. Repair actual geometry and staging.

## 3. Accept the voices before locking the edit

Use the user's configured Pocket TTS or Chatterbox service, or import recordings.
Read that service's real API contract; do not guess an endpoint or assume that
all deployments implement the same API. Existing credentials stay in environment
variables or external configuration. A voice name working on one deployment is
not evidence that it exists on another.

Generate short auditions for each role, listen when possible, then produce
separate WAVs per stable line ID. Preserve requests, provider/model identity,
voice identity, text hash and original WAV hash in private project evidence.
`voice-inputs.json` records accepted files and identities, without credentials.

Use independent ASR to compare words and locate timing. Resolve missing words or
pronunciation problems explicitly. ASR differences can be transcription errors;
do not blindly regenerate an already correct spoken word. Preserve an explanation
and supporting audio evidence for accepted discrepancies. Listen separately.

Do not accelerate or pitch-shift speech to fit a guessed shot duration. If
trimming silence, record removed sample intervals and verify that spoken samples
were not changed. Changed text, voice or accepted WAV invalidates dependent word
timing, caption timing, speech envelopes and the final mix.

## 4. Build one authoritative timeline

Use zero-based integer frames and half-open intervals `[start, end)`. Every frame
belongs to exactly one contiguous shot. Derive state from the requested frame;
random seeks and fresh-process renders must give the same drawing.

The final timeline holds measured dialogue placement, shots, captions, action
events and sound cues. Author actor poses on the drawing clock and camera/prop
movement on the output clock. Name events such as a button press or impact once,
then let picture and sound consume the same frame. Keep silent holds explicit.
Keep outline geometry independent of both clocks. Use fixed local-space texture,
stable body/head holds and smooth action transitions. Do not add idle scale loops,
camera shake or repeated nodding merely because they appeared in a reference.

`lib/timeline.mjs` validates shot coverage and resolves exact boundary frames.
It deliberately rejects the empty draft timeline. This helper does not validate
claims, audio files or artistic quality; those need their own evidence.

## 5. Render and repair

Author the new scene code using the generic drawing primitives or a renderer
appropriate to the brief. Do not copy a prior production's character/world module
and merely replace its captions. Keep dependencies and fonts portable and pinned
where practical; test without the author's parent project or private services.

Inspect source-rendered stills and short motion previews, including the frames
on either side of cuts. Repair one concrete defect at a time: face occlusion,
dense shrinking contours, misplaced insert camera, unreadable label, broken prop
contact, or discontinuous portal position. Recheck the changed region before
exporting. Source previews are separate from encoded-file acceptance.

Serialize FFmpeg processes through `tools/frame_review/ffmpeg_gate.py` on supported
POSIX hosts. It cooperates through a shared lock and waits for other encoders;
it cannot prevent uncoordinated software from starting later. Never stop another
production's process to gain capacity. On native Windows use WSL or an equivalent
coordination mechanism explicitly implemented for that environment.

## 6. Review the actual export and deliver

Follow REVIEW.md on the encoded file. Match reference shots by visual function,
not absolute time or identical content. Keep actual visual observations separate
from generated sheets, decoded metrics, playback and listening. Re-export after
material repairs and invalidate evidence affected by the change.

Deliver the video, captions, exact dialogue, editable code, dependencies, asset
credits and a report tied to the final file hash. State remaining limitations.
Keep provider responses, private inputs, reference assets and media outside the
method library. A local completed film is not a public upload. Publishing the
film or its private inputs requires the user's authorization for that destination.
