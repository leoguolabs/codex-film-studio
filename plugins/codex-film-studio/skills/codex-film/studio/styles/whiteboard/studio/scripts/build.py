#!/usr/bin/env python3
"""Build from reviewed local inputs. Network speech generation is explicit."""
import argparse
from pathlib import Path
import subprocess
import sys
from production import add_edition_argument, production

ROOT = Path(__file__).resolve().parents[1]


def run(*args):
    print("\n"+ " ".join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=ROOT, check=True)


def main():
    p = argparse.ArgumentParser()
    add_edition_argument(p)
    p.add_argument("--speech", action="store_true", help="Generate or resume provider audio before building.")
    p.add_argument("--skip-atlases", action="store_true", help="Skip evidence generation, never mark visual review complete.")
    args = p.parse_args()
    project = production(args.edition)
    edition = ["--edition", args.edition]
    python = sys.executable
    if args.speech:
        run(python, "scripts/speech.py", *edition)
        run(python, "scripts/transcribe.py", *edition)
    run("node", "scripts/validate.mjs", *edition)
    run("node", "scripts/render.mjs", *edition)
    run(python, "scripts/mix_audio.py", *edition)
    run(python, "scripts/export_metadata.py", *edition)
    run(python, "scripts/verify_delivery.py", *edition)
    run(python, "scripts/review_stills.py", *edition)
    if not args.skip_atlases:
        run(python, "scripts/analyze_frames.py", project.video,
            "--out", project.root/"review/candidate")
        if (ROOT / "reference/whiteboard.mp4").is_file():
            run(python, "scripts/compare_frames.py", project.video,
                "--timeline", project.root/"media/timeline.json",
                "--definitions", project.root/"content/comparison.json",
                "--candidate-analysis", project.root/"review/candidate",
                "--out", project.root/"review/comparison")
        else:
            print("Reference not present; candidate atlases generated without paired comparison.")
    print("\nBuild complete. Visual inspection and playback review remain separate human/agent review steps.")


if __name__ == "__main__":
    main()
