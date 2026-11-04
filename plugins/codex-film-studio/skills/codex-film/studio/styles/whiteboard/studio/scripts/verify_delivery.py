#!/usr/bin/env python3
"""Verify the encoded artifact, frame cadence and the placement of every voice line."""
import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import subprocess

import numpy as np
from scipy.io import wavfile
from production import add_edition_argument, production

ROOT = Path(__file__).resolve().parents[1]


def run(*args, binary=False):
    result = subprocess.run(list(map(str, args)), capture_output=True,
                            text=not binary, check=True)
    return result


def main():
    global ROOT
    parser = argparse.ArgumentParser()
    add_edition_argument(parser)
    project = production(parser.parse_args().edition)
    ROOT = project.root
    video = project.video
    timeline = json.loads((ROOT/"media/timeline.json").read_text())
    meta = json.loads(run("ffprobe", "-v", "error", "-count_frames", "-show_streams",
                          "-show_format", "-of", "json", video).stdout)
    v = next(s for s in meta["streams"] if s["codec_type"] == "video")
    a = next(s for s in meta["streams"] if s["codec_type"] == "audio")
    errors = []
    for condition, label in [
        (int(v["nb_read_frames"]) == timeline["duration_frames"], "frame count"),
        (Fraction(v["avg_frame_rate"]) == 24, "frame rate"),
        ((v["width"], v["height"]) == (1920, 1080), "resolution"),
        (v["pix_fmt"] == "yuv420p", "pixel format"),
        (v.get("color_range") == "tv" and v.get("color_space") == "bt709"
         and v.get("color_transfer") == "bt709" and v.get("color_primaries") == "bt709",
         "limited-range BT.709 metadata"),
        (int(a["sample_rate"]) == 48000 and a["channels"] == 2, "audio format"),
        (abs(float(v["duration"])-float(a["duration"])) < 1/24, "audio/video duration"),
    ]:
        if not condition:
            errors.append(label)
    run("ffmpeg", "-v", "error", "-xerror", "-err_detect", "explode", "-i", video,
        "-map", "0:v:0", "-map", "0:a:0", "-f", "null", "-")
    frames = json.loads(run("ffprobe", "-v", "error", "-select_streams", "v:0",
                            "-show_frames", "-show_entries", "frame=best_effort_timestamp_time",
                            "-of", "json", video).stdout)["frames"]
    pts = np.array([float(f["best_effort_timestamp_time"]) for f in frames])
    cadence_error = float(np.max(np.abs(pts-np.arange(len(pts))/24)))
    if cadence_error > 0.0001:
        errors.append("timestamp cadence")
    measured = run("ffmpeg", "-hide_banner", "-nostats", "-i", video, "-vn",
                   "-af", "loudnorm=print_format=json", "-f", "null", "-")
    loudness = json.loads(re.findall(r"\{[^{}]+\}", measured.stderr)[-1])
    integrated, peak = float(loudness["input_i"]), float(loudness["input_tp"])
    if not -15 <= integrated <= -13:
        errors.append("integrated loudness outside -14 +/- 1 LUFS")
    if peak > -1:
        errors.append("true peak exceeds -1 dBTP")
    pcm = run("ffmpeg", "-v", "error", "-i", video, "-vn", "-ar", "48000",
              "-ac", "1", "-f", "f32le", "-", binary=True).stdout
    decoded = np.frombuffer(pcm, np.float32)
    rate, stereo_voice = wavfile.read(ROOT/"media/voice-stem.wav")
    voice = stereo_voice.mean(axis=1)
    placement = []
    for row in timeline["lines"]:
        lo, hi = round(row["start"]*rate), min(len(decoded), round(row["end"]*rate))
        expected, actual = voice[lo:hi], decoded[lo:hi]
        active = np.abs(expected) > .02
        x, y = expected[active].astype(float), actual[active].astype(float)
        correlation = float(np.dot(x, y)/max(1e-12, np.linalg.norm(x)*np.linalg.norm(y)))
        placement.append({"id": row["id"], "active_samples": int(active.sum()),
                          "zero_lag_voice_correlation": correlation})
        if active.sum() < 4800 or correlation < .97:
            errors.append(f"voice placement mismatch: {row['id']}")
    report = {"video_sha256": hashlib.sha256(video.read_bytes()).hexdigest(),
              "checks_passed": not errors, "errors": errors,
              "decoded_frames": int(v["nb_read_frames"]), "fps": 24,
              "width": v["width"], "height": v["height"],
              "pixel_format": v["pix_fmt"], "color_range": v.get("color_range"),
              "color_space": v.get("color_space"),
              "color_transfer": v.get("color_transfer"),
              "color_primaries": v.get("color_primaries"),
              "duration": float(v["duration"]), "audio_duration": float(a["duration"]),
              "timestamp_cadence_max_error_seconds": cadence_error,
              "full_decode_passed": True,
              "audio": {k: loudness[k] for k in ["input_i", "input_tp", "input_lra"]},
              "voice_placement": placement,
              "visual_review": "Not established by technical checks.",
              "audio_listening": "Not established by waveform or ASR checks."}
    (ROOT/"review/technical-delivery.json").write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps({k: report[k] for k in ["checks_passed", "decoded_frames", "duration", "audio", "errors"]}))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
