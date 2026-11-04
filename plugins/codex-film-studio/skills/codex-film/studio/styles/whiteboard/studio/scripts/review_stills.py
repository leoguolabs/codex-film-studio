#!/usr/bin/env python3
"""Extract original-resolution review stills from the encoded delivery itself."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from production import add_edition_argument, production

parser = argparse.ArgumentParser()
add_edition_argument(parser)
project = production(parser.parse_args().edition)
ROOT = project.root
timeline = json.loads((ROOT/"media/timeline.json").read_text())
video = project.video
folder = ROOT/"review/final-stills"
folder.mkdir(exist_ok=True)
frames = sorted(set([round((row["end"]-.2)*24) for row in timeline["lines"]]
                    + [timeline["duration_frames"]-1]))
selection = "+".join(f"eq(n,{frame})" for frame in frames)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(video),
                "-vf", f"select='{selection}'", "-fps_mode", "vfr",
                str(folder/"still-%03d.png")], check=True)
records = []
for i, frame in enumerate(frames, 1):
    path = folder/f"still-{i:03}.png"
    records.append({"file": path.name, "frame": frame, "seconds": frame/24,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
(folder/"index.json").write_text(json.dumps({
    "video_sha256": hashlib.sha256(video.read_bytes()).hexdigest(),
    "purpose": "Original-resolution spot inspection, separate from complete atlas coverage.",
    "stills": records}, indent=2)+"\n")
print(f"Extracted {len(records)} original-resolution delivery frames.")
