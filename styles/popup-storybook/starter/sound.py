"""Record English lines, play an authored chamber score and mix paper contacts."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from math import gcd
from engine.ensemble import play

ROOT = Path(__file__).resolve().parent
RATE = 48000


def mix(models):
    book = json.loads((ROOT/'content/book.json').read_text())
    dest = ROOT/'audio'
    (dest/'takes').mkdir(parents=True, exist_ok=True)
    length = round(book['duration'] * RATE)
    voice = np.zeros((length, 2), 'f4')
    foley = np.zeros_like(voice)
    music = play(book['music'], length, RATE)
    duck = np.ones(length, 'f4')
    receipts = []
    speaker = book.get('voice', 'bf_emma')
    lang = book.get('lang', 'en-gb')
    speed = book.get('speed', 1)
    synth = None
    for i, line in enumerate(book['lines']):
        text = line['text']
        key = hashlib.sha256(json.dumps([text, speaker, lang, speed]).encode()).hexdigest()[:12]
        take = dest/'takes'/f'{i+1:02}-{key}.wav'
        if 'wav' in line:
            take = ROOT/line['wav']
        if not take.exists():
            if not models:
                raise ValueError(f'Missing take for line {i+1}. Pass --models or supply its wav path.')
            if synth is None:
                import espeakng_loader
                os.environ.setdefault('ESPEAK_DATA_PATH', espeakng_loader.get_data_path())
                import onnxruntime as ort
                from kokoro_onnx import Kokoro
                options = ort.SessionOptions()
                options.intra_op_num_threads = 2
                options.inter_op_num_threads = 1
                session = ort.InferenceSession(str(models/'kokoro-v1.0.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
                synth = Kokoro.from_session(session, str(models/'voices-v1.0.bin'))
            wave, sr = synth.create(text, voice=speaker, speed=speed, lang=lang)
            active = np.flatnonzero(np.abs(wave) > .002)
            if not len(active):
                raise ValueError(f'Silent line {i+1}')
            sf.write(take, wave[max(0,active[0]-800):active[-1]+1600], sr)
        wave, sr = sf.read(take)
        if wave.ndim > 1:
            wave = wave.mean(axis=1)
        div = gcd(RATE, sr)
        wave = resample_poly(wave, RATE//div, sr//div)
        start = round(line['at']*RATE)
        end = start + len(wave)
        if end > length or (i+1 < len(book['lines']) and end > book['lines'][i+1]['at']*RATE):
            raise ValueError(f'Line {i+1} ends at {end/RATE:.2f}s. Leave more room.')
        voice[start:end] += wave[:,None]*.83
        lo, hi = max(0,start-8000), min(length,end+15000)
        t = np.arange(lo,hi)
        duck[lo:hi] = np.minimum(duck[lo:hi], 1-.42*np.minimum(np.clip((t-lo)/8000,0,1), np.clip((hi-t)/15000,0,1)))
        receipts.append(dict(text=text, at=start/RATE, end=end/RATE, wav=str(take.relative_to(ROOT)), sha256=hashlib.sha256(take.read_bytes()).hexdigest()))
    rng = np.random.default_rng(174)
    for event in book.get('events',[]):
        n = round(event.get('duration',.38)*RATE)
        t = np.arange(n)/n
        noise = rng.normal(0,1,n)
        brush = np.convolve(noise, np.ones(7)/7, 'same') * np.sin(t*np.pi)**1.5
        start = round(event['at']*RATE)
        count = min(n, length-start)
        if count > 0:
            foley[start:start+count] += (brush[:count]*event.get('gain',.04))[:,None]
    music *= duck[:,None]*book.get('music_gain',.43)
    total = music + voice + foley
    gain = min(1.35,.88/max(.001,np.max(np.abs(total))))
    for name, track in [('mix',total),('voice',voice),('score',music),('paper',foley)]:
        sf.write(dest/(name+'.wav'),track*gain,RATE,subtype='PCM_24')
    (dest/'takes.json').write_text(json.dumps(receipts,indent=2))
    print([(r['text'][:16],round(r['end']-r['at'],2)) for r in receipts])

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--models',type=Path)
    mix(parser.parse_args().models)
