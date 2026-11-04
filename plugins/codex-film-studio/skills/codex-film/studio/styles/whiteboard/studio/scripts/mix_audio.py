#!/usr/bin/env python3
"""Compose original score and physical foley on the picture's shared timeline."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
from functools import lru_cache

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample_poly, sosfilt
from production import STUDIO, add_edition_argument, production

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
RNG = np.random.default_rng(20261020)


def db(value):
    return 10 ** (value / 20)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def add(buffer, signal, start, gain=1, pan=0):
    index = round(start * SR)
    if index < 0:
        signal = signal[-index:]
        index = 0
    length = min(len(signal), len(buffer) - index)
    if length <= 0:
        return
    signal = signal[:length]
    gains = np.array([math.cos((pan+1)*math.pi/4),
                      math.sin((pan+1)*math.pi/4)]) * gain
    buffer[index:index+length] += signal[:, None] * gains


@lru_cache(maxsize=None)
def sampled_note(midi, duration, kind):
    """Pitch a licensed real instrument; preserve its natural attack and decay."""
    names = {"marimba": "marimba-c4.wav", "bell": "glock-c5.wav",
             "pluck": "cello-pizz-g1.wav"}
    folder = STUDIO/"assets/instruments"
    entries = json.loads((folder/"sources.json").read_text())
    entry = next(row for row in entries if row["file"] == names[kind])
    path = folder/entry["file"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
        raise ValueError(f"Changed instrument sample: {path.name}")
    rate, raw = wavfile.read(path)
    scale = np.iinfo(raw.dtype).max if np.issubdtype(raw.dtype, np.integer) else 1
    signal = raw.astype(np.float32)/scale
    if signal.ndim == 2:
        signal = signal.mean(axis=1)
    active = np.flatnonzero(np.abs(signal) > np.abs(signal).max()*.002)
    if len(active):
        signal = signal[max(0, active[0]-round(rate*.003)):]
    # Rational resampling shifts pitch and duration together, as a sampler does.
    ratio = 2 ** ((midi-entry["root_midi"])/12)
    source_rate = round(rate*ratio)
    divisor = math.gcd(SR, source_rate)
    signal = resample_poly(signal, SR//divisor, source_rate//divisor)
    target = round(duration*SR)
    signal = np.pad(signal[:target], (0, max(0, target-len(signal))))
    peak = np.abs(signal).max()
    signal /= max(peak, .001)
    fade = min(round(.08*SR), len(signal)//2)
    signal[-fade:] *= smooth(np.linspace(1, 0, fade))
    return signal.astype(np.float32)


def camera_at(keys, time):
    a, b = keys[0], keys[0]
    for key in keys:
        if key["t"] <= time:
            a = key
        else:
            b = key
            break
        b = a
    u = 0 if a is b else float(smooth((time-a["t"])/(b["t"]-a["t"])))
    return {"x": a["x"]+(b["x"]-a["x"])*u,
            "z": 1/((1-u)/a["z"]+u/b["z"])}


def write(name, signal):
    wavfile.write(str(ROOT/"media"/name), SR, signal.astype(np.float32))


def main():
    global ROOT
    parser = argparse.ArgumentParser()
    add_edition_argument(parser)
    parser.add_argument("--draft", action="store_true")
    parser.add_argument("--picture", default="media/picture-v1.mp4")
    parser.add_argument("--out", help="Output path relative to the selected edition.")
    parser.add_argument("--stems-only", action="store_true")
    args = parser.parse_args()
    project = production(args.edition)
    ROOT = project.root
    args.out = args.out or f"media/{project.movie_name}"
    timeline = json.loads((ROOT/"media/timeline.json").read_text())
    events = json.loads((ROOT/"media/events.json").read_text())
    if not timeline["complete_audio"] and not args.draft:
        raise SystemExit("Final mix requires complete provider audio.")
    n = round(timeline["duration"]*SR)
    voice = np.zeros((n, 2), np.float32)
    foley = np.zeros_like(voice)
    music = np.zeros_like(voice)
    duck = np.ones(n, np.float32)
    provenance = []
    for row in timeline["lines"]:
        if not row["audio"]:
            continue
        audio = row["audio"]
        path = ROOT/audio["path"]
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        if sha != audio["audio_sha256"]:
            raise ValueError(f"Changed provider audio {row['id']}")
        rate, raw = wavfile.read(path)
        samples = raw.astype(np.float32)/32768
        samples = resample_poly(samples, SR//math.gcd(SR, rate), rate//math.gcd(SR, rate))
        active = samples[np.abs(samples) > .012]
        rms = np.sqrt(np.mean(active**2)) if len(active) else 0
        gain = min(2.5, db(-19)/max(.001, rms))
        # Equal-power centered pan attenuates each channel; compensate dialogue.
        add(voice, samples, row["start"], gain*math.sqrt(2))
        a = max(0, round((row["start"]-.15)*SR))
        b = min(n, round((row["end"]+.3)*SR))
        envelope = np.full(b-a, .56, np.float32)
        fade = min(round(.2*SR), len(envelope)//2)
        envelope[:fade] = 1-.44*smooth(np.linspace(0, 1, fade))
        envelope[-fade:] = .56+.44*smooth(np.linspace(0, 1, fade))
        duck[a:b] = np.minimum(duck[a:b], envelope)
        provenance.append({"id": row["id"], "sha256": sha, "gain_db": 20*math.log10(gain),
                           "raw_peak": float(np.abs(raw.astype(np.float32)/32768).max()),
                           "duration": len(samples)/SR})

    band = butter(2, [650, 4200], btype="bandpass", fs=SR, output="sos")
    for stroke in events["strokes"]:
        duration = max(.012, stroke["end"]-stroke["start"])
        t = np.arange(round(duration*SR))/SR
        noise = sosfilt(band, RNG.normal(size=len(t)))
        envelope = smooth(t/.009)*smooth((duration-t)/.012)
        # Felt rubbing speeds up midway through a stroke and relaxes at the ends.
        speed = .25+.75*(1-np.cos(2*np.pi*t/max(duration, .001)))/2
        sound = noise*envelope*speed*(.7+.3*np.sin(2*np.pi*29*t)**2)
        cam = camera_at(events["camera"], stroke["start"])
        pan = float(np.clip((stroke["x"]-cam["x"])*cam["z"]/1100, -.8, .8))
        add(foley, sound, stroke["start"], db(-34), pan)

    for cue in events["cues"]:
        if cue["kind"] in {"magnet", "cap"}:
            t = np.arange(round(.14*SR))/SR
            sound = (RNG.normal(size=len(t))*.2+np.sin(2*np.pi*920*t))*np.exp(-t*65)
            sound *= smooth(t/.001)
            add(foley, sound, cue["time"], db(-22), -.25 if cue["kind"] == "magnet" else .35)
        elif cue["kind"] == "eraser":
            t = np.arange(round(cue["duration"]*SR))/SR
            rub = sosfilt(butter(2, [150, 2100], btype="bandpass", fs=SR, output="sos"),
                          RNG.normal(size=len(t)))
            rub *= smooth(t/.08)*smooth((cue["duration"]-t)/.08)*(.5+.5*np.sin(t*12)**2)
            add(foley, rub, cue["time"], db(-25), .15)

    # Original C-major/A-minor motif: deliberately spare, four bars per harmony.
    beat = 60/88
    chords = [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64],
              [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]]
    pattern = [2, 3, 4, 3, 2, 4, 1, 3]
    total_beats = int(timeline["duration"]/beat)
    for k in range(total_beats):
        chord = chords[(k//16)%4]
        if k % 8 in {0, 2, 3, 5, 6}:
            midi = chord[pattern[k%8]]+12
            add(music, sampled_note(midi, 1.3, "marimba"), k*beat+.05,
                db(-29 if k%4 == 0 else -32), -.3)
        if k % 4 == 0:
            add(music, sampled_note(chord[0], .9, "pluck"), k*beat+.035, db(-34), .18)
        if k % 16 == 14:
            add(music, sampled_note(chord[3]+24, 1.8, "bell"), k*beat+.08, db(-36), .45)
    music *= duck[:, None]
    for cue in events["cues"]:
        if cue["kind"] == "silence":
            a = max(0, round(cue["time"]*SR))
            b = min(n, round((cue["time"]+cue["duration"])*SR))
            fade = min(round(.1*SR), (b-a)//3)
            music[a:a+fade] *= np.linspace(1, 0, fade)[:, None]
            music[a+fade:b-fade] = 0
            music[b-fade:b] *= np.linspace(0, 1, fade)[:, None]
    fade = min(n, SR*3)
    music[-fade:] *= np.linspace(1, 0, fade)[:, None]
    write("voice-stem.wav", voice)
    write("foley-stem.wav", foley)
    write("music-stem.wav", music)
    mixed = voice+foley+music
    if np.abs(mixed).max() >= 1:
        raise ValueError("Unmastered mix clips; adjust stem gain.")
    write("mix-unmastered.wav", mixed)
    (ROOT/"media/audio-mix-provenance.json").write_text(json.dumps({
        "sample_rate": SR, "duration": n/SR, "voice": provenance,
        "score": "Original 88 BPM composition with CC0 VCSL/VSCO-2-CE instrument samples",
        "instrument_sources": json.loads((STUDIO/"assets/instruments/sources.json").read_text()),
        "foley": "Original filtered noise and modal impacts on shared stroke/cue timeline",
        "unmastered_peak": float(np.abs(mixed).max())
    }, indent=2)+"\n")
    if args.stems_only:
        return
    receipt_path = ROOT/(args.picture+".render.json")
    if not args.draft:
        receipt = json.loads(receipt_path.read_text())
        for key, path in [("picture_sha256", ROOT/args.picture),
                          ("timeline_sha256", ROOT/"media/timeline.json"),
                          ("events_sha256", ROOT/"media/events.json")]:
            if hashlib.sha256(path.read_bytes()).hexdigest() != receipt[key]:
                raise ValueError(f"Picture and sound no longer share the same build: {key}")
        if receipt["first_frame"] != 0 or receipt["frames"] != timeline["duration_frames"]:
            raise ValueError("Cannot deliver a partial picture render.")
    measure = subprocess.run([
        "ffmpeg", "-hide_banner", "-i", str(ROOT/"media/mix-unmastered.wav"),
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"
    ], capture_output=True, text=True, check=True)
    result = json.loads(re.findall(r"\{[^{}]+\}", measure.stderr)[-1])
    filt = ("loudnorm=I=-14:TP=-1.5:LRA=9:"
            f"measured_I={result['input_i']}:measured_TP={result['input_tp']}:"
            f"measured_LRA={result['input_lra']}:measured_thresh={result['input_thresh']}:"
            f"offset={result['target_offset']}:linear=true:print_format=json")
    subprocess.run(["ffmpeg", "-y", "-v", "warning", "-i", str(ROOT/"media/mix-unmastered.wav"),
                    "-af", filt, "-ar", str(SR), "-c:a", "pcm_s24le",
                    str(ROOT/"media/mix-master.wav")], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "warning", "-i", str(ROOT/args.picture),
                    "-i", str(ROOT/"media/mix-master.wav"), "-map", "0:v:0", "-map", "1:a:0",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", str(SR),
                    "-t", str(timeline["duration"]), "-movflags", "+faststart",
                    str(ROOT/args.out)], check=True)
    (ROOT/"media/loudness-first-pass.json").write_text(json.dumps(result, indent=2)+"\n")
    print(args.out)


if __name__ == "__main__":
    main()
