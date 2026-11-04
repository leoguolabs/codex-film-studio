# Build a film

## Working copy

Run `python3 scripts/new_film.py --list` to see every style and its completion
status. Run `python3 scripts/new_film.py <name> --style <id>` from the repository
root. The default destination is `../codex-film-studio-projects/<name>`; use
`--output /absolute/external/path` to choose another location. Destinations
inside the library, including through a symlink, are rejected. All following
commands run inside that external project unless stated otherwise.
For every style, start with the generated `README.md`, `STYLE.md` and available
`WORKFLOW.md` / `REVIEW.md`. Shared methods live in `methods/` in this repository.
Executable blank projects include `PRODUCTION.md`, pinned dependencies, fonts,
material renderers, frame export, audio mixing, captions and delivery checks.
Run `npm ci` and `npm run proof`, then fill `content/production.json` and author
new drawings in `src/scene.mjs`. `npm run build` produces the encoded film.
The proof is a material diagnostic, not a sample story. Package status is separate from existing local
showcase films. Use `python3 scripts/serve_styles.py` from the library root to
open the unified catalog and retained showcase pages.

For exact sample replay across styles, restore a sealed external source bundle
with `--replay-bundle PATH`. See [reproduction](methods/reproduction.md) for file
hashes, source retention, dependency locks and validation limits. Only the
whiteboard sample currently has its source inputs supplied by `fetch_demo.py`;
other showcase archives are presentation packages. Some, especially Satellite Briefing, include live composition code and partial inputs; use a sealed source bundle for the complete recorded rebuild dependency set.

Every new working copy includes `methods/` and `tools/frame_review/`. Read
`methods/README.md` to select reference adaptation, media selection, continuity
or revision guidance as needed. Style-specific workflow files remain in place;
the common methods supplement them. Production facts and acceptance records do
not enter these shared copies. Existing projects are preserved and are not
silently updated when the library changes.

## Whiteboard sample implementation

The commands and paths below apply to the whiteboard studio.
Install dependencies with `npm ci`, create a Python virtual environment and
install `requirements.txt`. FFmpeg must be on PATH.

The whiteboard starter's main files are:

| File | What to change |
| --- | --- |
| `content/narration.json` | Narration, stable line IDs, scene regions and claims |
| `content/sources.json` | Factual claims and primary sources |
| `content/shot-plan.json` | Shot intentions |
| `src/film.mjs` | Short-film drawings, camera and timing |
| `src/illustrations.mjs` | Reusable people and objects |
| `src/board.mjs` | Shared stroke and board renderer |
| `src/long-film.mjs`, `editions/long/content/` | Separate long-film example |

The supplied compositions are authored examples, not automatic text-to-scene
templates. Codex must adapt scene IDs, geometry, timing and narration together.
The default lettering supports English; a new script needs appropriate font
paths and subtitle typography before non-Latin text can render correctly.

## Voice

New projects include the optional [Edge TTS narration workflow](methods/narration.md). It sends the requested narration to the online voice service. Keep accepted WAV files with the project. Imported recordings and the Chatterbox integration are also supported.

The released demo inputs let you rebuild the examples without a TTS service.
For a new story, choose one of these paths:

1. Connect a **Chatterbox service implementing the API below**:

   ```sh
   export CHATTERBOX_TTS_URL="http://localhost:8000"
   export CHATTERBOX_TTS_API_KEY="your-service-key"
   export CHATTERBOX_VOICE="your-voice-id"
   .venv/bin/python scripts/speech.py
   ```

   The client expects `GET /v1/capabilities` with `max_chars`, a `fingerprint`
   and `voices` (each with `id` and `fingerprint`); `POST /v1/jobs` returns an
   `id`; `GET /v1/jobs/{id}` returns `status` (`completed` or `failed` at the
   end); `GET /v1/jobs/{id}/audio` returns WAV. Requests use `X-API-Key` and
   `Idempotency-Key`. This is a specific service contract, not a claim that
   every Chatterbox installation exposes the same HTTP API. See `speech.py`
   for the generation fields. Run your own service or adapt this client.

2. Generate Chatterbox WAVs separately, or supply your own recordings. Put one
   mono 16-bit PCM WAV per narration ID into a folder (`01.wav`, `02.wav`, ...):

   ```sh
   .venv/bin/python scripts/import_audio.py /path/to/narration-wavs
   ```

Then obtain independent timing and review:

```sh
.venv/bin/pip install -r requirements-asr.txt
.venv/bin/python scripts/transcribe.py
```

ASR uses MLX Whisper on Apple Silicon. On Linux/other macOS machines install
`faster-whisper` and use `--backend faster-whisper`. Models download on first
use. The released sample already includes its reviewed alignment data.
Do not present a transcript comparison as subjective listening.

Changed narration invalidates the old audio. Keep source/WAV hashes and
original recordings. Speech is used at natural speed. An unresolved transcript
difference blocks final validation; inspect it and repair the actual cause.

## Render

```sh
node scripts/render.mjs --stills
node scripts/render.mjs --draft --start 0 --end 8 --width 960 --out media/preview.mp4
node scripts/validate.mjs
.venv/bin/python scripts/build.py
python3 scripts/serve.py
```

Draft mode permits missing narration and estimated timing. The final build
requires current audio and reconciled alignment. It creates the picture,
mixes voice/music/foley, exports captions and checks the MP4. Full frame atlases
are generated unless `--skip-atlases` is selected. A reference comparison is
generated only when `reference/whiteboard.mp4` is present; this optional file
is LemoLab's [CC BY 4.0 reference](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/whiteboard.mp4).

All edition-aware commands accept `--edition long`. Outputs stay in the
selected edition's `media/` and `review/` folders. Rebuilding the same sample
uses the same drawing inputs and original audio, but byte-for-byte MP4 identity
is not promised across different platforms and encoder versions.

## Check and share

Review the final stills, consecutive motion and playback. Listen to the audio
when listening tools are available; otherwise state the actual validation
scope. Keep the source and a usable MP4 together. Do not upload private keys,
service settings or provider job records to a public repository.

For bounded previews in blank projects: `npm run doctor`, `npm run preview -- --start 72 --end 120 --width 640`, `npm run verify -- media/preview.mp4`, and `npm run serve`. Frame endpoints use the production FPS. See the copied `PRODUCTION.md`.
