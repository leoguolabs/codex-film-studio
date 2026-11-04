# Exploded Teardown · 爆炸拆解

[Open the independent style page](https://visiontrail.github.io/codex-film-studio/styles/exploded-teardown/showcase/index.html?lang=en) · [中文页面](https://visiontrail.github.io/codex-film-studio/styles/exploded-teardown/showcase/index.html?lang=zh)

Dark-studio product photography, functional layer separation, material close-ups and projected engineering annotations. The bilingual page includes two complete English films, chapter navigation, transcripts, style rules, a prompt-first authoring path, build notes and reference attribution.

This is an **executable production kit**: [style guide](STYLE.md), [prompt](prompt.txt), [blank input contract](starter/content/film.json), [starter instructions](starter/README.md) and [provenance](PROVENANCE.md). New films need their own geometry, narration, score and verification. The kit supplies a Three.js PBR assembly renderer, staggered separation/return, outside camera orbit, projected labels and the shared caption/audio/export pipeline. See the starter for the model contract and the additional Chromium engine installation. The finished films are published separately from the library's reusable source.

Tell your Agent: “Use Exploded Teardown to explain [object] in a [duration] English film. Create the project, research the object, build the geometry and timeline, then deliver the MP4, editable project and actual review scope.”

The Agent uses `scripts/new_film.py <name> --style exploded-teardown` from the library root. See the [shared workflow](../../methods/WORKFLOW.md). Exact sample rebuilding requires the independent production's original source and assets; a public MP4 alone does not provide them.

Both retained original projects have local checksum-pinned source bundles, with 30–34 s draft clips rebuilt from their original scenes and complete audio mixes regenerated from the retained recordings. This is clip validation, not full master acceptance. No public source-bundle release URL is available yet. Use a supplied local source index with `scripts/fetch_source.py`; follow the restored `REBUILD.md`.
