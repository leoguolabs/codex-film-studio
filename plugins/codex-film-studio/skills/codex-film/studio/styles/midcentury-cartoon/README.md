# Mid-century Cartoon · 50 年代平涂卡通

Executable tooling is now included: see [TOOLS.md](TOOLS.md). New subjects still
need authored scenes, source assets and accepted audio. Original-sample replay
uses an external source bundle, as described in [reproduction](../../methods/reproduction.md).


**Package status: renderer-ready / 可执行制作包.** Misregistered flat colour, broken ink, held poses, purposeful hand actions and jazz.

This package provides reusable rules, blank inputs and generic tools. Author the
new subject's characters, scenes, narration, scene extensions and sound in its own project.
The catalog records local showcase pages separately from a published demo.

## Independent style page

[Open the bilingual style page](https://visiontrail.github.io/codex-film-studio/styles/midcentury-cartoon/showcase/index.html).
Watch the short or long film, explore an original hand-to-switch print study,
and use the style notes, Agent prompts to start a new film.
The retained frame comparison and motion review are linked from the page.

## Start with a prompt / 用提示词开始

Open the cloned studio in your coding Agent and paste:

> Use the midcentury-cartoon style to make a [duration] film about [subject] for [audience],
> with narration and captions in [language]. Read the studio guides, create an
> independent project and prepare the environment yourself. Produce and review
> the film, then deliver a 1080p MP4, editable project and actual review scope.

在 Agent 中打开已克隆的工作室，直接发送：

> 请用 midcentury-cartoon 风格，为[观众]制作关于[主题]的[时长]视频，使用[语言]配音和字幕。
> 请你自动创建独立项目、准备环境，完成制作与检查，交付 1080p MP4 和可编辑工程。

For an exact sample, give the Agent its title or link and ask it to check for the
original source project and assets first. See [reproduction](../../methods/reproduction.md).

## Package contents

| File | Purpose |
| --- | --- |
| [STYLE.md](STYLE.md) | Visual, performance and sound grammar |
| [starter/WORKFLOW.md](starter/WORKFLOW.md) | Short and chaptered film production |
| [starter/AUDIO.md](starter/AUDIO.md) | Narration, original WAVs and timing |
| [starter/REVIEW.md](starter/REVIEW.md) | Frame, motion and listening review |
| [starter/INPUTS.md](starter/INPUTS.md) | Empty input contracts |
| [starter/lib/print.mjs](starter/lib/print.mjs) | Print and drawing primitives |
| [starter/lib/timeline.mjs](starter/lib/timeline.mjs) | Frame clock and shot lookup |
| [PROVENANCE.md](PROVENANCE.md) | Sources and licensing |
| [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt) | Retained upstream license |
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

## Helper and packaging checks

```sh
python3 -B -m unittest discover -s styles/midcentury-cartoon/tests -v
node --test styles/midcentury-cartoon/starter/tests/*.mjs
```
