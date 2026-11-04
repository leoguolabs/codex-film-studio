# 输入合同

所有 JSON 都从空内容开始。`null` 表示尚未提供，不能作为通过或零值。
填写后由新项目验证；本包的 `createTimeline` 只验证画面时间区间，不替代
全套事实、音频和资产校验。

| 文件 | 填写内容 |
| --- | --- |
| `brief.json` | 新主题、目标观众、核心问题、语言、时长和输出设置 |
| `sources.json` | claims: id/text/source_url/location/limitations；assets: id/path/sha256/source_url/license/identity_constraints |
| `shot-plan.json` | shots: id/scene_type/purpose/action/contact/result/camera/transition/reading_hold；chapters: id/shot_ids/question/payoff |
| `narration.json` | lines: id/shot_id/text/claim_ids；每行源文固定，修订保留版本 |
| `voice-inputs.json` | recordings: line_id/path/source_sha256/request_sha256/wav_sha256/sample_rate/samples/voice_fingerprint/alignment_path；服务信息由环境提供 |
| `timeline.json` | draft/fps/duration_frames；shots: id/scene_type/headline/start/end/cues/line_ids；cues 为命名的绝对帧号 |
| `reference-map.json` | shots: shot_id/scene_type/visual_function/reference_start_seconds/reference_end_seconds_exclusive |
| `review-record.json` | 具体检查、观察、缺陷、版本继承与未完成事项，不能仅写布尔值 |

JSON 中的路径相对本项目根，参考秒数只用于参考文件定位。最终时间轴统一
整数帧，镜头从 0 连续覆盖到 duration_frames，区间 `[start, end)` 不重叠。
`scene_type` 是视觉功能，如 action、detail、comparison、summary，可按主题
自定；参考 map 必须与每个 shot ID 对应。`headline` 可以是空字符串。

默认 24 fps、两帧一姿态，符合此参考的运动语法。创建器不会把空白 draft
当成可渲染成片。每次改写源文都重新校验音频、时长与所有下游 cue。

观察条目建议结构：`observer`, `film_sha256`, `evidence_sha256`,
`start_frame`, `end_frame_exclusive`, `source_pixels`, `display_pixels`,
`finding`, `defect_ids`。播放/听审使用明确秒区间，记录是否连续完整。
图集、原尺寸、播放、听审保持独立数组；只记录实际执行的操作。

## 工具接口

```js
import {drawCel, drawPaper, PALETTE} from './lib/print.mjs';
import {createTimeline, frameClock, readingHoldSeconds} from './lib/timeline.mjs';
// edit 来自已完成的 content/timeline.json；c 是自己的 Canvas 2D context。
const edit = createTimeline(input);
const shot = edit.shotAt(frame);
const {time, poseFrame, poseTime} = frameClock(frame, edit.fps);
// 用 time 编排镜头，以 poseFrame/poseTime 选择角色姿态。
drawCel(c, myOutline, PALETTE.teal, frame, {seed: 17});
// 在主体绘制后叠加固定纸面；逻辑坐标以 1920×1080 为默认基准。
drawPaper(c, 1920, 1080, {seed: 31});
```

`drawCel` 输入闭合折线的点数组，曲线需由调用者先采样；它不生成角色。
对场景做缩放后要调整线宽/套色或重绘细节；Canvas transform 会同时缩放它们。
不同输出帧率需同时调整 `frameClock` 和 `drawCel` 的 fps/drawingsPerSecond。
绘画工具只演示材质机制，字体注册、人物绑定、图形状态、相机、音轨和编码
由新制作实现。`readingHoldSeconds` 的字符速率按语言/内容可调整。
