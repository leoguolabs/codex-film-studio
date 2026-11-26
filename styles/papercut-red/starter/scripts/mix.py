"""Synthesize an authored pentatonic score and material Foley, mix retained speech."""
import json
from pathlib import Path
import wave

import numpy as np

RATE = 48000
TAU = 2 * np.pi
ROOT = Path(__file__).resolve().parents[1]


def write_wav(path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as out:
        out.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
        out.writeframes(np.rint(np.clip(samples, -.999, .999) * 32767).astype('<i2').tobytes())


def read_wav(path):
    with wave.open(str(path), 'rb') as source:
        if source.getsampwidth() != 2 or source.getnchannels() != 1:
            raise ValueError(f'Expected mono PCM16: {path}')
        samples = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2').astype(np.float32) / 32768
        rate = source.getframerate()
    return np.interp(np.arange(round(len(samples)*RATE/rate))*rate/RATE, np.arange(len(samples)), samples)


def put(track, signal, at, level=1, pan=0):
    first = round(at * RATE)
    if first < 0 or first >= len(track):
        raise ValueError(f'Audio event outside the edit at {at}')
    width = min(len(signal), len(track)-first)
    angle = (pan + 1) * np.pi / 4
    track[first:first+width] += signal[:width, None] * level * np.array([np.cos(angle), np.sin(angle)])


def frame_time(seconds):
    return np.arange(max(1, round(seconds*RATE))) / RATE


def tone(kind, midi, hold, seq):
    hz = 440*2**((midi-69)/12)
    tail = {'pluck': .65, 'zither': 1.15, 'flute': .21, 'bow': .23}[kind]
    t = frame_time(hold+tail)
    rng = np.random.default_rng(61+seq)
    noise = rng.normal(0, 1, len(t))
    phase = TAU * hz * t
    fade = np.clip((hold+tail-t)/tail, 0, 1)
    if kind in ('pluck', 'zither'):
        spread = 0.001 if kind == 'pluck' else .003
        harmonics = sum(np.sin(phase*h* (1 + spread*h))/(h**1.29) * np.exp(-t*h**.59/(tail*.48))
                        for h in range(1, 8))
        pick = np.diff(noise, prepend=0)*.068*np.exp(-t/.009)
        return (harmonics+pick)*np.minimum(1,t/.003)*fade
    wobble = .26*np.sin(TAU * (4.8 if kind == 'flute' else 5.7) * t)
    envelope = np.minimum(1,t/.074)*fade
    if kind == 'flute':
        return (np.sin(phase+wobble)+.27*np.sin(phase*2+wobble)+.10*noise)*envelope
    glide = phase + 22*np.exp(-t/.15) + wobble
    return sum(np.sin(glide*h)/h**1.33 for h in range(1,6))*envelope


def effect(kind, seq):
    length = {'snip': .33, 'fold': .58, 'snap': .19, 'wood': .16, 'gong': 2.6,
              'thud': .34, 'wind': 3.0, 'flutter': .80, 'creak': .55}[kind]
    t = frame_time(length)
    noise = np.random.default_rng(853+seq).normal(0, 1, len(t))
    coarse = np.interp(np.arange(len(t)), np.arange(0,len(t),60), noise[::60])
    grit = np.diff(noise, prepend=0)
    attack = np.minimum(1,t/.005)
    if kind == 'snip':
        shear = np.sin(TAU*(7300*t - 10200*t*t))*.17
        click = np.exp(-((t-.051)/.019)**2)
        return (grit*.32 + shear)*click + .17*np.sin(TAU*1876*t)*np.exp(-t/.052)*attack
    if kind == 'fold':
        return (.12*grit + .26*coarse)*np.sin(np.pi*t/length)**2 + .20*np.sin(TAU*460*t)*np.exp(-t/.019)
    if kind == 'snap':
        return (.35*grit+.36*np.sin(TAU*233*t))*np.exp(-t/.019)*attack
    if kind == 'wood':
        return (.36*np.sin(TAU*970*t) + .20*np.sin(TAU*2126*t) + .20*grit)*np.exp(-t/.022)*attack
    if kind == 'gong':
        return attack * sum(np.sin(TAU*f*t)*a*np.exp(-t/d) for f,a,d in
                            [(183,.39,1.1),(354,.22,.61),(619,.17,.41),(1127,.10,.22),(1961,.055,.15)])
    if kind == 'thud':
        return (.51*np.sin(TAU*(91*t-32*t*t))+.22*noise)*np.exp(-t/.073)*attack
    if kind == 'flutter':
        return (.15*grit+.38*coarse)*np.sin(np.pi*t/length)**2*(.35+.65*np.sin(16*TAU*t)**4)
    if kind == 'creak':
        return (.18*np.sin(TAU*(361*t+91*t*t)+.37*np.sin(TAU*18*t))+.18*coarse)*np.sin(np.pi*t/length)**2
    return (.03*noise+.56*coarse)*np.sin(np.pi*t/length)**2*(.6+.4*np.sin(TAU*1.4*t))


def mix():
    narration = json.loads((ROOT/'content/narration.json').read_text())
    design = json.loads((ROOT/'content/sound.json').read_text())
    cues = json.loads((ROOT/'content/cues.json').read_text())
    count = round(narration['duration']*RATE)
    if not count:
        raise ValueError('Set a nonzero shot duration.')
    music, foley, speech = (np.zeros((count,2), dtype=np.float32) for _ in range(3))
    beat = 60/design['bpm']
    sequence = 0
    for phrase in design['phrases']:
        step = phrase.get('step',1)*beat
        repeats = phrase.get('repeats',1)
        notes = phrase['notes']*repeats
        for i, midi in enumerate(notes):
            if midi is None:
                continue
            at = phrase['at']+i*step
            level = phrase.get('gain',.13)*(1 if i%4==0 else .84)
            instrument = phrase.get('instrument','pluck')
            signal = tone(instrument,midi,phrase.get('hold',.8)*step,sequence)
            put(music,signal,at,level,phrase.get('pan',0))
            for delay, gain in [(.049,.075),(.084,.037)]:
                if at+delay < count/RATE:
                    put(music,signal,at+delay,level*gain,-phrase.get('pan',0))
            sequence += 1
    for seq, cue in enumerate(design['effects']):
        put(foley,effect(cue['kind'],seq),cue['at'],cue.get('gain',.18),cue.get('pan',0))
    duck = np.ones(count,dtype=np.float32)
    for cue in cues:
        voice = read_wav(ROOT/cue['wav'])
        rms = np.sqrt(np.mean(voice**2))
        put(speech,voice,cue['start'],min(.92,.115/max(.01,rms)))
        first = round(cue['start']*RATE)
        last = min(count,round(cue['speech_end']*RATE))
        pre = max(0,first-round(.17*RATE))
        post = min(count,last+round(.36*RATE))
        duck[pre:first] = np.minimum(duck[pre:first],np.linspace(1,.36,first-pre,endpoint=False))
        duck[first:last] = .36
        duck[last:post] = np.minimum(duck[last:post],np.linspace(.36,1,post-last,endpoint=False))
    final = speech + duck[:,None]*music + (.61+.39*duck[:,None])*foley
    for track in [music,foley,speech,final]:
        track[-round(.10*RATE):] *= np.linspace(1,0,round(.10*RATE))[:,None]
    peak = np.max(np.abs(final))
    if peak > .90:
        final *= .90/peak
    for name, track in [('score',music),('foley',foley),('voice',speech),('mix',final)]:
        write_wav(ROOT/'audio'/f'{name}.wav',track)
    print(f'Mixed {count/RATE:.2f} s at {RATE} Hz and retained the score, Foley and voice stems.')


if __name__ == '__main__':
    mix()
