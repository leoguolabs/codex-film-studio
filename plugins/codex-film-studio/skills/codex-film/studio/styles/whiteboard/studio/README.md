# Whiteboard studio

This is the editable whiteboard template from
[Codex Film Studio](https://github.com/visiontrail/codex-film-studio).

Start with the repository's [setup and sample rebuild instructions](https://github.com/visiontrail/codex-film-studio#rebuild-the-whiteboard-sample).
`content/narration.json` and `src/film.mjs` hold the short example. The separate
long edition uses `editions/long/content/` and `src/long-film.mjs`.

The original sample narration and timing are available from the Release;
use the repository's `scripts/fetch_demo.py` to download them. New narration
can use a Chatterbox-compatible service or `scripts/import_audio.py`.

Run `python3 scripts/serve.py` to open the local showcase after fetching or
building media. The default address is http://127.0.0.1:8246/.
