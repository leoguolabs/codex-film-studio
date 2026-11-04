#!/usr/bin/env python3
"""Decode every video frame and prepare evidence; never certify visual quality."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import av

try:
    from .frame_color import COLOR_POLICY, rgb_frame
except ImportError:
    from frame_color import COLOR_POLICY, rgb_frame
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


PALETTE = (
    "black", "paper", "neutral", "red", "orange", "yellow", "green",
    "cyan", "blue", "purple", "magenta",
)
CSV_FIELDS = (
    "frame_index", "pts", "time_base", "timestamp_seconds", "timestamp_source",
    "width", "height", "mean_luma", "edge_density", "edge_strength",
    "rgb_diff", "histogram_diff", "cut_candidate", "cut_score",
) + tuple(f"palette_{name}" for name in PALETTE)


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def palette_ratios(rgb: np.ndarray) -> dict[str, float]:
    """Exclusive heuristic colour buckets, not a learned artistic-style score."""
    red, green, blue = (rgb[..., i] for i in range(3))
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    delta = maximum - minimum
    saturation = np.divide(delta, maximum, out=np.zeros_like(delta), where=maximum > 0)
    hue = np.zeros_like(delta)
    valid = delta > 0
    safe_delta = np.where(valid, delta, 1)
    red_max = valid & (maximum == red)
    green_max = valid & ~red_max & (maximum == green)
    blue_max = valid & ~red_max & ~green_max
    hue[red_max] = ((green - blue) / safe_delta)[red_max] % 6
    hue[green_max] = ((blue - red) / safe_delta + 2)[green_max]
    hue[blue_max] = ((red - green) / safe_delta + 4)[blue_max]
    hue *= 60
    classes = np.full(maximum.shape, 2, dtype=np.uint8)
    chromatic = saturation >= 0.16
    ranges = (
        (3, (hue < 15) | (hue >= 345)),
        (4, (hue >= 15) & (hue < 45)),
        (5, (hue >= 45) & (hue < 75)),
        (6, (hue >= 75) & (hue < 165)),
        (7, (hue >= 165) & (hue < 195)),
        (8, (hue >= 195) & (hue < 255)),
        (9, (hue >= 255) & (hue < 285)),
        (10, (hue >= 285) & (hue < 345)),
    )
    for category, condition in ranges:
        classes[chromatic & condition] = category
    paper = (minimum > 0.55) & (saturation < 0.38) & (red - blue > 0.015)
    classes[paper] = 1
    classes[maximum < 0.16] = 0
    counts = np.bincount(classes.ravel(), minlength=len(PALETTE)) / classes.size
    return {name: round(float(count), 7) for name, count in zip(PALETTE, counts)}


def histogram(rgb: np.ndarray) -> np.ndarray:
    quantized = np.minimum((rgb * 16).astype(np.uint8), 15)
    return np.concatenate([
        np.bincount(quantized[..., channel].ravel(), minlength=16)
        / quantized[..., channel].size
        for channel in range(3)
    ])


def timestamp(frame: av.VideoFrame, frame_index: int, fps: float) -> tuple[float, str]:
    if frame.pts is not None and frame.time_base is not None:
        return float(frame.pts * frame.time_base), "pts"
    return frame_index / fps, "frame_index_fallback"


def choose_cuts(candidates: list[dict], min_seconds: float) -> list[dict]:
    """Nonmaximum suppression only; candidates still require a reviewer."""
    selected: list[dict] = []
    for candidate in sorted(candidates, key=lambda item: (-item["score"], item["frame_index"])):
        if all(abs(candidate["timestamp_seconds"] - item["timestamp_seconds"]) >= min_seconds
               for item in selected):
            selected.append(candidate)
    return sorted(selected, key=lambda item: item["frame_index"])


def audit(args: argparse.Namespace) -> dict:
    source = args.input.resolve(strict=True)
    output = args.output.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError(f"Output directory must be empty: {output}")
    output.mkdir(parents=True, exist_ok=True)
    for directory in ("contact-sheets", "shots", "cuts"):
        (output / directory).mkdir()
    write_json(output / "status.json", {"state": "running", "input": str(source)})
    started = time.monotonic()
    source_stat = source.stat()
    source_hash = sha256(source)
    records: list[dict] = []
    candidates: list[dict] = []
    sheets: list[dict] = []
    previous_rgb = previous_histogram = None
    previous_time = None
    nonmonotonic_timestamps: list[int] = []
    repeated_frames = 0
    missing_pts = 0
    cells_per_sheet = args.sheet_columns * args.sheet_rows
    cell_width, cell_height = args.thumb_width, args.thumb_height + 18
    sheet_size = (cell_width * args.sheet_columns, cell_height * args.sheet_rows)
    sheet = Image.new("RGB", sheet_size, "#1b1b1b")
    sheet_draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    dimensions: set[tuple[int, int]] = set()

    def save_sheet(last_frame: int) -> None:
        first_frame = (last_frame // cells_per_sheet) * cells_per_sheet
        relative = f"contact-sheets/frames-{first_frame:07d}-{last_frame:07d}.jpg"
        sheet.save(output / relative, quality=92, subsampling=0)
        sheets.append({
            "path": relative, "first_frame": first_frame, "last_frame": last_frame,
            "frame_count": last_frame - first_frame + 1,
            "columns": args.sheet_columns, "rows": args.sheet_rows,
            "cell_width": cell_width, "cell_height": cell_height,
            "image_width": args.thumb_width, "image_height": args.thumb_height,
            "label_height": 18,
            "image_obscured_by_label": False,
            "order": "left-to-right, then top-to-bottom",
        })

    with av.open(str(source)) as container, \
            (output / "frames.csv").open("w", newline="") as csv_file, \
            (output / "frames.jsonl").open("w") as jsonl_file:
        if len(container.streams.video) <= args.video_stream:
            raise ValueError(f"Video stream {args.video_stream} does not exist")
        stream = container.streams.video[args.video_stream]
        stream.thread_type = "AUTO"
        rate = stream.average_rate or stream.guessed_rate or stream.base_rate
        fps = float(rate) if rate else args.fallback_fps
        metadata = {
            "codec": stream.codec_context.name,
            "reported_rate": str(rate) if rate else None,
            "rate_for_missing_pts": fps,
            "reported_frames": stream.frames,
            "stream_time_base": str(stream.time_base),
            "stream_duration_seconds": float(stream.duration * stream.time_base)
            if stream.duration is not None else None,
        }
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for index, frame in enumerate(container.decode(stream)):
            image = rgb_frame(frame).to_image().convert("RGB")
            dimensions.add(image.size)
            metric_height = max(2, round(image.height * args.metric_width / image.width))
            small = image.resize((args.metric_width, metric_height), Image.Resampling.BILINEAR)
            rgb = np.asarray(small, dtype=np.float32) / 255.0
            luma = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
            gradient_x = np.abs(np.diff(luma, axis=1, append=luma[:, -1:]))
            gradient_y = np.abs(np.diff(luma, axis=0, append=luma[-1:, :]))
            gradient = np.hypot(gradient_x, gradient_y)
            current_histogram = histogram(rgb)
            same_size = previous_rgb is not None and previous_rgb.shape == rgb.shape
            rgb_diff = float(np.abs(rgb - previous_rgb).mean()) if same_size else 0.0
            hist_diff = float(np.abs(current_histogram - previous_histogram).sum() / 6) \
                if previous_histogram is not None else 0.0
            is_candidate = bool(index and (
                (rgb_diff >= args.cut_diff and hist_diff >= args.cut_hist)
                or rgb_diff >= args.cut_diff_strong
            ))
            score = (rgb_diff + hist_diff) / 2
            seconds, time_source = timestamp(frame, index, fps)
            if time_source != "pts":
                missing_pts += 1
            if previous_time is not None and seconds < previous_time:
                nonmonotonic_timestamps.append(index)
            if same_size and rgb_diff < 1 / 255:
                repeated_frames += 1
            palette = palette_ratios(rgb)
            row = {
                "frame_index": index, "pts": frame.pts,
                "time_base": str(frame.time_base) if frame.time_base is not None else None,
                "timestamp_seconds": round(seconds, 9), "timestamp_source": time_source,
                "width": image.width, "height": image.height,
                "mean_luma": round(float(luma.mean()), 7),
                "edge_density": round(float((gradient >= args.edge_threshold).mean()), 7),
                "edge_strength": round(float(gradient.mean()), 7),
                "rgb_diff": round(rgb_diff, 7), "histogram_diff": round(hist_diff, 7),
                "cut_candidate": is_candidate, "cut_score": round(score, 7),
                **{f"palette_{name}": value for name, value in palette.items()},
            }
            writer.writerow(row)
            jsonl_file.write(json.dumps(row, ensure_ascii=False) + "\n")
            records.append({"frame_index": index, "timestamp_seconds": seconds})
            if is_candidate:
                candidates.append({
                    "frame_index": index, "timestamp_seconds": seconds,
                    "score": score, "rgb_diff": rgb_diff, "histogram_diff": hist_diff,
                })
            if args.save_frames:
                frame_dir = output / "all-frames"
                frame_dir.mkdir(exist_ok=True)
                retained = image
                if args.frame_width and image.width > args.frame_width:
                    retained = image.resize((args.frame_width, round(image.height * args.frame_width / image.width)), Image.Resampling.LANCZOS)
                retained.save(frame_dir / f"frame-{index:07d}.jpg", quality=94, subsampling=0)
            cell = index % cells_per_sheet
            x, y = (cell % args.sheet_columns) * cell_width, (cell // args.sheet_columns) * cell_height
            thumb = ImageOps.contain(image, (args.thumb_width, args.thumb_height), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x + (cell_width - thumb.width) // 2, y + 18 + (args.thumb_height - thumb.height) // 2))
            sheet_draw.rectangle((x, y, x + cell_width - 1, y + 16), fill="#111111")
            sheet_draw.text((x + 3, y + 1), f"F{index:07d}  {seconds:.3f}s", font=font, fill="white")
            if cell == cells_per_sheet - 1:
                save_sheet(index)
                sheet = Image.new("RGB", sheet_size, "#1b1b1b")
                sheet_draw = ImageDraw.Draw(sheet)
            previous_rgb, previous_histogram, previous_time = rgb, current_histogram, seconds
            if (index + 1) % 1000 == 0:
                print(f"Decoded {index + 1} frames", flush=True)

    count = len(records)
    if not count:
        raise ValueError("No video frames decoded")
    if count % cells_per_sheet:
        save_sheet(count - 1)
    if nonmonotonic_timestamps:
        raise ValueError(f"Nonmonotonic decoded timestamps at frames {nonmonotonic_timestamps[:10]}")
    cuts = choose_cuts(candidates, args.min_shot_seconds)
    boundaries = [0] + [cut["frame_index"] for cut in cuts] + [count]
    shots = []
    targets: dict[int, list[str]] = {}
    for shot_index, (start, end) in enumerate(zip(boundaries, boundaries[1:])):
        representative = (start + end - 1) // 2
        relative = f"shots/shot-{shot_index:04d}-frame-{representative:07d}.png"
        targets.setdefault(representative, []).append(relative)
        shots.append({
            "shot_index": shot_index, "start_frame": start, "end_frame_exclusive": end,
            "start_seconds": records[start]["timestamp_seconds"],
            "last_frame_seconds": records[end - 1]["timestamp_seconds"],
            "representative_frame": representative, "representative_path": relative,
            "status": "algorithmic_candidate_requires_visual_review",
        })
    for cut_index, cut in enumerate(cuts):
        cut["review_frames"] = []
        for index in range(max(0, cut["frame_index"] - args.cut_context),
                           min(count, cut["frame_index"] + args.cut_context + 1)):
            relative = f"cuts/cut-{cut_index:04d}-frame-{index:07d}.png"
            targets.setdefault(index, []).append(relative)
            cut["review_frames"].append({"frame_index": index, "path": relative})
    saved: set[int] = set()
    with av.open(str(source)) as container:
        stream = container.streams.video[args.video_stream]
        stream.thread_type = "AUTO"
        for index, frame in enumerate(container.decode(stream)):
            if index in targets:
                image = rgb_frame(frame).to_image().convert("RGB")
                for relative in targets[index]:
                    image.save(output / relative)
                saved.add(index)
    if saved != set(targets):
        raise ValueError(f"Second decode missing selected frames: {sorted(set(targets) - saved)}")
    final_stat = source.stat()
    if (source_stat.st_size, source_stat.st_mtime_ns) != (final_stat.st_size, final_stat.st_mtime_ns):
        raise ValueError("Input changed during analysis; use a completed export and a fresh output directory")
    if sum(item["frame_count"] for item in sheets) != count:
        raise AssertionError("Contact-sheet coverage does not match decoded count")
    write_json(output / "visual-review-template.json", {
        "status": "not_reviewed", "reviewer": None,
        "input_sha256": source_hash,
        "instructions": "Fill only after actually inspecting the specified images or playback.",
        "entries": [],
        "entry_schema": {
            "frame_start": 0, "frame_end_inclusive": 99,
            "method": "contact_sheet | individual_frames | motion_playback | audio_listening",
            "reference_mapping": None, "observation": "", "defects": [],
            "decision": "pending | revise | accepted", "reviewer": "", "reviewed_at": "",
        },
    })
    summary = {
        "schema_version": 1,
        "input": str(source), "input_sha256": source_hash, "output": str(output),
        "color_conversion": COLOR_POLICY,
        "decoder": {"tool": "PyAV", "version": av.__version__, "ffmpeg_subprocesses": 0},
        "stream": metadata, "decoded_frame_count": count,
        "first_timestamp_seconds": records[0]["timestamp_seconds"],
        "last_timestamp_seconds": records[-1]["timestamp_seconds"],
        "dimensions": [list(size) for size in sorted(dimensions)],
        "missing_pts_frames": missing_pts, "nonmonotonic_timestamp_frames": [],
        "nearly_identical_adjacent_frames": repeated_frames,
        "metrics": {"csv": "frames.csv", "jsonl": "frames.jsonl"},
        "parameters": {key: value for key, value in vars(args).items()
                       if key not in ("input", "output")},
        "cut_candidates_raw": candidates, "cut_candidates_selected": cuts,
        "shots": shots, "contact_sheets": sheets,
        "coverage": {
            "automated_decode": {"frames": count, "first": 0, "last": count - 1},
            "contact_sheet_generation": {"frames": count, "gaps": [], "duplicates": []},
            "native_resolution_selected_frames": sorted(saved),
            "retained_all_frames": {"count": count if args.save_frames else 0,
                                    "directory": "all-frames" if args.save_frames else None,
                                    "maximum_width": args.frame_width or None,
                                    "format": "JPEG quality 94; not lossless source pixels"},
            "actual_visual_review": "not_recorded",
            "actual_audio_listening": "not_recorded",
            "style_equivalence": "not_assessed_by_this_script",
        },
        "notes": [
            "Decoded frames and generated sheets are evidence, not a completed visual review.",
            "Hard-cut candidates may include flashes or fast motion and may miss subtle cuts or dissolves.",
            "Palette and edge metrics are heuristic descriptors, not perceptual style-similarity scores.",
            "Every decoded frame appears once in sheets; small thumbnails cannot establish fine-detail quality.",
            "Frame indices are zero-based; shot intervals are half-open [start, end).",
        ],
        "elapsed_seconds": round(time.monotonic() - started, 3),
    }
    write_json(output / "audit.json", summary)
    write_json(output / "status.json", {
        "state": "automated_analysis_complete", "decoded_frames": count,
        "visual_review": "not_recorded", "style_equivalence": "not_assessed",
    })
    return summary


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("input", type=Path, help="Reference or rendered video")
    result.add_argument("output", type=Path, help="New or empty evidence directory")
    result.add_argument("--video-stream", type=int, default=0)
    result.add_argument("--metric-width", type=int, default=320)
    result.add_argument("--edge-threshold", type=float, default=0.12)
    result.add_argument("--cut-diff", type=float, default=0.16)
    result.add_argument("--cut-hist", type=float, default=0.08)
    result.add_argument("--cut-diff-strong", type=float, default=0.32)
    result.add_argument("--min-shot-seconds", type=float, default=0.35)
    result.add_argument("--cut-context", type=int, default=2)
    result.add_argument("--fallback-fps", type=float, default=24.0)
    result.add_argument("--sheet-columns", type=int, default=10)
    result.add_argument("--sheet-rows", type=int, default=10)
    result.add_argument("--thumb-width", type=int, default=160)
    result.add_argument("--thumb-height", type=int, default=90)
    result.add_argument("--save-frames", action="store_true", help="Retain every decoded frame as indexed JPEG")
    result.add_argument("--frame-width", type=int, default=0, help="Optional maximum retained-frame width; 0 preserves dimensions")
    return result


def main() -> int:
    cli = parser()
    args = cli.parse_args()
    if args.video_stream < 0 or args.metric_width < 2 or args.cut_context < 1:
        cli.error("stream must be nonnegative, metric-width >= 2, cut-context >= 1")
    if min(args.sheet_columns, args.sheet_rows, args.thumb_width, args.thumb_height) < 1 or args.frame_width < 0:
        cli.error("sheet dimensions must be positive and frame-width nonnegative")
    numeric = (args.edge_threshold, args.cut_diff, args.cut_hist, args.cut_diff_strong)
    if any(not math.isfinite(value) or not 0 <= value <= 1 for value in numeric):
        cli.error("metric thresholds must be finite values between 0 and 1")
    if not math.isfinite(args.min_shot_seconds) or args.min_shot_seconds < 0:
        cli.error("min-shot-seconds must be finite and nonnegative")
    if not math.isfinite(args.fallback_fps) or args.fallback_fps <= 0:
        cli.error("fallback-fps must be positive and finite")
    fresh_output = not args.output.exists() or (
        args.output.is_dir() and not any(args.output.iterdir())
    )
    try:
        result = audit(args)
    except Exception as error:
        if fresh_output and (args.output / "status.json").is_file():
            write_json(args.output / "status.json", {
                "state": "failed", "error": str(error), "visual_review": "not_recorded",
                "note": "Partial evidence is not a completed audit; rerun in a fresh directory.",
            })
        print(f"Audit failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps({
        "audit": str(args.output.resolve() / "audit.json"),
        "decoded_frames": result["decoded_frame_count"],
        "contact_sheets": len(result["contact_sheets"]),
        "candidate_shots": len(result["shots"]),
        "visual_review": "not_recorded",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
