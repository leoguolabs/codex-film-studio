# Caption News · 字幕新闻

Executable tooling is now included: see [TOOLS.md](TOOLS.md). New subjects still
need authored scenes, source assets and accepted audio. Original-sample replay
uses an external source bundle, as described in [reproduction](../../methods/reproduction.md).


**Package status: renderer-ready / 可执行制作包.** A subject-empty authoring package
for large editorial captions, selective emphasis, ledger graphics and kinetic
entrances. The included renderer, audio pipeline and preview/export commands accept authored scenes and recordings.

Open the cloned studio in your coding Agent and paste:

> Use the caption-news style to make a [duration] film about [subject] for [audience],
> with narration and captions in [language]. Read the studio guides, create an
> independent project and prepare the environment yourself. Produce and review
> the film, then deliver a 1080p MP4, editable project and actual review scope.

在 Agent 中打开已克隆的工作室，直接发送：

> 请用 caption-news 风格，为[观众]制作关于[主题]的[时长]视频，使用[语言]配音和字幕。
> 请你自动创建独立项目、准备环境，完成制作与检查，交付 1080p MP4 和可编辑工程。

For an exact sample, give the Agent its title or link and ask it to check for the
original source project and assets first. See [reproduction](../../methods/reproduction.md).


The independent project contains [the style guide](STYLE.md),
[empty inputs](starter/INPUTS.md), [caption motion helpers](starter/lib/caption.mjs),
the shared methods and frame-review tools. Creation does not install packages,
contact a provider or reuse another film's story. Use supplied recordings or a
configured voice service, then measure and align the audio in that project.

Read [the starter guide](starter/README.md). Choose a licensed font and a renderer
suited to the new composition; the helpers need only a current Node.js runtime.
The starter includes an executable material renderer and shared delivery pipeline. A separately published film
preview is available on the style page.

## Explore the style

Open the library's `styles/caption-news/showcase/index.html` for an original type study,
visual rules, bilingual navigation and a screening room. Watch the
[complete online film preview](https://visiontrail.github.io/codex-film-studio/styles/caption-news/showcase/index.html#screening).
For local production playback, from the library
root, run `python3 scripts/serve_styles.py --port 8249`, then open
<http://127.0.0.1:8249/styles/caption-news/showcase/index.html>.

The public build downloads a checksum-pinned Release bundle containing the
complete web preview, poster, captions, chapters and credits. Local playback can
still use the retained production registered in `styles.json`. The original
schematic artwork is labelled separately from the video. Production-specific
media and metadata stay in the Release bundle and Pages artifact; they are not
copied into new-film starters or reusable methods.

Reference influence: the editorial visual grammar of
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)'s Caption News style.
The rules and helpers here are independently authored; no upstream media or
finished-story implementation is included in the blank starter; the reusable runtime is bundled.
