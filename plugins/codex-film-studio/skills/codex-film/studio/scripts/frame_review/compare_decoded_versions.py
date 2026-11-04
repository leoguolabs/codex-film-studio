#!/usr/bin/env python3
"""Compare every decoded RGB24 frame without invoking an ffmpeg executable.

Usage: .venv/bin/python scripts/compare_decoded_versions.py OLD NEW OUTPUT
Use --max-frames N only for a bounded prefix test, never full-film acceptance.
Pixel identity is evidence of the same decoded image, not a visual-quality verdict.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import sys
import time

import av

try:
    from .frame_color import COLOR_POLICY, rgb_frame
except ImportError:
    from frame_color import COLOR_POLICY, rgb_frame


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for data in iter(lambda: source.read(4 * 1024 * 1024), b""):
            digest.update(data)
    return digest.hexdigest()


def file_state(path: Path) -> dict:
    stat = path.stat()
    return {"size": stat.st_size, "mtime_ns": stat.st_mtime_ns,
            "device": stat.st_dev, "inode": stat.st_ino}


def rational(value) -> str | None:
    return str(Fraction(value)) if value is not None else None


def metadata_value(value):
    return None if value is None else str(value)


class Ranges:
    """Compact inclusive intervals; indexes are decoded presentation-order indexes."""

    def __init__(self):
        self.items: list[dict] = []

    def add(self, index: int, category: str) -> None:
        if self.items and self.items[-1]["category"] == category \
                and self.items[-1]["last_frame"] + 1 == index:
            self.items[-1]["last_frame"] = index
            self.items[-1]["frame_count"] += 1
        else:
            self.items.append({"category": category, "first_frame": index,
                               "last_frame": index, "frame_count": 1})

    def select(self, category: str) -> list[dict]:
        return [{k: v for k, v in row.items() if k != "category"}
                for row in self.items if row["category"] == category]


def stream_metadata(stream) -> dict:
    return {
        "stream_index": stream.index,
        "codec": stream.codec_context.name,
        "width": stream.width, "height": stream.height,
        "average_rate": rational(stream.average_rate),
        "base_rate": rational(stream.base_rate),
        "guessed_rate": rational(stream.guessed_rate),
        "time_base": rational(stream.time_base),
        "start_time_pts": stream.start_time, "duration_pts": stream.duration,
        "reported_frames": stream.frames,
        "sample_aspect_ratio": rational(stream.sample_aspect_ratio),
        "display_aspect_ratio": rational(stream.display_aspect_ratio),
        "metadata": dict(stream.metadata),
    }


def inspect_frame(frame, index: int, width: int, height: int, fps: Fraction) -> dict | None:
    if frame is None:
        return None
    time_base = Fraction(frame.time_base) if frame.time_base is not None else None
    timestamp = frame.pts * time_base if frame.pts is not None and time_base else None
    duration_pts = getattr(frame, "duration", None)
    duration = duration_pts * time_base if duration_pts and time_base else None
    pixels = rgb_frame(frame).to_ndarray()
    # C-order bytes exclude the padded decoder line stride; all RGB pixels count.
    pixel_hash = hashlib.sha256(pixels.tobytes(order="C")).hexdigest()
    expected = Fraction(index, 1) / fps
    side_data = []
    for side in frame.side_data:
        if "DISPLAYMATRIX" in str(side.type).upper():
            side_data.append({"type": str(side.type),
                              "sha256": hashlib.sha256(bytes(side)).hexdigest()})
    errors = []
    if (frame.width, frame.height) != (width, height):
        errors.append("unexpected_dimensions")
    if timestamp is None:
        errors.append("missing_pts_or_time_base")
    elif timestamp != expected:
        errors.append("pts_not_on_expected_zero_origin_cfr_grid")
    if frame.is_corrupt:
        errors.append("decoder_marked_corrupt")
    if duration is not None and duration != 1 / fps:
        errors.append("frame_duration_not_one_expected_frame")
    return {
        "pts": frame.pts, "time_base": rational(time_base),
        "timestamp": rational(timestamp),
        "timestamp_seconds": float(timestamp) if timestamp is not None else None,
        "duration_pts": duration_pts, "duration_seconds_rational": rational(duration),
        "expected_timestamp": rational(expected),
        "width": frame.width, "height": frame.height,
        "rgb24_sha256": pixel_hash, "rgb24_byte_count": pixels.nbytes,
        "source_pixel_format": frame.format.name,
        "color_range": metadata_value(getattr(frame, "color_range", None)),
        "colorspace": metadata_value(getattr(frame, "colorspace", None)),
        "color_primaries": metadata_value(getattr(frame, "color_primaries", None)),
        "color_trc": metadata_value(getattr(frame, "color_trc", None)),
        "display_matrix_side_data": side_data,
        "frame_contract_pass": not errors, "contract_errors": errors,
    }


def compare_records(index: int, old: dict | None, new: dict | None,
                    metadata_contract_pass: bool) -> dict:
    paired = old is not None and new is not None
    pixel_equal = paired and old["width"] == new["width"] \
        and old["height"] == new["height"] \
        and old["rgb24_sha256"] == new["rgb24_sha256"]
    timestamp_equal = paired and old["timestamp"] is not None \
        and old["timestamp"] == new["timestamp"]
    display_equal = paired and old["display_matrix_side_data"] == new["display_matrix_side_data"]
    # A changed HDR transfer/primaries tag must not inherit an image-only review.
    color_tags_equal = paired and all(old[key] == new[key] for key in
        ("color_range", "colorspace", "color_primaries", "color_trc"))
    candidate = bool(pixel_equal and timestamp_equal and display_equal and color_tags_equal
                     and metadata_contract_pass and old["frame_contract_pass"]
                     and new["frame_contract_pass"])
    category = ("identical" if pixel_equal else "different") if paired \
        else ("old_only" if old is not None else "new_only")
    return {
        "frame_index": index, "old": old, "new": new,
        "pixel_status": category, "rgb24_pixels_identical": bool(pixel_equal),
        "timestamps_equal": bool(timestamp_equal),
        "raw_pts_and_time_base_equal": bool(paired and old["pts"] == new["pts"]
                                             and old["time_base"] == new["time_base"]),
        "display_matrix_equal": bool(display_equal), "color_tags_equal": bool(color_tags_equal),
        "inheritance_candidate": candidate,
        "candidate_requires_complete_run_and_verified_input_identity": True,
    }


def compare(args: argparse.Namespace) -> dict:
    old_path, new_path = args.old.resolve(strict=True), args.new.resolve(strict=True)
    output = args.output.resolve()
    if output.exists() and any(output.iterdir()):
        raise ValueError(f"Output directory must be empty: {output}")
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    fps = Fraction(args.fps)
    unique_paths = {old_path, new_path}
    states = {path: file_state(path) for path in unique_paths}
    hashes = {path: file_hash(path) for path in unique_paths}
    if any(file_state(path) != states[path] for path in unique_paths):
        raise RuntimeError("An input changed while its initial hash was being read")
    inputs = {name: {"path": str(path), "sha256": hashes[path], **states[path]}
              for name, path in (("old", old_path), ("new", new_path))}
    write_json(output / "status.json", {"state": "running", "inputs": inputs})
    pixels, candidates, timing, contracts = Ranges(), Ranges(), Ranges(), Ranges()
    counts = {"old_decoded": 0, "new_decoded": 0, "paired": 0,
              "identical": 0, "different": 0, "old_only": 0, "new_only": 0,
              "inheritance_candidates": 0}
    eof = {"old": False, "new": False}
    stream_info, global_errors, failure = {}, [], None
    index = 0
    try:
        with av.open(str(old_path)) as old_container, av.open(str(new_path)) as new_container, \
                (output / "frames.jsonl").open("w", encoding="utf-8") as rows:
            for name, container in (("old", old_container), ("new", new_container)):
                if len(container.streams.video) != 1:
                    raise ValueError(f"{name} input must contain exactly one video stream")
                stream = container.streams.video[0]
                # One decode thread per input keeps this audit's concurrent load bounded.
                stream.codec_context.thread_count = args.threads
                stream_info[name] = stream_metadata(stream)
                info = stream_info[name]
                if (info["width"], info["height"]) != (args.width, args.height):
                    global_errors.append(f"{name}: unexpected stream dimensions")
                if info["average_rate"] != str(fps):
                    global_errors.append(f"{name}: average frame rate is not {fps}")
            for key in ("sample_aspect_ratio", "display_aspect_ratio"):
                if stream_info["old"][key] != stream_info["new"][key]:
                    global_errors.append(f"stream {key} differs")
            if stream_info["old"]["metadata"].get("rotate") != stream_info["new"]["metadata"].get("rotate"):
                global_errors.append("stream rotation metadata differs")
            old_frames = iter(old_container.decode(video=0))
            new_frames = iter(new_container.decode(video=0))
            while args.max_frames is None or index < args.max_frames:
                old = next(old_frames, None) if not eof["old"] else None
                new = next(new_frames, None) if not eof["new"] else None
                eof["old"] = eof["old"] or old is None
                eof["new"] = eof["new"] or new is None
                if old is None and new is None:
                    break
                old_row = inspect_frame(old, index, args.width, args.height, fps)
                new_row = inspect_frame(new, index, args.width, args.height, fps)
                row = compare_records(index, old_row, new_row, not global_errors)
                rows.write(json.dumps(row, ensure_ascii=False) + "\n")
                counts["old_decoded"] += int(old is not None)
                counts["new_decoded"] += int(new is not None)
                counts["paired"] += int(old is not None and new is not None)
                counts[row["pixel_status"]] += 1
                counts["inheritance_candidates"] += int(row["inheritance_candidate"])
                pixels.add(index, row["pixel_status"])
                candidates.add(index, "candidate" if row["inheritance_candidate"] else "ineligible")
                timing.add(index, "equal" if row["timestamps_equal"] else "mismatch_or_missing")
                valid = old_row and new_row and old_row["frame_contract_pass"] and new_row["frame_contract_pass"]
                contracts.add(index, "pass" if valid else "failure_or_missing")
                index += 1
                if index % 1000 == 0:
                    rows.flush()
                    print(f"Compared {index} frame indexes: {counts['identical']} identical, "
                          f"{counts['different']} different", flush=True)
    except Exception as error:
        failure = f"{type(error).__name__}: {error}"

    # Hash again: input stability is bound to bytes, not merely unchanged timestamps.
    final_states = {path: file_state(path) for path in unique_paths}
    final_hashes = {path: file_hash(path) for path in unique_paths}
    stable = all(states[path] == final_states[path] and hashes[path] == final_hashes[path]
                 and final_states[path] == file_state(path) for path in unique_paths)
    complete = all(eof.values()) and failure is None
    if complete:
        for name in ("old", "new"):
            reported = stream_info[name]["reported_frames"]
            if reported and reported != counts[f"{name}_decoded"]:
                global_errors.append(f"{name}: reported and decoded frame counts differ")
            duration = stream_info[name]["duration_pts"]
            time_base = stream_info[name]["time_base"]
            if duration is not None and time_base is not None \
                    and duration * Fraction(time_base) != counts[f"{name}_decoded"] / fps:
                global_errors.append(f"{name}: stream duration does not match decoded CFR extent")
    if not index:
        global_errors.append("no frame pairs or unpaired frames were processed")
    if not stable:
        global_errors.append("input content or file identity changed during the audit")
    equal_lengths = complete and counts["old_decoded"] == counts["new_decoded"]
    no_frame_errors = not contracts.select("failure_or_missing")
    inheritance_valid = complete and stable and not global_errors and equal_lengths \
        and no_frame_errors and args.max_frames is None
    verified_ranges = candidates.select("candidate") if inheritance_valid else []
    summary = {
        "schema": "decoded-video-identity-v1",
        "color_conversion": COLOR_POLICY,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": inputs, "streams": stream_info,
        "contract": {"width": args.width, "height": args.height, "fps": str(fps),
                     "pts_grid": "frame_index / fps, zero origin; exact rational arithmetic",
                     "pixel_format": "rgb24", "pixel_digest": "SHA256 of C-order RGB bytes",
                     "decoder_threads_per_input": args.threads},
        "runtime": {"pyav": av.__version__,
                    "libav_versions": {k: list(v) for k, v in av.library_versions.items()}},
        "complete_decode": complete, "bounded_prefix_requested": args.max_frames,
        "end_of_stream_observed": eof, "inputs_unchanged_and_rehashed": stable,
        "total_frames": {"old": counts["old_decoded"] if eof["old"] else None,
                         "new": counts["new_decoded"] if eof["new"] else None},
        "counts_in_observed_prefix": counts, "processed_frame_indexes": index,
        "equal_complete_frame_counts": equal_lengths,
        "all_decoded_pixels_identical": bool(complete and equal_lengths and index
                                              and counts["identical"] == index),
        "pixel_status_ranges": pixels.items,
        "identical_pixel_ranges": pixels.select("identical"),
        "different_pixel_ranges": pixels.select("different"),
        "unpaired_old_ranges": pixels.select("old_only"),
        "unpaired_new_ranges": pixels.select("new_only"),
        "timestamp_mismatch_or_missing_ranges": timing.select("mismatch_or_missing"),
        "frame_contract_failure_or_missing_ranges": contracts.select("failure_or_missing"),
        "global_contract_errors": global_errors, "decode_error": failure,
        "inheritance_run_valid": inheritance_valid,
        "verified_image_identity_ranges": verified_ranges,
        "pending_identity_candidate_ranges": candidates.select("candidate") if not inheritance_valid else [],
        "per_frame_records": "frames.jsonl",
        "per_frame_records_sha256": file_hash(output / "frames.jsonl") if (output / "frames.jsonl").exists() else None,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "limitations": [
            "No frames are visually reviewed by this script. An image identity range is not a quality pass.",
            "Inherit only prior actual visual coverage intersected with verified_image_identity_ranges and the exact old input hash.",
            "Per-frame inheritance_candidate is provisional until inheritance_run_valid is true in this completed summary.",
            "Bounded prefix tests never produce verified inheritance ranges or infer unobserved total frame counts.",
            "Frame indexes are aligned directly; changed edits, frame insertions, timing shifts and unequal lengths are not realigned.",
            "Pixel differences after lossy re-encoding are real differences here; no perceptual tolerance or similarity percentage is used.",
            "Identity applies to this recorded PyAV/libav RGB conversion. It does not certify all players' color management.",
            "Audio, subtitles, mux metadata, motion perception and listening evidence are not inherited by this image comparison.",
        ],
    }
    write_json(output / "summary.json", summary)
    lines = [
        f"Complete decode: {complete}; stable input hashes: {stable}",
        f"Observed old/new: {counts['old_decoded']}/{counts['new_decoded']} frames; paired: {counts['paired']}",
        f"RGB24 identical/different: {counts['identical']}/{counts['different']}; old-only/new-only: {counts['old_only']}/{counts['new_only']}",
        f"Inheritance run valid: {inheritance_valid}; verified identity ranges: {len(verified_ranges)}",
        f"Global contract errors: {global_errors}; decode error: {failure}",
        "This is pixel-identity evidence, not a visual review or an audio-listening result.",
    ]
    (output / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    write_json(output / "status.json", {"state": "failed" if failure else "complete" if complete else "bounded_prefix_only",
                                        "inheritance_run_valid": inheritance_valid,
                                        "summary_sha256": file_hash(output / "summary.json")})
    print("\n".join(lines), flush=True)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("old", type=Path)
    parser.add_argument("new", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", default="25", help="Exact rational frame rate; default 25")
    parser.add_argument("--threads", type=int, default=1, help="Decode threads per input; default 1")
    parser.add_argument("--max-frames", type=int, help="Decode only this prefix; disables verified inheritance")
    args = parser.parse_args()
    try:
        if args.width <= 0 or args.height <= 0 or Fraction(args.fps) <= 0 or args.threads <= 0 \
                or (args.max_frames is not None and args.max_frames <= 0):
            parser.error("dimensions, fps, threads and max-frames must be positive")
        summary = compare(args)
    except Exception as error:
        print(f"Comparison failed: {type(error).__name__}: {error}", file=sys.stderr)
        return 1
    if summary["decode_error"]:
        return 1
    if summary["global_contract_errors"] or summary["frame_contract_failure_or_missing_ranges"]:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
