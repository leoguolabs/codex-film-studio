"""Place a retained instrumental performance under the film's actual dialogue."""
import hashlib
import math
import numpy as np
import soundfile as sf
from scipy import signal
from paper_sound import rms


def render_music(root, edit, samples, rate, voice, speaking):
    source = root / edit['source']
    if hashlib.sha256(source.read_bytes()).hexdigest() != edit['source_sha256']:
        raise ValueError('The retained music master differs from the selected recording.')
    music, original_rate = sf.read(source, dtype='float32', always_2d=True)
    if music.shape[1] == 1:
        music = np.repeat(music, 2, axis=1)
    if music.shape[1] != 2:
        raise ValueError('Supply a mono or stereo music recording.')
    if original_rate != rate:
        g = math.gcd(original_rate, rate)
        music = signal.resample_poly(music, rate//g, original_rate//g, axis=0)
    track = np.zeros((samples, 2), dtype=np.float32)
    if not edit['cues']:
        raise ValueError('Place the recorded performance on the film timeline with at least one cue.')
    for cue in edit['cues']:
        if min(cue['fade_in'], cue['fade_out']) < 0:
            raise ValueError('Music fades are measured in nonnegative seconds.')
        start = round(cue['film_in'] * rate)
        end = round(cue['film_out'] * rate)
        source_in = round(cue['source_in'] * rate)
        n = end-start
        if not (0 <= start < end <= samples and 0 <= source_in <= len(music)-n):
            raise ValueError('Music cue falls outside the film or the original recording.')
        region = music[source_in:source_in+n].copy()
        fade_in = min(n, round(cue['fade_in'] * rate))
        fade_out = min(n, round(cue['fade_out'] * rate))
        if fade_in:
            region[:fade_in] *= np.sin(np.linspace(0, np.pi/2, fade_in))[:,None]**2
        if fade_out:
            region[-fade_out:] *= np.cos(np.linspace(0, np.pi/2, fade_out))[:,None]**2
        track[start:end] += region
    # Move the bed gently around whole phrases. Short syllable gaps do not pump the level.
    step=round(rate/100)
    gated=np.pad(speaking,(0,(-len(speaking))%step)).reshape(-1,step).any(axis=1)
    duck=np.zeros(len(gated))
    value=0.0
    for i, voiced in enumerate(gated):
        dest=float(voiced)
        time_constant=0.105 if dest>value else 0.58
        value+=(dest-value)*(1-np.exp(-0.01/time_constant))
        duck[i]=value
    contour=np.interp(np.arange(samples),np.arange(len(duck))*step,duck)
    track*=10**(-edit.get('speech_duck_db',3.5)*contour[:,None]/20)
    level=rms(voice[speaking])*10**(edit.get('music_under_voice_db',-20)/20)
    track*=level/rms(track[speaking])
    return track
