#!/usr/bin/env python3
"""Decode EVERY frame. Metrics + consecutive-frame atlases; never sampling."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video", type=Path)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--atlas-size", type=int, default=48)
    p.add_argument("--thumb-width", type=int, default=320)
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    sheets = args.out / "contact-sheets"
    sheets.mkdir(exist_ok=True)
    meta = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(args.video)]))
    stream = next(s for s in meta["streams"] if s["codec_type"] == "video")
    n, d = map(int, stream["r_frame_rate"].split("/"))
    fps = n / d
    width, height = args.thumb_width, round(args.thumb_width * stream["height"] / stream["width"])
    command = ["ffmpeg", "-v", "error", "-i", str(args.video), "-map", "0:v:0",
               "-vf", f"scale={width}:{height}:flags=area", "-fps_mode", "passthrough",
               "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    proc = subprocess.Popen(command, stdout=subprocess.PIPE)
    columns = 8
    rows = (args.atlas_size + columns - 1) // columns
    cell_h = height + 24
    index = 0
    records, atlas_index, summary_frames = [], [], []
    previous = None
    canvas = None
    font_path = Path("/System/Library/Fonts/Menlo.ttc")
    font = ImageFont.truetype(str(font_path), 13) if font_path.exists() else ImageFont.load_default()
    fields = ["frame", "seconds", "mean_luma", "white_fraction", "dark_fraction",
              "blue_fraction", "orange_fraction", "edge_energy", "motion_mae",
              "centroid_x", "centroid_y", "black_frame", "thumbnail_sha256"]
    with (args.out / "frames.csv").open("w") as handle:
        writer = csv.DictWriter(handle, fields)
        writer.writeheader()
        while True:
            raw = proc.stdout.read(width * height * 3)
            if not raw:
                break
            if len(raw) != width * height * 3:
                raise RuntimeError("Incomplete decoded frame.")
            a = np.frombuffer(raw, np.uint8).reshape(height, width, 3)
            rgb = a[:round(height * .86)].astype(float)
            lum = rgb.mean(2)
            dark = lum < 125
            orange = (rgb[:, :, 0] > rgb[:, :, 1] * 1.2) & (rgb[:, :, 1] > rgb[:, :, 2] * 1.15)
            blue = (rgb[:, :, 2] > rgb[:, :, 0] * 1.18) & (rgb[:, :, 2] > rgb[:, :, 1] * 1.08)
            yy, xx = np.nonzero(dark | orange | blue)
            row = {
                "frame": index, "seconds": round(index / fps, 6),
                "mean_luma": round(float(lum.mean()), 4),
                "white_fraction": round(float((lum > 220).mean()), 6),
                "dark_fraction": round(float(dark.mean()), 6),
                "blue_fraction": round(float(blue.mean()), 6),
                "orange_fraction": round(float(orange.mean()), 6),
                "edge_energy": round(float(np.abs(np.diff(lum, axis=1)).mean()), 4),
                "motion_mae": round(float(np.abs(a.astype(float) - previous).mean()), 4) if previous is not None else 0,
                "centroid_x": round(float(xx.mean() / width), 4) if len(xx) else .5,
                "centroid_y": round(float(yy.mean() / height), 4) if len(yy) else .5,
                "black_frame": int(lum.max() < 16),
                "thumbnail_sha256": hashlib.sha256(raw).hexdigest(),
            }
            writer.writerow(row)
            records.append(row)
            previous = a.astype(float)
            image = Image.fromarray(a)
            if index % args.atlas_size == 0:
                canvas = Image.new("RGB", (width * columns, cell_h * rows), "#242628")
            offset = index % args.atlas_size
            x, y = (offset % columns) * width, (offset // columns) * cell_h
            canvas.paste(image, (x, y))
            ImageDraw.Draw(canvas).text((x + 5, y + height + 3), f"f{index:05}  {index/fps:07.3f}s", font=font, fill="white")
            if index % round(fps * 2) == 0:
                summary_frames.append((index, image.copy()))
            if offset == args.atlas_size - 1:
                name = f"atlas-{index // args.atlas_size:04}.jpg"
                canvas.save(sheets / name, quality=90)
                atlas_index.append({"file": name, "first": index - offset, "last": index})
            index += 1
        if index % args.atlas_size:
            name = f"atlas-{(index-1) // args.atlas_size:04}.jpg"
            canvas.save(sheets / name, quality=90)
            atlas_index.append({"file": name, "first": index - (index % args.atlas_size), "last": index - 1})
    if proc.wait():
        raise RuntimeError("Full decode failed.")
    overview = Image.new("RGB", (width * 7, cell_h * ((len(summary_frames)+6)//7)), "#242628")
    for i, (f, image) in enumerate(summary_frames):
        x, y = (i % 7) * width, (i // 7) * cell_h
        overview.paste(image, (x, y))
        ImageDraw.Draw(overview).text((x+5,y+height+3), f"{f/fps:.1f}s / f{f}", font=font, fill="white")
    overview.save(args.out / "overview.jpg", quality=94)
    stats = {}
    for key in fields[2:-2]:
        a = np.array([r[key] for r in records])
        stats[key] = dict(zip(["min", "p10", "median", "p90", "max"], map(float, np.quantile(a, [0,.1,.5,.9,1]))))
    report = {"video": str(args.video.resolve()),
              "sha256": hashlib.sha256(args.video.read_bytes()).hexdigest(),
              "fps": fps, "decoded_frames": index, "expected_frames": stream.get("nb_frames"),
              "width": stream["width"], "height": stream["height"],
              "duration": index / fps, "stats": stats, "atlases": atlas_index,
              "automated_coverage": "Every decoded frame; no frame skipping.",
              "visual_coverage": "Not established by this script. Record atlas/full-resolution review separately.",
              "all_black_frames": [r["frame"] for r in records if r["black_frame"]],
              "largest_motion_frames": sorted(records,key=lambda r:r["motion_mae"],reverse=True)[:12]}
    (args.out / "analysis.json").write_text(json.dumps(report, indent=2))
    print(json.dumps({"frames": index, "seconds": index/fps, "atlases": len(atlas_index),
                      "black_frames": report["all_black_frames"], "out": str(args.out)}, indent=2))


if __name__ == "__main__":
    main()
