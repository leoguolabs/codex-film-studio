# Vermilion Paper Cut

An editable 24 fps animation kit. The scene module is empty. Draw the new film's paths, mechanisms, locations and actions in `film.mjs`. Keep the different paper depths and holes readable at release size. The engine and the authoring clock use 1280×720 coordinates. Deliver 720p or use `--scale 1.5` for 1080p.

1. Run `npm ci` then `npm run proof`. The proof shows only craft primitives.
2. Set the film's total seconds, voice and English lines in `content/narration.json`. A line takes `id`, `at` in seconds, `text` and an optional `caption` array for line breaks. Choose the story and record speech before locking motion.
3. Use Python 3.11 with `pip install -r requirements-voice.txt`. For new speech, run `python scripts/voice.py --models /path/to/kokoro-models`, using the Kokoro v1.0 ONNX model and voice bank. The script writes retained PCM takes, measured cues and English SRT. Once takes are retained, rebuild with no model service.
4. Export `shots` as contiguous half-open frame ranges with `id`, `role`, `start` and `end`. Export `draw(s,{t,i,shot,local,duration})`. The Stage has a 2D canvas context, `group(x,y,angle,sx,sy,paint)`, `at(x,y,angle,scale,paint)`, `piece(path,colour,options)`, `fill(path,colour)`, `ground(colour)`, `pin`, `halo` and `through`. Compound paths use even-odd filling so the layers underneath show through perforations. Palette names or hexadecimal colours work. Motifs and subtitle/title helpers are under `engine/`.
5. Author `content/sound.json`. Each phrase has `at` in seconds, MIDI `notes` (null for rests), an `instrument` (pluck, zither, flute or bow) and optional `step` in beats, `hold` as a fraction of the step, `gain`, `pan` and `repeats`. Foley entries have `at` and `kind` (snip, fold, snap, wood, gong, thud, wind, flutter, creak) plus optional `gain` and `pan`. Create your own tune here. The mix ducks continuously under spoken cues and keeps stems separately.
6. Inspect `npm run still -- media/check.png FRAME` and a motion window using `python scripts/build.py --start FIRST --end LAST --output media/preview.mp4`. The end frame is exclusive. Finish with `python scripts/build.py --output media/film.mp4` from the project's Python environment. It waits for active FFmpeg processes using the common advisory lock.

Keep the English takes, content JSON, drawings, music and sound design, SRT and accepted film together. Document the final playback and what you actually inspected. The kit uses synthetic instrument models, the OFL-licensed Fraunces and Bodoni Moda fonts, and original paper primitives.

## Replace the score in an accepted cut

When the brief names a music generator, retain its original file and generation prompt. Prefer one continuous source passage. Use measured musical attacks to choose the passage, then leave room for dialogue and frame-timed paper Foley.

After building the picture and its separate voice and Foley stems, set up a score design JSON with these keys:

- `source` gives the provider file relative to the project directory, and `source_sha256` verifies that file.
- `segments` lists `source_start`, `film_start`, and `duration` in seconds. For an intentionally overlapping second interval, set its `crossfade` to the duration of the overlap.
- `music_median_rms_dbfs` sets the bed level and `music_duck_db` sets attenuation under speech. `music_envelope_db` gives time and gain pairs in seconds and dB. `fade_in` and `fade_out` set the edge fades in seconds.

Run `python scripts/replace_score.py --video media/film.mp4 --design audio/music/edit.json --output media/film-with-score.mp4`. The script copies the existing picture stream and creates a new mix. It retains the score with and without voice ducking and leaves the original film in place. Verify video payloads and timestamps when reusing earlier frame review material. Review the actual new encoded audio and report how it was checked.
