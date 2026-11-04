"""Expand reviewed visual-role intervals into explicit frame correspondences.

This does not select scenes, inspect images, or estimate artistic similarity.
Intervals are zero-based and half-open. Every output frame needs an explicit
matched or unmatched interval; omitted regions are rejected rather than hidden.
"""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path


def interval(value, limit, name):
    if (not isinstance(value, list) or len(value) != 2
            or any(type(x) is not int for x in value)
            or not 0 <= value[0] < value[1] <= limit):
        raise ValueError(f"{name} must be a nonempty [start, end) within {limit} frames")
    return value


def validate(data):
    for name in ("output", "reference"):
        stream = data[name]
        if type(stream["frames"]) is not int or stream["frames"] < 1:
            raise ValueError(f"{name}.frames must be a positive decoded frame count")
        if (type(stream["fps"]) not in (int, float)
                or not math.isfinite(stream["fps"]) or stream["fps"] <= 0):
            raise ValueError(f"{name}.fps must be positive and finite")
    next_frame, ids = 0, set()
    for segment in data["segments"]:
        for key in ("id", "role", "phase", "reason"):
            if not isinstance(segment.get(key), str) or not segment[key].strip():
                raise ValueError(f"Every segment needs a nonempty {key}")
        if segment["id"] in ids:
            raise ValueError("Segment IDs must be unique")
        ids.add(segment["id"])
        a, b = interval(segment["output"], data["output"]["frames"], "output interval")
        if a != next_frame:
            raise ValueError(f"Output intervals must tile the film in order; expected {next_frame}, got {a}")
        next_frame = b
        if "reference" not in segment:
            raise ValueError("Use reference: null for an explicitly unmatched interval")
        if segment["reference"] is not None:
            interval(segment["reference"], data["reference"]["frames"], "reference interval")
    if next_frame != data["output"]["frames"]:
        raise ValueError("Output coverage is incomplete")


def rows(data):
    validate(data)
    for segment in data["segments"]:
        a, b = segment["output"]
        length = b - a
        for f in range(a, b):
            phase = (f - a) / (length - 1) if length > 1 else 0.0
            reference_frame = reference_time = ""
            if segment["reference"] is not None:
                c, d = segment["reference"]
                # Integer nearest rounding; both interval endpoints are retained.
                offset = ((2 * (f - a) * (d - c - 1) + length - 1)
                          // (2 * (length - 1))) if length > 1 else 0
                reference_frame = c + offset
                reference_time = reference_frame / data["reference"]["fps"]
            yield [f, f / data["output"]["fps"], reference_frame, reference_time,
                   segment["role"], segment["phase"], segment["id"], phase,
                   "matched" if reference_frame != "" else "unmatched", segment["reason"]]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("mapping", type=Path)
    ap.add_argument("destination", type=Path)
    args = ap.parse_args()
    raw = args.mapping.read_bytes()
    data = json.loads(raw)
    validate(data)
    args.destination.mkdir(parents=True, exist_ok=True)
    matched = unmatched = 0
    with (args.destination / "role-correspondence.csv").open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["output_frame", "output_time", "reference_frame", "reference_time",
                         "role", "phase", "segment_id", "normalized_phase", "status", "reason"])
        for row in rows(data):
            writer.writerow(row)
            matched += row[8] == "matched"
            unmatched += row[8] == "unmatched"
    summary = {
        "mapping_sha256": hashlib.sha256(raw).hexdigest(),
        "output": data["output"], "reference": data["reference"],
        "rows": matched + unmatched, "matched_frames": matched,
        "unmatched_frames": unmatched, "intervals": len(data["segments"]),
        "coverage": "Every output frame has exactly one matched or explicitly unmatched row.",
        "interpretation": "Human-selected roles and phases, normalized within each interval. "
                          "No semantic verification, image inspection or similarity score is performed by this tool."
    }
    (args.destination / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
