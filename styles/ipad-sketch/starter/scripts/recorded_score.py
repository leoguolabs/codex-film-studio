"""Edit a recorded instrumental and mix it with the retained pencil and speech stems."""
import hashlib
import json
import math
import os
from pathlib import Path
import tempfile

import numpy as np
import pyloudnorm as loudness
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d

RATE = 48000


def at_mix_rate(path):
    samples, source_rate = sf.read(path, dtype="float32", always_2d=True)
    if source_rate != RATE:
        factor = math.gcd(source_rate, RATE)
        samples = signal.resample_poly(samples, RATE // factor, source_rate // factor, axis=0)
    return samples


def write_track(path, samples):
    with tempfile.NamedTemporaryFile(dir=path.parent, suffix=".wav", delete=False) as tmp:
        staging = Path(tmp.name)
    try:
        sf.write(staging, samples, RATE, subtype="PCM_24")
        permissions = (path if path.exists() else path.parent).stat().st_mode & 0o666
        staging.chmod(permissions)
        os.replace(staging, path)
    finally:
        staging.unlink(missing_ok=True)


def make_score(project, edit, length):
    path = project / edit["source"]
    with path.open("rb") as source:
        digest = hashlib.sha256()
        for chunk in iter(lambda: source.read(1048576), b""):
            digest.update(chunk)
        if digest.hexdigest() != edit["source_sha256"]:
            raise ValueError("The recorded performance differs from the selected master.")
    original = at_mix_rate(path)
    if original.shape[1] == 1:
        original = np.repeat(original, 2, axis=1)
    if original.shape[1] != 2:
        raise ValueError("Use a mono or stereo music master.")
    score = np.zeros((length, 2), dtype=np.float32)
    for cue in edit["clips"]:
        start = round(cue["film_in"] * RATE)
        first = round(cue["source_in"] * RATE)
        count = round(cue["duration"] * RATE)
        if count <= 0 or min(start, first) < 0 or start + count > length or first + count > len(original):
            raise ValueError("A music edit extends beyond its source or picture.")
        part = original[first:first + count].copy()
        for side, fade in (("in", cue["fade_in"]), ("out", cue["fade_out"])):
            n = round(fade * RATE)
            if not 0 <= n <= count:
                raise ValueError("A fade extends outside its edit.")
            if n:
                ramp = np.sin(np.linspace(0, np.pi / 2, n, dtype=np.float32)) ** 2
                if side == "in":
                    part[:n] *= ramp[:, None]
                else:
                    part[-n:] *= ramp[::-1, None]
        score[start:start + count] += part
    meter = loudness.Meter(RATE)
    measured = meter.integrated_loudness(score)
    if not np.isfinite(measured):
        raise ValueError("The score contains no measurable signal.")
    gain = min(10 ** ((edit["solo_lufs"] - measured) / 20), 0.90 / np.max(np.abs(score)))
    return score * np.float32(gain)


def speech_envelope(cues, length):
    envelope = np.zeros(length, dtype=np.float32)
    attack, release = .18, .60
    for cue in cues:
        start, end = cue["start"], cue["speech_end"]
        lo = max(0, math.floor((start - attack) * RATE))
        hi = min(length, math.ceil((end + release) * RATE))
        t = np.arange(lo, hi, dtype=np.float64) / RATE
        level = np.clip(np.minimum((t - start + attack) / attack, (end + release - t) / release), 0, 1)
        envelope[lo:hi] = np.maximum(envelope[lo:hi], level)
    return envelope


def mix_recording(project):
    edit = json.loads((project / "content/music-edit.json").read_text())
    cues = json.loads((project / "content/cues.json").read_text())
    duration = json.loads((project / "content/narration.json").read_text())["duration"]
    length = round(duration * RATE)
    voice = at_mix_rate(project / "audio/narration.wav")
    foley = at_mix_rate(project / "audio/pencil.wav")
    if len(voice) != length or len(foley) != length:
        raise ValueError("The speech, pencil and picture clocks disagree.")
    if voice.shape[1] not in (1, 2) or foley.shape[1] != 2:
        raise ValueError("Use mono or stereo speech and stereo pencil Foley.")

    score = make_score(project, edit, length)
    write_track(project / "audio/score.wav", score)
    envelope = speech_envelope(cues, length)
    meter = loudness.Meter(RATE)
    # Keep the instruments' stereo image while making room for consonants in the centre.
    middle = score.mean(axis=1)
    speech_band = signal.butter(2, [850, 3400], fs=RATE, btype="bandpass", output="sos")
    presence = signal.sosfiltfilt(speech_band, middle).astype(np.float32)
    bed = score - (edit["centre_presence_cut"] * presence * envelope)[:, None]
    automation = np.asarray(edit["film_gain_db"], dtype=float)
    if np.any(np.diff(automation[:, 0]) <= 0) or automation[0, 0] < 0 or automation[-1, 0] > duration:
        raise ValueError("Music automation points must increase along the picture clock.")
    level = np.interp(np.arange(length), automation[:, 0] * RATE, automation[:, 1]).astype(np.float32)
    level += edit["bed_gain_db"] - edit["speech_duck_db"] * envelope
    bed *= np.power(np.float32(10), level / 20)[:, None]
    program = voice + foley + bed
    program *= np.float32(10 ** ((edit["mix_lufs"] - meter.integrated_loudness(program)) / 20))

    # Link both channels and anticipate transients. Release over 85 ms to avoid crackle.
    block = 48
    peak = np.max(np.abs(program), axis=1)
    peaks = np.pad(peak, (0, -length % block)).reshape(-1, block).max(axis=1)
    future = maximum_filter1d(peaks, size=13, mode="nearest")
    target = np.minimum(1, 10 ** (-1.65 / 20) / np.maximum(future, .0001))
    recovery = math.exp(-block / (RATE * .085))
    for i in range(1, len(target)):
        target[i] = min(target[i], 1 - (1 - target[i - 1]) * recovery)
    limiter = np.interp(np.arange(length), np.arange(len(target)) * block, target).astype(np.float32)
    program *= limiter[:, None]
    write_track(project / "audio/mix.wav", program)
    speaking = envelope >= .999
    speech_sample = voice[speaking]
    if speech_sample.shape[1] == 1:
        speech_sample = np.repeat(speech_sample, 2, axis=1)
    print(json.dumps({
        "score_lufs": round(meter.integrated_loudness(score), 2),
        "mix_lufs": round(meter.integrated_loudness(program), 2),
        "speech_over_music_lu": round(meter.integrated_loudness(speech_sample) - meter.integrated_loudness(bed[speaking]), 2),
        "minimum_limiter_db": round(20 * math.log10(float(target.min())), 2),
    }))


if __name__ == "__main__":
    mix_recording(Path(__file__).resolve().parents[1])
