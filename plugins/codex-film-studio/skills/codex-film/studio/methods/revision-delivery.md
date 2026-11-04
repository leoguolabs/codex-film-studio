# Re-edit, verify and retain a delivery

Apply this method to revisions, compilations, alternate aspect ratios and new
editions. The current brief defines the deliverable count, runtime, format and
content boundaries. Keep prior accepted versions and their evidence identifiable.
For a new delivery shape, use [aspect-ratio editions](aspect-ratio-editions.md).

## Re-edit around the new viewing experience

Combining films is an editorial change. Remove repeated openings and endings,
choose a clear order and connect the retained sections with deliberate pacing.
Preserve a complete thought and the qualifications attached to each factual
claim. If a claim is removed, check that remaining narration still makes sense.

Fit the requested runtime through selection and structure before changing speech
speed. Preserve original takes, text hashes and source timing. Reusing accepted
audio does not accept new joins, changed captions or a new mix. Rebuild the
authoritative picture, speech, caption, chapter and sound timeline together.

Use stable IDs rather than array positions to connect inputs. Validate complete
picture coverage, intended overlaps, chapter boundaries, current asset hashes,
source-time mapping and audio/caption placement. Record crop and preprocessing
versions so an old cache cannot silently restore a rejected framing.

## Recheck the evidence affected by a change

| Change | Evidence to renew |
| --- | --- |
| Source, crop, typography or graphics | Changed encoded frames, readability and relevant motion |
| Timing, order or duration | Cuts, source mapping, captions, joins, chapter navigation and ending |
| Voice, music, gain or audio encoding | Decoded audio, loudness/peak, alignment and listening when available |
| Any new delivery file | File hash, stream metadata, complete decode and intended-player playback |

Rebind surviving evidence to the new file only with an explicit basis. Pixel
observations carry forward only over proven identical decoded frames and matching
timestamps, intersected with the actual prior inspection coverage. Unchanged
source files alone do not prove unchanged encoded output. Likewise, packet/sample
identity can support reuse of a documented audio review; it cannot create one.

Play the current export at normal speed, check a seek and the ending, and test
chapter controls when present. Record the exact media URL or file hash so a
cached previous export cannot be mistaken for the replacement. Keep measurements,
observed images, observed motion and listening status separately visible.

## Keep one authoritative delivery record

Record output path, hash, size, format, duration, current brief/timeline, editable
source revision, companion files and hashes of acceptance evidence. State what
remains unchecked. Update the gallery and delivery manifest together; mark older
exports as previous versions instead of leaving competing files labelled final.

Verify actual files and hashes rather than relying on an existence check. Media
may be intentionally ignored by Git: distinguish files saved on disk, source
committed in a production, methods committed in the library, and publication.
A local delivery does not imply an upload, remote backup or published acceptance.

## Return the transferable part to the library

| Destination | Retain |
| --- | --- |
| Production | Subject, script, facts, cast, source media, timing, provider receipts, exports and review evidence |
| Style package | Palette, typography, material and motion grammar, generic helpers and empty inputs |
| Shared methods | Decisions, invariants, failure diagnosis and verification that work across subjects and styles |

Before promoting a rule, remove the original names, dates, paths, numbers, clip
counts and result claims. Ask whether it still helps a different subject, medium,
duration and renderer. Keep conditional rules conditional: an illustrated story
does not inherit a footage quota, and a new delivery does not inherit another
film's loudness target. Link shared methods from the production workflow and
include them in fresh working copies so they can actually guide the next film.
