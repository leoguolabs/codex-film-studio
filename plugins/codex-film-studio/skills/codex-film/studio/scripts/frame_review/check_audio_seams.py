"""Report waveform evidence around picture cuts; never certify audible continuity."""
import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf


def db_rms(a):
    return float(20 * np.log10(max(1e-12, np.sqrt(np.mean(a.astype(np.float64) ** 2)))))


def audit(wav, timeline, score=None, clip_dir=None):
    data, rate = sf.read(wav, dtype='float32', always_2d=True)
    fps = timeline['fps']
    rows = []
    for scene in timeline['scenes'][1:]:
        frame = scene['start']
        at = round(frame / fps * rate)
        before = data[max(0, at - rate):at]
        after = data[at:min(len(data), at + rate)]
        if not len(before) or not len(after):
            raise ValueError('Scene boundary falls outside the audio')
        window = data[max(0, at - rate * 2):min(len(data), at + rate * 2)]
        short = data[max(0, at - rate // 20):min(len(data), at + rate // 20)]
        row = {'frame': frame, 'time_seconds': frame / fps,
               'rms_before_dbfs': db_rms(before), 'rms_after_dbfs': db_rms(after),
               'rms_delta_db': db_rms(after) - db_rms(before),
               'cut_window_rms_dbfs': db_rms(short),
               'boundary_sample_step': float(np.max(abs(data[at] - data[at - 1]))),
               'local_step_p999': float(np.quantile(abs(np.diff(window, axis=0)), .999))}
        if score is not None:
            t = frame / fps
            row['notes_spanning_boundary'] = sum(n['start'] < t < n['start'] + n['duration'] for n in score['notes'])
        if clip_dir:
            path = clip_dir / f'cut-{frame:07d}.wav'
            sf.write(path, window, rate, subtype='PCM_24')
            row['audition_clip'] = str(path)
        rows.append(row)
    return {'sample_rate': rate, 'samples': len(data), 'cuts': rows,
            'interpretation': 'Waveform diagnostics and audition windows only; level changes can be intentional. Musical and perceived continuity require listening.',
            'auditory_listening_performed': False}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--wav', type=Path, required=True)
    p.add_argument('--timeline', type=Path, required=True)
    p.add_argument('--score', type=Path)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--clips', type=Path)
    args = p.parse_args()
    if args.clips:
        args.clips.mkdir(parents=True, exist_ok=True)
    result = audit(args.wav, json.loads(args.timeline.read_text()),
                   json.loads(args.score.read_text()) if args.score else None, args.clips)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2))
    print(f"Recorded {len(result['cuts'])} cut windows")


if __name__ == '__main__':
    main()
