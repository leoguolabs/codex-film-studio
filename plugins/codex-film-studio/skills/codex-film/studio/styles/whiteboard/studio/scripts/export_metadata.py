#!/usr/bin/env python3
"""Export captions, chapter timing, poster and a frame-based delivery timeline."""
import argparse
import json
from pathlib import Path
import subprocess
from production import add_edition_argument, production

ROOT = Path(__file__).resolve().parents[1]


def stamp(t, separator="."):
    ms = round(t*1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{separator}{ms%1000:03}"


def main():
    global ROOT
    parser = argparse.ArgumentParser()
    add_edition_argument(parser)
    project = production(parser.parse_args().edition)
    ROOT = project.root
    timeline = json.loads((ROOT/"media/timeline.json").read_text())
    cues = timeline["captions"]
    for extension, separator, header in [("vtt", ".", "WEBVTT\n\n"), ("srt", ",", "")]:
        content = header
        for i, cue in enumerate(cues, 1):
            content += (f"{i}\n{stamp(cue['start'], separator)} --> {stamp(cue['end'], separator)}\n"
                        + "\n".join(cue["lines"]) + "\n\n")
        (ROOT/f"media/captions.{extension}").write_text(content)
    rows = timeline["lines"]
    shots = [{"id": row["id"], "region": row["region"],
              "start": 0 if i == 0 else round(row["start"]*24),
              "end": round(rows[i+1]["start"]*24) if i+1 < len(rows) else timeline["duration_frames"]}
             for i, row in enumerate(rows)]
    events = json.loads((ROOT/"media/events.json").read_text())
    delivery = {"fps": 24, "duration_frames": timeline["duration_frames"],
                "shots": shots, "events": [
                    {"id": e["id"], "frame": round(e["time"]*24)} for e in events["cues"]],
                "note": "Contiguous editorial beats on one continuous board; not hard cuts."}
    (ROOT/"media/delivery-timeline.json").write_text(json.dumps(delivery, indent=2)+"\n")
    title_time = rows[1]["end"]-.25
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(title_time),
                    "-i", str(project.video),
                    "-frames:v", "1", "-q:v", "2", str(ROOT/"media/poster.jpg")], check=True)
    print(f"Exported {len(cues)} caption cues and {len(shots)} editorial beats.")


if __name__ == "__main__":
    main()
