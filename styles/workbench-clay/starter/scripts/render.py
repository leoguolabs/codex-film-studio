"""Expose the miniature on ones or twos for a 25 fps film."""

import argparse
import math
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine.clay import Stage
import film


def material_proof(stage, seconds):
    stage.camera((0.38, 0.76, 2.62), (0, 0.35, 0), 28)
    for x, color, tip in [
        (-0.54, "#b65f47", 0.18),
        (0, "#dcbd92", 0.16),
        (0.54, "#4e8b83", 0.20),
    ]:
        with stage.lump():
            stage.egg((x, 0.228, 0), (0.225, 0.229, 0.20), color)
            stage.rod(
                (x - 0.059, 0.33, 0),
                (x + 0.075, 0.48, 0.042),
                tip,
                color,
                end=0.106,
                blend=0.073,
            )
            stage.egg((x + 0.02, 0.30, 0.198), (0.086, 0.057, 0.064), color, cut=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--poses", type=int, nargs="+")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int)
    parser.add_argument("--pose-step", type=int, choices=(1, 2), default=2,
                        help="Output frames per pose. Use 1 for fast action or mixed holds.")
    parser.add_argument(
        "--proof", action="store_true", help="Expose a neutral material study"
    )
    parser.add_argument("--samples-per-axis", type=int, choices=(1, 2), default=1,
                        help="Trace one or four samples before developing lens blur and grain.")
    args = parser.parse_args()
    if args.width <= 0:
        parser.error("Set a positive width.")
    if args.proof:
        ids = [0]
        draw = material_proof
        output = args.output or ROOT / "proof"
    else:
        if film.DURATION <= 0:
            parser.error("Set DURATION and author frame() in film.py, or use --proof.")
        count = math.ceil(film.DURATION * 25 / args.pose_step)
        ids = (
            args.poses
            if args.poses is not None
            else range(args.start, args.end if args.end is not None else count)
        )
        if not ids or min(ids) < 0 or max(ids) >= count:
            parser.error("Pose indices must be inside the authored timeline.")
        draw = film.frame
        output = args.output or ROOT / ("frames" if args.pose_step == 1 else "poses")
    binary = ROOT / ".render-cache/draw"
    binary.parent.mkdir(exist_ok=True)
    swift = ROOT / "engine/draw.swift"
    if not binary.exists() or binary.stat().st_mtime < swift.stat().st_mtime:
        subprocess.run(["swiftc", "-O", str(swift), "-o", str(binary)], check=True)
    with tempfile.NamedTemporaryFile(suffix=".bin") as src:
        for i in ids:
            scene = Stage()
            draw(scene, i * args.pose_step / 25)
            packet = scene.packet(i)
            src.write(struct.pack("<II", i, len(packet)))
            src.write(packet)
        src.flush()
        plate = ROOT / "assets/workshop.jpg"
        bench = ROOT / "assets/bench.jpg"
        ink = ROOT / "assets/prop-print.jpg"
        relief = ROOT / "assets/clay-relief.png"
        panels = ROOT / "assets/end-walls.jpg"
        subprocess.run(
            [
                str(binary),
                str(ROOT / "engine/stage.metal"),
                src.name,
                str(plate) if plate.exists() else "-",
                str(args.width),
                str(round(args.width * 9 / 16)),
                str(output),
                str(bench) if bench.exists() else "-",
                str(ink) if ink.exists() else "-",
                str(relief) if relief.exists() else "-",
                str(panels) if panels.exists() else "-",
                f"--samples={args.samples_per_axis}",
            ],
            check=True,
        )


if __name__ == "__main__":
    main()
