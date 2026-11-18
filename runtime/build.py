#!/usr/bin/env python3
"""Build a frame-locked film with imported audio; no provider dependency."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import importlib.util
import shutil

ROOT = Path(__file__).resolve().parents[2]


def run(argv, **kwargs):
    return subprocess.run([str(x) for x in argv], check=True, **kwargs)


def sha(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def probe(file):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format',
                           '-of', 'json', file], capture_output=True, text=True).stdout)


def validate(plan):
    for key in ['width', 'height', 'fps', 'duration_frames']:
        if type(plan.get(key)) is not int or plan[key] <= 0:
            raise ValueError(f'Positive integer required: {key}')
    if plan['width'] % 2 or plan['height'] % 2:
        raise ValueError('H.264 dimensions must be even')
    if not isinstance(plan.get('shots'), list) or not plan['shots']:
        raise ValueError('Author shots in content/production.json; --proof is diagnostic only')
    cursor, ids = 0, set()
    for shot in plan['shots']:
        if (not shot.get('id') or shot['id'] in ids or shot['start'] != cursor
                or type(shot['start']) is not int
                or type(shot['end']) is not int or shot['end'] <= cursor):
            raise ValueError('Shots need unique IDs and contiguous integer frame intervals')
        cursor = shot['end']; ids.add(shot['id'])
    if cursor != plan['duration_frames']:
        raise ValueError('Shots do not cover the complete duration')
    last = 0
    for cue in plan.get('captions', []):
        if (not cue.get('text') or any(type(cue[k]) is not int for k in ['start', 'end'])
                or cue['start'] < last or cue['end'] <= cue['start'] or cue['end'] > cursor):
            raise ValueError('Invalid caption interval')
        last = cue['end']


def audio_inputs(plan):
    records = []
    if not plan.get('audio') and plan.get('silent') is not True:
        raise ValueError('Import accepted audio or explicitly set silent: true')
    for item in plan.get('audio', []):
        file = (ROOT / item['file']).resolve()
        if (Path(item['file']).is_absolute() or ROOT not in file.parents
                or not file.is_file() or sha(file) != item.get('sha256')):
            raise ValueError(f'Missing, changed or nonlocal audio: {item["file"]}')
        if (any(type(item[k]) is not int for k in ['start', 'end']) or item['start'] < 0
                or item['end'] <= item['start'] or item['end'] > plan['duration_frames']
                or item['role'] not in ['voice', 'music', 'effect']):
            raise ValueError('Invalid audio interval or role')
        info = probe(file)
        if not any(s['codec_type'] == 'audio' for s in info['streams']):
            raise ValueError(f'No audio stream: {file}')
        duration = float(info['format']['duration'])
        if duration > (item['end']-item['start'])/plan['fps'] + 1/48000:
            raise ValueError(f'Recording exceeds its interval; retime the shot: {file}')
        gain = item.get('gain', 1)
        if not isinstance(gain, (int, float)) or not 0 <= gain <= 4:
            raise ValueError('Audio gain must be finite and between 0 and 4')
        records.append((item, file))
    return records


def timestamp(frame, fps, separator='.'):
    ms = round(frame * 1000 / fps)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{separator}{ms%1000:03}'


def caption_files(plan, base):
    vtt, srt = ['WEBVTT\n'], []
    for i, cue in enumerate(plan.get('captions', []), 1):
        body = str(cue['text']).replace('-->', '→')
        for out, separator in [(vtt, '.'), (srt, ',')]:
            out.append(f'{i}\n{timestamp(cue["start"],plan["fps"],separator)} --> '
                       f'{timestamp(cue["end"],plan["fps"],separator)}\n{body}\n')
    base.with_suffix('.vtt').write_text('\n'.join(vtt))
    base.with_suffix('.srt').write_text('\n'.join(srt))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--proof', action='store_true')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--start', type=int, default=0, help='First source frame, inclusive')
    parser.add_argument('--end', type=int, help='Last source frame, exclusive')
    parser.add_argument('--width', type=int, help='Even output width; keeps authored coordinates')
    parser.add_argument('--preview', action='store_true', help='Render up to 8 seconds at 640px width')
    parser.add_argument('--doctor', action='store_true', help='Check tools and diagnostic assets without rendering')
    args = parser.parse_args()
    profile = json.loads((ROOT/'style-profile.json').read_text())
    plan = json.loads((ROOT/'content/production.json').read_text())
    if args.doctor:
        missing = [x for x in ['node', 'npm', 'ffmpeg', 'ffprobe'] if not shutil.which(x)]
        if missing:
            raise ValueError('Install required tools: '+', '.join(missing))
        run(['node', ROOT/'scripts/render.mjs', '--proof', '--check'], cwd=ROOT)
        print('Node, npm, FFmpeg, FFprobe, renderer imports, fonts and material assets available.')
        return
    if args.proof:
        plan = dict(width=profile['width'], height=profile['height'], fps=24,
                    duration_frames=48, silent=True, audio=[], captions=[],
                    shots=[dict(id='material-proof', start=0, end=48)])
    validate(plan)
    audio = audio_inputs(plan)
    start = args.start
    end = args.end if args.end is not None else min(plan['duration_frames'], start+8*plan['fps']) if args.preview else plan['duration_frames']
    if not 0 <= start < end <= plan['duration_frames']:
        raise ValueError('Require 0 <= start < end <= duration_frames')
    width = args.width or (640 if args.preview else plan['width'])
    height = round(width*plan['height']/plan['width']/2)*2
    if width < 2 or width % 2 or height < 2:
        raise ValueError('Output width must be positive and even')
    if args.check:
        run(['node', ROOT/'scripts/render.mjs', '--check'] + (['--proof'] if args.proof else []), cwd=ROOT)
        print('Timeline and audio inputs valid; this does not validate visual content.')
        return
    out = (ROOT / (args.out or ('media/proof.mp4' if args.proof else 'media/preview.mp4' if args.preview else 'media/film.mp4'))).resolve()
    for file in [out, out.with_suffix('.json'), out.with_suffix('.srt'), out.with_suffix('.vtt')]:
        if file.exists():
            raise FileExistsError(f'Existing output preserved: {file}')
    out.parent.mkdir(parents=True, exist_ok=True)
    gate = ROOT/'tools/frame_review/ffmpeg_gate.py'
    duration = (end-start)/plan['fps']
    full_duration = plan['duration_frames']/plan['fps']
    finish_record = None
    finish_filter = 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p'
    finish_args = []
    if (ROOT/'lib/finishing.py').is_file():
        spec = importlib.util.spec_from_file_location('style_finish', ROOT/'lib/finishing.py')
        module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        finish_filter, finish_args, finish_record = module.encoding_finish(ROOT/'content/finishing.json')
    with tempfile.TemporaryDirectory(prefix='film-frames-') as temporary:
        temp = Path(temporary)
        run(['node', ROOT/'scripts/render.mjs', '--out', temp/'frames', '--start', start, '--end', end,
             '--width', width] + (['--proof'] if args.proof else []), cwd=ROOT)
        command = [sys.executable, gate, '-hide_banner', '-loglevel', 'error', '-n',
                   '-framerate', plan['fps'], '-i', temp/'frames/%06d.png']
        mix_command = [sys.executable, gate, '-hide_banner', '-loglevel', 'error', '-n']
        filters, buses = [], {'voice': [], 'music': [], 'effect': []}
        for i, (item, file) in enumerate(audio, 1):
            mix_command += ['-i', file]
            samples = round(item['start']*48000/plan['fps'])
            filters.append(f'[{i-1}:a]aresample=48000,aformat=channel_layouts=stereo,'
                           f'volume={item.get("gain",1)},adelay={samples}S:all=1[a{i}]')
            buses[item['role']].append(f'[a{i}]')
        final_buses = []
        for role, inputs in buses.items():
            if inputs:
                filters.append(''.join(inputs)+f'amix=inputs={len(inputs)}:normalize=0,'
                               f'apad,atrim=duration={full_duration}[{role}]')
                final_buses.append(f'[{role}]')
        if buses['voice'] and buses['music']:
            filters += ['[voice]asplit[voiceout][sidechain]',
                        '[music][sidechain]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=250[ducked]']
            final_buses = ['[voiceout]', '[ducked]'] + (['[effect]'] if buses['effect'] else [])
        if filters:
            filters.append(''.join(final_buses)+f'amix=inputs={len(final_buses)}:normalize=0,'
                           'alimiter=limit=0.891:level=false:latency=true,'
                           f'atrim=start={start/plan["fps"]}:end={end/plan["fps"]},asetpts=PTS-STARTPTS[mix]')
            # Finish the complete sound graph before video encoding. Combining a
            # delayed effect with a bounded video output can terminate input
            # scheduling early even when a padded audio stream has full duration.
            run(mix_command + ['-filter_complex', ';'.join(filters), '-map', '[mix]',
                               '-c:a', 'pcm_s16le', temp/'mix.wav'])
            command += ['-i', temp/'mix.wav', '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k']
        else:
            command += ['-an']
        command += ['-vf', finish_filter,
                    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-threads', '2', '-frames:v', end-start,
                    '-t', duration, '-colorspace', 'bt709', '-color_trc', 'bt709', '-color_primaries', 'bt709',
                    '-color_range', 'tv', '-movflags', '+faststart', *finish_args, temp/'film.mp4']
        run(command)
        run([sys.executable, gate, '-v', 'error', '-xerror', '-i', temp/'film.mp4', '-f', 'null', '-'])
        info = probe(temp/'film.mp4')
        video = next(s for s in info['streams'] if s['codec_type']=='video')
        if (int(video['nb_frames']) != end-start or video['width'] != width
                or video['height'] != height or video['r_frame_rate'] != f'{plan["fps"]}/1'):
            raise ValueError('Encoded video does not match the frame contract')
        if audio:
            sound = next(s for s in info['streams'] if s['codec_type']=='audio')
            if abs(float(sound['duration'])-duration) > 1/plan['fps']:
                raise ValueError('Audio/video duration mismatch')
        # Copy exclusively; a concurrent build cannot overwrite the winner.
        with out.open('xb') as target, (temp/'film.mp4').open('rb') as source:
            shutil.copyfileobj(source, target)
    captions = [{**c, 'start':max(start,c['start'])-start, 'end':min(end,c['end'])-start}
                for c in plan.get('captions', []) if c['start'] < end and c['end'] > start]
    caption_files({**plan, 'captions':captions}, out)
    report = {'diagnostic': args.proof or plan.get('diagnostic', False), 'sha256': sha(out), 'frames': end-start,
              'source_range': [start,end], 'output_size':[width,height],
              'full_decode': True, 'visual_review': 'not performed', 'motion_review': 'not performed',
              'listening_review': 'not performed', 'audio': [item for item, _ in audio],
              'production_sha256': sha(ROOT/'content/production.json'), 'streams': info['streams'],
              'finishing': finish_record,
              'source_hashes': {str(p.relative_to(ROOT)): sha(p)
                                for folder in ['src', 'lib', 'engine', 'fonts', 'materials', 'tools/runtime']
                                for p in sorted((ROOT/folder).rglob('*'))
                                if p.is_file() and '__pycache__' not in p.parts},
              'tools': {tool: run([tool, '-version' if tool=='ffmpeg' else '--version'],
                                  capture_output=True, text=True).stdout.splitlines()[0]
                        for tool in ['node', 'ffmpeg']}}
    out.with_suffix('.json').write_text(json.dumps(report, indent=2)+'\n')
    print(out)


if __name__ == '__main__':
    main()
