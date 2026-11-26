"""Render authored pictures and retain their synchronized English mix."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('media/film.mp4'))
    parser.add_argument('--start', type=int, default=0, help='First frame of an optional motion preview')
    parser.add_argument('--end', type=int, help='Exclusive final frame of an optional motion preview')
    parser.add_argument('--scale', type=float, choices=[1, 1.5], default=1)
    parser.add_argument('--crf', type=int, default=16)
    args = parser.parse_args()
    config = json.loads((ROOT/'content/narration.json').read_text())
    last = args.end if args.end is not None else round(config['duration']*24)
    if not 0 <= args.start < last <= round(config['duration']*24):
        parser.error('Choose a valid half-open frame range.')
    out = args.output.resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    staging = out.with_name(out.stem+'-in-progress.mp4')
    subprocess.run([sys.executable, str(ROOT/'scripts/voice.py')], check=True, cwd=ROOT)
    subprocess.run([sys.executable, str(ROOT/'scripts/mix.py')], check=True, cwd=ROOT)
    env = dict(os.environ, PAPERCUT_SCALE=str(args.scale))
    width, height = (int(x*args.scale) for x in (1280, 720))
    command = [sys.executable, str(ROOT/'scripts/ffmpeg_serial.py'), '--',
               '-hide_banner', '-loglevel', 'warning', '-nostdin', '-y',
               '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s:v', f'{width}x{height}', '-r', '24',
               '-i', 'pipe:0', '-ss', str(args.start/24), '-i', str(ROOT/'audio/mix.wav'),
               '-map', '0:v:0', '-map', '1:a:0', '-t', str((last-args.start)/24),
               '-c:v', 'libx264', '-threads', '5', '-preset', 'fast', '-crf', str(args.crf),
               '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709',
               '-color_trc', 'bt709', '-vf', 'scale=out_color_matrix=bt709', '-af',
               'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k',
               '-movflags', '+faststart', str(staging)]
    with subprocess.Popen(['node', str(ROOT/'scripts/render.mjs'), 'raw', str(args.start), str(last)],
                          cwd=ROOT, env=env, stdout=subprocess.PIPE) as picture:
        try:
            subprocess.run(command, cwd=ROOT, stdin=picture.stdout, check=True)
        finally:
            picture.stdout.close()
        if picture.wait():
            raise RuntimeError('The picture renderer stopped before delivery.')
    staging.replace(out)
    print(out)


if __name__ == '__main__':
    run()
