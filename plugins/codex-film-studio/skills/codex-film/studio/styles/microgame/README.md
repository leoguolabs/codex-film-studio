# Microgame toolkit

Executable tooling is now included: see [TOOLS.md](TOOLS.md). New subjects still
need authored scenes, source assets and accepted audio. Original-sample replay
uses an external source bundle, as described in [reproduction](../../methods/reproduction.md).


[Open the independent style page](https://visiontrail.github.io/codex-film-studio/styles/microgame/showcase/index.html?lang=en) · [中文风格页](https://visiontrail.github.io/codex-film-studio/styles/microgame/showcase/index.html?lang=zh)

The page contains an original, silent interactive material study, creation steps
and source references. It is separate from the blank production kit; the page also links released films.

Independent Canvas 2D material, character, action and UI helpers. No example
story, narration, provider jobs or films are packaged in this library.

- `engine/primitives.mjs`: outlined toon shapes, command typography and fuse.
- `engine/materials.mjs`: separate palettes, material response and generic props.
- `engine/characters.mjs`: performer and stage-host drawing helpers.
- `engine/blueprint.mjs`: thin contours, hidden lines, supported assemblies and leader notes.
- `engine/terminal.mjs`: character-built performers, props, readouts and contacting hands.
- `engine/collage.mjs`: coloured print plates, paper scenery and scored foreground planes.
- `engine/brush.mjs`: pressure-shaped bristles, dry gaps, wet edges and ink figures.
- `engine/games.mjs`: deterministic action construction; requires authored inputs.
- `engine/frame_audit.py`: complete encoded-frame ledger and sequential atlases.
- `engine/ffmpeg_gate.py`: shared FFmpeg serialization without killing other work.

The pixel material exports `indexPixelBuffer(context)` for palette quantization
before enlargement. The action renderer adds Swiss headline and rule typography.
Run `node --test engine/characters.test.mjs engine/materials.test.mjs` to check
contact transforms, palette closure and ordered ground stipple; inspect rendered motion separately.

Author your composition, camera, story-specific transformations, audio and final
export in the production project. Released films are separate from the executable blank kit.
See `STYLE.md` for review criteria. Python audit requires OpenCV, NumPy and
Pillow; drawing needs a compatible Canvas 2D implementation and licensed fonts.

The frame audit decodes every frame, hashes its RGB pixels, and writes consecutive
atlases without sampling. Use `--expect-frames` to catch truncated exports. Keep
a separate inspection log bound to the source hash; generating an atlas does not
mean anyone has looked at it. The FFmpeg gate accepts an executable and arguments,
for example `python engine/ffmpeg_gate.py ffmpeg ...`.

`pixel.mjs` supplies a grid-authored performer and an indexed night landscape.
It uses stepped silhouettes, clustered light/shadow planes and a dithered
terrain edge; hand contacts remain in the caller-provided local coordinates.

## Start with a prompt / 用提示词开始

Open the cloned studio in your coding Agent and paste:

> Use the microgame style to make a [duration] film about [subject] for [audience],
> with narration and captions in [language]. Read the studio guides, create an
> independent project and prepare the environment yourself. Produce and review
> the film, then deliver a 1080p MP4, editable project and actual review scope.

在 Agent 中打开已克隆的工作室，直接发送：

> 请用 microgame 风格，为[观众]制作关于[主题]的[时长]视频，使用[语言]配音和字幕。
> 请你自动创建独立项目、准备环境，完成制作与检查，交付 1080p MP4 和可编辑工程。

For an exact sample, give the Agent its title or link and ask it to check for the
original source project and assets first. See [reproduction](../../methods/reproduction.md).
