#!/usr/bin/env python3
"""Decode all frames; produce evidence, never automatic visual acceptance."""
import argparse
import hashlib
import json
from pathlib import Path
import av
import numpy as np
from PIL import Image, ImageDraw

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--sheets', action='store_true')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    previous = None
    count = 0
    first_time = None
    max_error = 0.0
    with av.open(str(args.video)) as container, (args.output / 'frames.jsonl').open('w') as ledger:
        stream = container.streams.video[0]
        fps = float(stream.average_rate)
        for index, frame in enumerate(container.decode(video=0)):
            thumb = frame.to_image().resize((320, 180), Image.Resampling.LANCZOS)
            rgb = np.asarray(thumb)
            current_time = float(frame.time) if frame.time is not None else None
            if first_time is None and current_time is not None:
                first_time = current_time
            error = None if current_time is None else abs(current_time - first_time - index / fps)
            if error is not None:
                max_error = max(max_error, error)
            delta = None if previous is None else float(np.abs(rgb.astype(float) - previous).mean())
            ledger.write(json.dumps({'frame': index, 'pts': frame.pts, 'seconds': current_time,
                'cadence_error_seconds': error, 'mean_rgb': rgb.mean((0, 1)).tolist(),
                'mean_absolute_frame_delta': delta, 'thumbnail_sha256': hashlib.sha256(rgb.tobytes()).hexdigest()}) + '\n')
            previous = rgb.astype(float)
            if args.sheets:
                slot = index % 48
                if slot == 0:
                    sheet = Image.new('RGB', (1920, 1640), '#d7dde1')
                    draw = ImageDraw.Draw(sheet)
                x, y = slot % 6 * 320, slot // 6 * 205
                sheet.paste(thumb, (x, y + 25))
                draw.text((x + 5, y + 5), f'#{index}   {current_time}', fill='#17212a')
                if slot == 47:
                    sheet.save(args.output / f'consecutive-{index // 48:04d}.jpg', quality=92)
            count = index + 1
        if args.sheets and count % 48:
            sheet.save(args.output / f'consecutive-{(count - 1) // 48:04d}.jpg', quality=92)
        if not count:
            raise ValueError('The source yielded no video frames.')
        report = {'source': str(args.video.resolve()), 'decoded_frames': count, 'fps': fps,
            'width': stream.width, 'height': stream.height, 'maximum_cadence_error_seconds': max_error,
            'visual_inspection': 'not performed by this utility', 'audio_listening': 'not performed by this utility'}
    (args.output / 'coverage.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))

if __name__ == '__main__':
    main()
