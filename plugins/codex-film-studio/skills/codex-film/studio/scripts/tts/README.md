# Shared Edge TTS tools

`edge_voice.py` generates new narration with the third-party `edge-tts` client,
exports original MP3 and mono PCM16 WAV, records measured duration and hashes,
and retains provider word boundaries and line-level SRT/VTT. It contains no
story, credentials or generated media. Python 3.11+, FFmpeg/FFprobe and network
access are required for synthesis. All FFmpeg calls use the shared waiting gate.

`new_film.py` copies this folder to each new project's `tools/tts/`.
Run commands inside the external production. See
[the narration workflow](../../methods/narration.md) for generation, timeline
binding and style-specific audio imports.

The default is `en-US-AvaNeural` at `+12%`, with neutral volume and pitch.
These are synthesis settings; the generated audio is never accelerated again
by this tool. Choose a matching locale/voice for other languages.

The Edge service requires no personal API key with this client. It is an online
consumer service, not a contracted Azure Speech API. Availability, voices and
upstream behavior can change; do not claim unlimited access or deterministic
regeneration from text. Preserve the accepted audio. The client is pinned in
`requirements.txt`; record production dependencies with `pip freeze` when sealing
a project. Upstream: <https://github.com/rany2/edge-tts>.

No credentials or tokens are written to output receipts. Network errors stop
production after three attempts; there is no automatic switch to another voice
provider. Provider timing is labelled and does not replace independent ASR,
pronunciation review or listening.
