# 来源与实现边界

参考作者：[LemoLab / Lemomo](https://x.com/lemomo_ai)。参考项目：
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)，
[Mid-century Cartoon / Meet Pip](https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/midcentury-toon)。
本次提炼核对了其 [STYLE.md 固定版本](https://github.com/lemomo-ai/lemo-opuscar/blob/02dce5b6ff6210622788c15319c082e9cb9e7217/styles/midcentury-toon/STYLE.md)
（Git blob `22ca95355affd767f0e9c49b0dae5aa0110136c7`），并读取本地独立制作的
参考分析、绘画代码与修订记录。核对日期：2026-10-23。

套色、纸面、有限动画、圆形细节窗口、步骤徽章和冷爵士语言依据上游风格
说明重述；保留 [上游 MIT 许可](UPSTREAM-LICENSE.txt)。不分发其影片、角色、
音乐、字体或动画引擎。实际素材的许可必须随新项目登记，字体仅列建议名称。

本包的绘画工具重新实现为无依赖 Canvas 2D 函数，只接受调用者提供的几何
和帧号；不读取旧片角色或场景。确定性寻帧、帧区间合同、源文/WAV 绑定、
检查证据分层和章节缓存规则来自独立制作经验。共享逐帧工具来自 Codex Film
Studio。原创代码与说明采用仓库 [MIT 许可](../../LICENSE)。

上游的短操作指南与这里允许的长解释片有叙事差异。配音服务也可不同。
不得将这种适配说成上游流程、原声或逐像素复制。旧片记录只用于提炼方法，
不构成新片的视觉、听觉或用户验收；这里没有继承任何旧片的通过结论。

## 独立风格页

`showcase/index.html` 的台灯动作与套色实验是独立绘制的通用风格示意，
不复用参考片人物。网页自托管 Alfa Slab One、Oleo Script 与 Jost 字体，
使用本地制作项目取得的 OFL 字体副本；许可保留在 `showcase/fonts/`。
已发布影片、字幕和历史对照素材继续由校验固定的 Release 资源包提供。
