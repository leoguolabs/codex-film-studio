# Art Collage · 艺术拼贴

Executable tooling is now included: see [TOOLS.md](TOOLS.md). New subjects still
need authored scenes, source assets and accepted audio. Original-sample replay
uses an external source bundle, as described in [reproduction](../../methods/reproduction.md).


[**Open the Art Collage page / 打开艺术拼贴独立页面 ↗**](https://visiontrail.github.io/codex-film-studio/styles/art-collage/showcase/index.html)

**Package status: renderer-ready / 可执行制作包.** Paper materials, cutouts, typography, physical motion and review rules.

This package provides reusable rules, blank inputs and generic tools. Author the
new subject's characters, scenes, narration, renderer and sound in its own project.
The standalone page includes a released film preview, chapters, English captions,
transcript, research notes and a bilingual guide to the style. This screening copy
is separate from the blank authoring starter and retains the original composition outside the library; the starter now includes a material renderer.

## Start with a prompt / 用提示词开始

Open the cloned studio in your coding Agent and paste:

> Use the art-collage style to make a [duration] film about [subject] for [audience],
> with narration and captions in [language]. Read the studio guides, create an
> independent project and prepare the environment yourself. Produce and review
> the film, then deliver a 1080p MP4, editable project and actual review scope.

在 Agent 中打开已克隆的工作室，直接发送：

> 请用 art-collage 风格，为[观众]制作关于[主题]的[时长]视频，使用[语言]配音和字幕。
> 请你自动创建独立项目、准备环境，完成制作与检查，交付 1080p MP4 和可编辑工程。

For an exact sample, give the Agent its title or link and ask it to check for the
original source project and assets first. See [reproduction](../../methods/reproduction.md).

## Package contents

| File | Purpose |
| --- | --- |
| [STYLE.md](STYLE.md) | Visual, motion, identity and production rules |
| [starter/content/brief.json](starter/content/brief.json) | Empty production brief |
| [starter/content/characters.json](starter/content/characters.json) | Portrait and character inputs |
| [starter/lib/paper.mjs](starter/lib/paper.mjs) | Deterministic torn paper and compositing primitives |
| [prompt.txt](prompt.txt) | Short prompt for the generated project |

## Reuse and review

New projects select their own facts, cast, identities, voices and assets. Specific
real people use portraits supplied for that production. Keep originals, provider
responses, films and review records in the external project. Contribute reusable
rules and tools back to this style package. The existing showcase pages are retained
examples; their review conclusions do not apply to new films.

Use [frame-review tools](../../scripts/frame_review/README.md), record actual
still inspection, motion playback and listening separately, and repair observed
defects. A successful helper test or render does not establish visual acceptance.
