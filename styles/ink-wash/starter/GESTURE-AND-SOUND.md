# Directing a loaded-brush gesture

Choose a single point on the subject where the force changes hands. It can be a fingertip on an object, a planted foot, or the edge of a moving surface. Draw the contact point and the thing that gives way in the same world coordinates. Preserve paper around the reading face and the caption.

## Prepare, press and lift

1. Draw the still silhouette and the material it is about to disturb. Give the paper a dark mass before the release. Shape the mass around the subject and its setting. In a close shot, let the viewer see where the brush will enter.
2. Rehearse the departure on individual frames. Hold the preparation, let the joint unload, then let one broad loaded stroke run from the contact to the edge of the composition. Four frames at 24 fps is a useful first study for a fast stroke. Adjust it to the reference's observed timing.
3. Paint one edge with a loaded belly and the other with dry, irregular hairs. Preserve a strip of light paper when two masses separate. Draw the receiving material yielding in its own time. Give airborne pigment varied birth frames and trajectories. Let the mark left on the sheet outlast the moving body.
4. Check a full-size still immediately before contact, the next six frames, the maximum separation and the recovery. Follow a planted foot, the active joint and the tail of the mark between frames. If the brush looks like an extra limb or a closed ribbon, break the return contour and paint the material on the opposite side of the gap. Keep the silhouette legible through the release.
5. A short return towards the paper colour can accent a strong gesture. Test it with the frame displacement at normal playback speed. The subject, pressure edge and opening gap should still carry the action with camera displacement and the paper lift disabled.

Use `loadBrush(points, width, seed)` from `engine/loaded-brush.js` in setup or module scope. Each point is `[x, y, pressure]`. Its return value paints with `paint(ink, progress, opacity)`. Drive progress on the shared 24 fps timeline. `splinters(count, seed, makeParticle)` caches deterministic pigment trajectories. Each particle supplies local position, velocity, gravity, size, opacity, birth time, flight time and fade. Paint it with `paintDrops(wetContext, ageSeconds, opacity)`.

## Score the transfer of weight

- Keep the accepted instrumental, the brief used to generate it, the source offsets and fades. For generated music, retain the downloaded audio and identify its actual provider.
- Cut the score as phrases. Open space before the contact with a short gain envelope. Let the attack, the material moving away, and the falling or settling response speak from distinct places in the stereo field. For field recordings, retain the source, author and license.
- Locate the attack *inside* the audio file. For a clip played at rate r, put the clip on the film at visual contact minus (source transient minus source-in) divided by r. A file can contain silent lead-in. Add a broad tail after the dry contact and leave space around the voice.
- The optional `scripts/mix_recordings.py` reads `content/recording-edit.json`. Paths are local to the production. Put accepted material under `audio/` and keep the English cue sheet in `content/cues.json`. Set the instrumental path, relative field directory, and the three sets of events following the named columns in the contract. Each foley source is a FLAC named after its source key. Running the editor writes 48 kHz stereo music, foley, speech and mix WAVs. Master, mux with the serialized FFmpeg runner, then check the AAC recovered from the actual film.

## Compare the release

Keep the delivered predecessor. Find the first release frame in the reference, the predecessor and the candidate by looking at the drawings. Anchor a second comparison on those frame numbers in addition to the exhaustive whole-film comparison. With frame audits already available, run `python scripts/compare_release.py OUT --track Reference REF_AUDIT REF_FRAME --track Before OLD_AUDIT OLD_FRAME --track After NEW_AUDIT NEW_FRAME`. The output contains a per-frame CSV, a short-window measurement summary and chronological comparison sheets. Review the sheets and play the actual cuts at normal speed. Pixel displacement includes moving figures, camera and paper. Use it to find weak or excessive passages, and judge the painted pressure, silhouette and cause-and-effect separately.
