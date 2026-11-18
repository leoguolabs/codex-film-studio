#!/usr/bin/env python3
"""Restore the visual reference library from hash-identified source videos.

Requires Python 3, Pillow, ffprobe and ffmpeg. Does not create review approvals.
Sources and timings come from index.json; pass local source paths explicitly.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

from PIL import Image, ImageDraw, ImageOps


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def running_ffmpeg():
    result = subprocess.check_output(['ps', '-axo', 'pid=,comm='], text=True)
    return [row.strip() for row in result.splitlines()
            if len(row.split(None, 1)) == 2
            and Path(row.split(None, 1)[1]).name == 'ffmpeg']


def read_exact(stream, count):
    chunks, remaining = [], count
    while remaining:
        chunk = stream.read(remaining)
        if not chunk:
            break
        chunks.append(chunk)
        remaining -= len(chunk)
    return b''.join(chunks)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index', type=Path, default=Path(__file__).with_name('index.json'))
    parser.add_argument('--source', action='append', required=True, help='ID=/absolute/video.mp4')
    parser.add_argument('--output', type=Path, required=True, help='Fresh output directory')
    parser.add_argument('--lock', type=Path, default=Path(os.environ.get('FILM_FFMPEG_LOCK', '/tmp/codex-film-ffmpeg.lock')))
    args = parser.parse_args()
    supplied = dict(item.split('=', 1) for item in args.source)
    index = json.loads(args.index.read_text())
    known = {source['id']: source for source in index['sources']}
    if set(supplied) - set(known):
        raise SystemExit('Unknown source IDs: ' + str(set(supplied) - set(known)))
    if args.output.exists():
        raise SystemExit('Output already exists; choose a fresh folder')
    # Verify every requested source before writing or launching any decoder.
    for key, path in supplied.items():
        if sha256(path) != known[key]['sha256']:
            raise SystemExit(f'{key}: source SHA-256 mismatch')
    args.output.mkdir(parents=True)
    inventory = {'schema': 1, 'index_sha256': sha256(args.index), 'files': [],
                 'review_status': 'extracted_only; actual viewing must be recorded separately'}
    for key, source_path in supplied.items():
        source = known[key]
        frames = sorted(set(source['keyframes']))
        probe = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_streams', '-of', 'json', source_path]))['streams'][0]
        width, height = probe['width'], probe['height']
        if [width, height] != source['dimensions']:
            raise SystemExit(f'{key}: unexpected source dimensions')
        if frames[0] < 0 or frames[-1] >= source['frame_count']:
            raise SystemExit(f'{key}: frame selection out of bounds')
        matrix = {'bt709': 'bt709', 'bt470bg': 'bt601', 'smpte170m': 'bt601'}[probe['color_space']]
        source_range = {'tv': 'tv', 'pc': 'pc'}[probe['color_range']]
        # A flat sum of hundreds of terms exceeds libavutil's parser depth.
        def balanced_sum(items):
            if len(items) == 1:
                return items[0]
            middle = len(items) // 2
            return '(' + balanced_sum(items[:middle]) + '+' + balanced_sum(items[middle:]) + ')'
        select = balanced_sum([f'eq(n\\,{frame})' for frame in frames])
        vf = (f'select={select},scale=iw:ih:in_color_matrix={matrix}:'
              f'out_color_matrix={matrix}:in_range={source_range}:out_range=pc,format=rgb24')
        cmd = ['ffmpeg', '-hide_banner', '-v', 'error', '-threads', '2', '-i', source_path,
               '-map', '0:v:0', '-vf', vf, '-fps_mode', 'passthrough', '-f', 'rawvideo', '-']
        target = args.output / key
        target.mkdir()
        with args.lock.open('a+') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            while busy := running_ffmpeg():
                print('Waiting for other FFmpeg:', busy, flush=True)
                time.sleep(3)
            print(f'FFmpeg check clear; extracting {key}: {len(frames)} original-size frames', flush=True)
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
            try:
                for frame in frames:
                    data = read_exact(process.stdout, width * height * 3)
                    if len(data) != width * height * 3:
                        raise RuntimeError(f'{key}: missing or partial frame {frame}')
                    image = Image.frombytes('RGB', (width, height), data)
                    out = target / f'{frame:06d}.jpg'
                    image.save(out, quality=94, subsampling=0)
                    inventory['files'].append({'source': key, 'frame': frame,
                        'seconds': frame / source['fps'], 'path': str(out.relative_to(args.output)),
                        'dimensions': [width, height], 'sha256': sha256(out)})
                if process.stdout.read(1):
                    raise RuntimeError(f'{key}: decoder returned unexpected extra frame data')
                if process.wait() != 0:
                    raise RuntimeError(f'{key}: decoder failed')
            finally:
                if process.poll() is None:
                    process.terminate()  # Own decoder only; never another session's process.
                    process.wait()
        # Browsable overview; the individual JPEGs retain original dimensions.
        for page_start in range(0, len(frames), 12):
            group = frames[page_start:page_start + 12]
            sheet = Image.new('RGB', (1440, 904), '#f4ead5')
            pen = ImageDraw.Draw(sheet)
            for number, frame in enumerate(group):
                x, y = number % 3 * 480, number // 3 * 226
                with Image.open(target / f'{frame:06d}.jpg') as image:
                    thumb = ImageOps.contain(image, (362, 204), Image.Resampling.LANCZOS)
                    sheet.paste(thumb, (x + (480 - thumb.width) // 2, y))
                pen.text((x + 60, y + 207), f'{key} | frame {frame} | {frame / source["fps"]:.3f}s', fill='#2b2420')
            out = target / f'overview-{page_start // 12:02d}.jpg'
            sheet.save(out, quality=92, subsampling=0)
            inventory['files'].append({'source': key, 'frames': group,
                'path': str(out.relative_to(args.output)), 'sha256': sha256(out),
                'dimensions': [1440, 904], 'tile_dimensions': [362, 204]})
        print(f'{key}: extraction complete', flush=True)
    (args.output / 'files.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
