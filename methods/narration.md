# Reusable narration and video integration

For new English narration, Edge TTS is available without a personal API key.
The shared default is `en-US-AvaNeural` at `+12%`, matching the established smooth
English delivery. Honor a requested voice, locale or configured Chatterbox
service. New languages require a matching voice and subtitle font. Exact sample
replays continue to use their retained audio.

`new_film.py` includes `tools/tts/` in every fresh project, including the
whiteboard sample project. Existing production projects are not modified.
All commands below run inside the external production.

## Generate and retain narration

```sh
python3.11 -m venv .venv
.venv/bin/python -m pip install -r tools/tts/requirements.txt
.venv/bin/python tools/tts/edge_voice.py voices --locale en-US
```

Author `content/narration.json`. The empty contract is in
`tools/tts/narration.example.json`; fill `lines` with unique stable IDs and the
new subject's text. Each line is `{ "id": "...", "text": "..." }`. Existing
whiteboard narration arrays are accepted directly. Config fields `voice`,
`rate`, `volume` and `pitch` are optional; CLI options override them.

```sh
.venv/bin/python tools/tts/edge_voice.py synthesize content/narration.json \
  --output media/narration
```

Each line produces original MP3, 24 kHz mono PCM16 WAV, provider word-boundary
JSON and line-level SRT/VTT. `manifest.json` records voice settings, client
version, text/WAV hashes, sample count and duration. An identical rerun verifies
and reuses its files. Changed text/settings get new filenames; prior audio is
preserved. Corrupt cache files fail rather than being reused. No provider
credentials are needed. The online service may change; the accepted WAV is the
reproduction source, not a promise of identical future synthesis.

## Attach to the shared video runtime

First author the scenes, shot ranges and full duration in
`content/production.json`. Create `content/voice-starts.json` as a JSON object
mapping each narration ID to its intended integer start frame, for example
`{"intro": 24, "explanation": 144}`. These are authored cue positions, not
automatic shot edits. Choose positions after measuring the generated audio.

Preview the resulting production JSON, then apply it when its timing is ready:

```sh
.venv/bin/python tools/tts/edge_voice.py bind --project . \
  --manifest media/narration/manifest.json --schedule content/voice-starts.json
.venv/bin/python tools/tts/edge_voice.py bind --project . \
  --manifest media/narration/manifest.json --schedule content/voice-starts.json --apply
npm run check
npm run build
```

The binding writes runtime-compatible `audio` and line-level `captions` to the
same frame timeline, retaining music/effects. Full WAV sample duration is
rounded **up** to a frame boundary. Overlapping speech or clips extending beyond
the film fail; lengthen/rearrange the edit instead of clipping or stretching
speech. Applying saves the previous production JSON beside it. Existing voice
and captions require explicit `--replace-voice`, which replaces both while
preserving music/effects. A synthesis change requires rebinding and revising
the scene timing. The tool does not author visual actions or certify a film.

## Style-specific compositions and whiteboard

For a composition with its own timeline, load the WAV paths and measured
durations from `manifest.json` and use them on the picture/caption clock.
For importers that expect one `<id>.wav` per line:

```sh
.venv/bin/python tools/tts/edge_voice.py export-wavs media/narration/manifest.json \
  --output media/narration-import
.venv/bin/python scripts/import_audio.py media/narration-import
.venv/bin/python scripts/transcribe.py
```

The last two commands apply to whiteboard. Its independent transcription and
alignment gates remain required. Other styles use their documented audio
import contract. Provider word boundaries remain labelled as provider timing;
they are not independent verification of the spoken words. Review the actual
voice pronunciation, pauses, music balance, subtitle readability and encoded
video before delivery. Report any missing listening or motion review honestly.
