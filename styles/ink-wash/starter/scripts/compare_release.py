"""Compare contact-aligned strips from decoded 24 fps frame audits."""
import argparse
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def load_frame(folder, index):
    with Image.open(folder / "frames" / f"{index:05d}.jpg") as picture:
        return np.asarray(picture.convert("L").resize((480, 270)), dtype=float)


def span(coords, dimension):
    if not len(coords):
        return 0.0
    low, high = np.quantile(coords, [0.01, 0.99])
    return float((high - low) / dimension)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path)
parser.add_argument("--track", nargs=3, action="append", required=True, metavar=("LABEL", "AUDIT", "RELEASE_FRAME"))
parser.add_argument("--before", type=int, default=16)
parser.add_argument("--after", type=int, default=48)
args = parser.parse_args()
if args.before < 6 or args.after < 6:
    parser.error("Allow at least six frames on each side of the release.")
tracks = [(label, Path(folder), int(index)) for label, folder, index in args.track]
for label, folder, index in tracks:
    report = json.loads((folder / "report.json").read_text())
    if report["fps"] != 24 or index - args.before < 1 or index + args.after >= report["decoded_frames"]:
        parser.error(f"{label} requires a complete interval at 24 fps.")
args.output.mkdir(parents=True, exist_ok=True)
rows = []
summary = {}
offsets = list(range(-args.before, args.after + 1))
for label, folder, anchor in tracks:
    baseline = np.median([load_frame(folder, anchor + offset) for offset in range(-6, -2)], axis=0)
    prior = load_frame(folder, anchor + offsets[0] - 1)
    events = []
    for offset in offsets:
        frame = load_frame(folder, anchor + offset)
        darkened = (baseline - frame > 35) & (frame < 172)
        ys, xs = np.where(darkened)
        event = dict(track=label, frame=anchor + offset, offset=offset,
                     changed_ink_area=float(darkened.mean()), width=span(xs, 480),
                     height=span(ys, 270), mean_frame_delta=float(np.abs(frame - prior).mean() / 255))
        rows.append(event)
        if 0 <= offset <= 6:
            events.append(event)
        prior = frame
    summary[label] = {key: max(event[key] for event in events) for key in
                      ("changed_ink_area", "width", "height", "mean_frame_delta")}
with (args.output / "frames.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=rows[0])
    writer.writeheader()
    writer.writerows(rows)
(args.output / "first-seven-frames.json").write_text(json.dumps(summary, indent=2))
for start in range(0, len(offsets), 8):
    current = offsets[start:start + 8]
    sheet = Image.new("RGB", (240 * len(current), 154 * len(tracks)), "#36332f")
    captions = ImageDraw.Draw(sheet)
    for row, (label, folder, anchor) in enumerate(tracks):
        for column, offset in enumerate(current):
            index = anchor + offset
            x, y = column * 240, row * 154
            with Image.open(folder / "frames" / f"{index:05d}.jpg") as picture:
                sheet.paste(picture.resize((240, 135), Image.Resampling.LANCZOS), (x, y))
            captions.text((x + 3, y + 136), f"{label}  {index}  ({offset:+d})", fill="white")
    sheet.save(args.output / f"strip-{start:04d}.jpg", quality=92)
