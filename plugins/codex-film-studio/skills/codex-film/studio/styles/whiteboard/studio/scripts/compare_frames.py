#!/usr/bin/env python3
"""Pair EVERY candidate frame with an explicitly mapped reference frame.

The mapping compares visual functions in different stories. These measurements
are diagnostics, not a percentage of perceptual equivalence.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 320, 180
PER_SHEET, COLUMNS = 32, 8


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(path):
    proc = subprocess.Popen([
        "ffmpeg", "-v", "error", "-i", str(path), "-map", "0:v:0",
        "-vf", f"scale={WIDTH}:{HEIGHT}:flags=area", "-fps_mode", "passthrough",
        "-pix_fmt", "rgb24", "-f", "rawvideo", "-"
    ], stdout=subprocess.PIPE)
    try:
        while True:
            raw = proc.stdout.read(WIDTH * HEIGHT * 3)
            if not raw:
                break
            if len(raw) != WIDTH * HEIGHT * 3:
                raise ValueError("Truncated frame.")
            yield Image.frombytes("RGB", (WIDTH, HEIGHT), raw)
    finally:
        proc.stdout.close()
        if proc.wait():
            raise RuntimeError(f"Decode failed: {path}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("candidate", type=Path)
    p.add_argument("--reference", type=Path, default=ROOT/"reference/whiteboard.mp4")
    p.add_argument("--timeline", type=Path, default=ROOT/"media/timeline.json")
    p.add_argument("--definitions", type=Path, default=ROOT/"content/comparison.json")
    p.add_argument("--candidate-analysis", type=Path, required=True)
    p.add_argument("--reference-analysis", type=Path, default=ROOT/"review/reference")
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    sheets = args.out/"contact-sheets"
    sheets.mkdir(exist_ok=True)
    timeline = json.loads(args.timeline.read_text())
    definitions = json.loads(args.definitions.read_text())
    beats = []
    for identifier, label, rs, re, note in definitions:
        rows = [r for r in timeline["lines"] if r["region"] == identifier]
        start = (timeline["lines"][-1]["end"]+1 if identifier == "wide"
                 else rows[0]["start"] if rows else 0)
        beats.append(dict(id=identifier, label=label, rs=rs, re=re,
                          start=0 if identifier == "hook" else start))
    beats.sort(key=lambda b: b["start"])
    for i, beat in enumerate(beats):
        beat["end"] = beats[i+1]["start"] if i+1 < len(beats) else timeline["duration"]
    analyses = [json.loads((d/"analysis.json").read_text())
                for d in [args.reference_analysis, args.candidate_analysis]]
    for analysis, video in zip(analyses, [args.reference, args.candidate]):
        if analysis["sha256"] != digest(video):
            raise ValueError("Analysis belongs to a different video.")
        if analysis["fps"] != 24:
            raise ValueError("This production's comparison contract requires 24 fps.")
    metrics = [list(csv.DictReader((d/"frames.csv").open()))
               for d in [args.reference_analysis, args.candidate_analysis]]
    # JPEG cache keeps the reference bounded at tens of MB, not decoded GB.
    references = []
    for image in decode(args.reference):
        buf = io.BytesIO()
        image.save(buf, format="JPEG", quality=94)
        references.append(buf.getvalue())
    if len(references) != analyses[0]["decoded_frames"]:
        raise ValueError("Reference frame count changed.")
    font_path = Path("/System/Library/Fonts/Menlo.ttc")
    font = ImageFont.truetype(str(font_path), 13) if font_path.exists() else ImageFont.load_default()
    cell_h = HEIGHT*2+46
    rows_per_sheet = PER_SHEET//COLUMNS
    fields = ["candidate_frame", "candidate_seconds", "reference_frame", "reference_seconds",
              "visual_function", "luma_delta", "dark_fraction_delta", "blue_fraction_delta",
              "orange_fraction_delta", "edge_energy_delta", "motion_mae_delta"]
    records, atlases = [], []
    with (args.out/"pairs.csv").open("w") as handle:
        writer = csv.DictWriter(handle, fields)
        writer.writeheader()
        for index, candidate in enumerate(decode(args.candidate)):
            t = index/24
            beat = next((b for b in beats if b["start"] <= t < b["end"]), beats[-1])
            u = np.clip((t-beat["start"])/(beat["end"]-beat["start"]), 0, 1)
            # JS Math.round semantics, also used by the browser's frame lab.
            rf = min(len(references)-1, int(np.floor((beat["rs"]+(beat["re"]-beat["rs"])*u)*24+.5)))
            row = dict(candidate_frame=index, candidate_seconds=t, reference_frame=rf,
                       reference_seconds=rf/24, visual_function=beat["id"])
            for key, field in [("mean_luma", "luma_delta"), ("dark_fraction", "dark_fraction_delta"),
                               ("blue_fraction", "blue_fraction_delta"), ("orange_fraction", "orange_fraction_delta"),
                               ("edge_energy", "edge_energy_delta"), ("motion_mae", "motion_mae_delta")]:
                row[field] = round(float(metrics[1][index][key])-float(metrics[0][rf][key]), 6)
            writer.writerow(row)
            records.append(row)
            offset = index % PER_SHEET
            if offset == 0:
                canvas = Image.new("RGB", (WIDTH*COLUMNS, cell_h*rows_per_sheet), "#242628")
            x, y = offset % COLUMNS*WIDTH, offset//COLUMNS*cell_h
            canvas.paste(Image.open(io.BytesIO(references[rf])), (x, y))
            canvas.paste(candidate, (x, y+HEIGHT+22))
            draw = ImageDraw.Draw(canvas)
            draw.text((x+4, y+HEIGHT+3), f"REF {rf:04}  {rf/24:07.3f}s", font=font, fill="#cbd6ec")
            draw.text((x+4, y+HEIGHT*2+25), f"NEW {index:04}  {t:07.3f}s", font=font, fill="#ebad92")
            if offset == PER_SHEET-1:
                name = f"pair-{index//PER_SHEET:04}.jpg"
                canvas.save(sheets/name, quality=92)
                atlases.append(dict(file=name, first=index-offset, last=index))
        if len(records) % PER_SHEET:
            name = f"pair-{(len(records)-1)//PER_SHEET:04}.jpg"
            canvas.save(sheets/name, quality=92)
            atlases.append(dict(file=name, first=len(records)//PER_SHEET*PER_SHEET, last=len(records)-1))
    if len(records) != analyses[1]["decoded_frames"]:
        raise ValueError("Candidate frame count changed.")
    summary = dict(
        candidate_sha256=digest(args.candidate), reference_sha256=digest(args.reference),
        timeline_sha256=digest(args.timeline), candidate_frames=len(records),
        definitions_sha256=digest(args.definitions),
        reference_frames=len(references), pairs=len(records), fps=24, beats=beats, atlases=atlases,
        tile_dimensions=[WIDTH, HEIGHT], atlas_dimensions=[WIDTH*COLUMNS, cell_h*rows_per_sheet],
        coverage="Every candidate frame paired; no skipped candidate frames.",
        visual_review="Not established by generating atlases; record inspected sheets separately.",
        interpretation="Function-normalized comparisons between different stories. No equivalence percentage.",
        distribution_comparison={key: {"reference": analyses[0]["stats"][key],
                                       "candidate": analyses[1]["stats"][key]}
                                 for key in analyses[0]["stats"]},
    )
    (args.out/"comparison.json").write_text(json.dumps(summary, indent=2)+"\n")
    print(json.dumps({k: summary[k] for k in ["candidate_frames", "reference_frames", "pairs", "coverage"]}))


if __name__ == "__main__":
    main()
