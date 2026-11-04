# 创作自己的 Mid-century Cartoon

## Executable production tools

After project creation, read `PRODUCTION.md`. Run `npm ci`, then
`npm run proof` for a labelled material diagnostic. Fill the empty
`content/production.json`, author drawings in `src/scene.mjs`, and run
`npm run build`. The original style helpers remain in `lib/`. Fonts and
license notices are included in `fonts/`; no source checkout is required.
For original-sample replay, see `methods/reproduction.md`. A material proof
is not an accepted film or a claim of reference equivalence.


本目录从空白输入开始；还没有影片、配音或验收结论。

1. 填写 `content/brief.json`，阅读 STYLE、WORKFLOW、AUDIO 和 REVIEW。
2. 用 `content/sources.json` 记录事实和资产来源，写自己的叙事与镜头。
3. 生成或导入配音，测量原始 WAV 后编排 `content/timeline.json`。
4. 基于 `lib/print.mjs`、`lib/timeline.mjs` 在现有渲染入口中编写新场景。
5. 使用 `tools/frame_review/` 检查最终输出，填写本片的审查记录。

绘画工具接受标准 Canvas 2D context，可在浏览器或兼容的 Node Canvas
实现中使用；本包已锁定 Canvas 渲染依赖并附带许可字体。转写模型与 TTS 服务按项目需要配置。
`node --test tests/*.test.mjs` 使用 Node.js 20+ 自带测试器，无须 npm 安装。
已附带锁定依赖的渲染、音频混合与字幕工具；完整视频仍需本次场景、音频和 FFmpeg。

项目创建器附带 METHOD、PROVENANCE、两份许可和 prompt。只阅读上层
DIRECTOR/TECHNIQUE 的通用导演和音频约定；其中白板演示专用的文件路径与
构建命令不适用于本包。使用已有入口编写本片场景和动作，并提供音频与素材。

凭据只放环境变量或私有配置。提供者响应、参考片、图集、WAV 和影片保留
在本外部生产目录；向方法库回馈时只提交通用改进。
