#!/usr/bin/env python3
"""Generate reusable Edge TTS narration and bind WAVs to a film's frame clock."""
import argparse
import asyncio
from contextlib import contextmanager
import fcntl
import hashlib
import importlib.metadata
import importlib.util
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile
import wave

DEFAULTS = dict(voice='en-US-AvaNeural', rate='+12%', volume='+0%', pitch='+0Hz')
PROVIDER = 'Microsoft Edge online TTS (third-party edge-tts client)'


def digest(data):
    if not isinstance(data, bytes):
        data = json.dumps(data, sort_keys=True, ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(data).hexdigest()


def sha(path):
    return digest(path.read_bytes())


def save(path, value):
    """Atomic JSON replacement, under the caller's output/project lock."""
    with tempfile.NamedTemporaryFile('w', dir=path.parent, encoding='utf-8',
                                     delete=False) as stream:
        temporary = Path(stream.name)
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    try:
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def writer_lock(directory):
    with (directory / '.edge-voice.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError(f'Another voice writer is active in {directory}')
        yield


def read_narration(path, overrides=None):
    value = json.loads(path.read_text(encoding='utf-8'))
    # Existing whiteboard narration arrays can be consumed without rewriting them.
    if isinstance(value, list):
        value = {'schema_version': 1, 'lines': value}
    if not isinstance(value, dict) or value.get('schema_version', 1) != 1:
        raise ValueError('Expected narration schema_version 1')
    config = {k: value.get(k, v) for k, v in DEFAULTS.items()}
    config.update({k: v for k, v in (overrides or {}).items() if v is not None})
    if not isinstance(config['voice'], str) or not re.fullmatch(r'[\w-]+', config['voice']):
        raise ValueError('Invalid voice name; use the voices command')
    for key, pattern in [('rate', r'[+-]\d+%'), ('volume', r'[+-]\d+%'),
                         ('pitch', r'[+-]\d+Hz')]:
        if not isinstance(config[key], str) or not re.fullmatch(pattern, config[key]):
            raise ValueError(f'Invalid {key}; use a signed value such as {DEFAULTS[key]}')
    lines = value.get('lines')
    if not isinstance(lines, list) or not lines:
        raise ValueError('Author at least one narration line before synthesis')
    ids = set()
    for row in lines:
        if (not isinstance(row, dict) or not isinstance(row.get('id'), str)
                or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', row['id'])
                or row['id'] in ids):
            raise ValueError('Narration IDs must be unique, safe filenames (1–64 characters)')
        if not isinstance(row.get('text'), str) or not row['text'].strip():
            raise ValueError(f'Empty narration: {row["id"]}')
        if len(row['text']) > 5000:
            raise ValueError(f'Split {row["id"]} into smaller lines (at most 5000 characters)')
        ids.add(row['id'])
    return config, [{'id': r['id'], 'text': r['text']} for r in lines]


def local_file(root, relative):
    if not isinstance(relative, str) or Path(relative).is_absolute():
        raise ValueError('Audio paths must be relative')
    result = (root / relative).resolve()
    if root.resolve() not in result.parents or not result.is_file():
        raise ValueError(f'Missing or nonlocal audio artifact: {relative}')
    return result


def wav_info(path):
    with wave.open(str(path), 'rb') as wav:
        if (wav.getnchannels() != 1 or wav.getsampwidth() != 2
                or wav.getcomptype() != 'NONE' or wav.getnframes() <= 0):
            raise ValueError(f'Expected nonempty mono PCM16 WAV: {path}')
        return {'samples': wav.getnframes(), 'sample_rate': wav.getframerate(),
                'duration_seconds': wav.getnframes() / wav.getframerate()}


def verify_record(root, record):
    if digest(record['text'].encode('utf-8')) != record.get('text_sha256'):
        raise ValueError('Narration text no longer matches its audio receipt')
    identity = digest({'schema_version': 1, 'provider': record['provider'],
                       'client_version': record['client_version'],
                       'settings': record['settings'], 'text': record['text']})
    if identity != record.get('identity'):
        raise ValueError('Narration settings no longer match the audio receipt')
    for item in record['artifacts'].values():
        path = local_file(root, item['file'])
        if sha(path) != item['sha256']:
            raise ValueError(f'Changed audio artifact: {path}; use a new output directory')
    info = wav_info(local_file(root, record['artifacts']['wav']['file']))
    if any(info[k] != record[k] for k in info):
        raise ValueError('WAV duration no longer matches the receipt')
    return info


def ffmpeg(args):
    # Works both in library scripts/tts and in copied project tools/tts.
    gate = Path(__file__).resolve().parents[1] / 'frame_review/ffmpeg_gate.py'
    spec = importlib.util.spec_from_file_location('film_ffmpeg_gate', gate)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.run(args, capture_output=True)


def timestamp(seconds, separator='.'):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}{separator}{ms%1000:03}'


async def generate_line(client, root, row, config, version):
    identity = digest({'schema_version': 1, 'provider': PROVIDER,
                       'client_version': version, 'settings': config, 'text': row['text']})
    prefix = f'{row["id"]}-{identity[:16]}'
    receipt = root / 'clips' / f'{prefix}.json'
    if receipt.exists():
        record = json.loads(receipt.read_text())
        if record.get('identity') != identity or record.get('text') != row['text']:
            raise ValueError('Cached narration receipt differs from the request')
        verify_record(root, record)
        print(f'{row["id"]}: reused {record["duration_seconds"]:.3f}s', flush=True)
        return record
    extensions = ['mp3', 'wav', 'timing.json', 'vtt', 'srt']
    if any((root / 'clips' / f'{prefix}.{ext}').exists() for ext in extensions):
        raise ValueError(f'Incomplete prior output for {row["id"]}; use a new output directory')
    # No manifest entry is published until synthesis, decoding and all hashes succeed.
    with tempfile.TemporaryDirectory(dir=root, prefix='.synthesis-') as temporary:
        stage = Path(temporary)
        for attempt in range(3):
            words = []
            try:
                communicate = client.Communicate(row['text'], **config, boundary='WordBoundary')
                with (stage / 'voice.mp3').open('wb') as audio:
                    async for chunk in communicate.stream():
                        if chunk['type'] == 'audio':
                            audio.write(chunk['data'])
                        elif chunk['type'] == 'WordBoundary':
                            words.append({'text': chunk['text'],
                                          'start_seconds': chunk['offset'] / 10_000_000,
                                          'end_seconds': (chunk['offset'] + chunk['duration']) / 10_000_000})
                if not (stage / 'voice.mp3').stat().st_size:
                    raise ValueError('Empty TTS response')
                break
            except Exception as exc:
                if attempt == 2:
                    raise RuntimeError(f'Edge TTS failed for {row["id"]} ({type(exc).__name__}); '
                                       'check network/service access and retry') from None
                await asyncio.sleep(2 * (attempt + 1))
        ffmpeg(['-hide_banner', '-loglevel', 'error', '-n', '-i', str(stage / 'voice.mp3'),
                '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', str(stage / 'voice.wav')])
        info = wav_info(stage / 'voice.wav')
        save(stage / 'voice.timing.json', {'source': 'provider-word-boundaries',
                                          'independent_alignment': False, 'words': words})
        text = row['text'].replace('-->', '→')
        for ext, sep in [('vtt', '.'), ('srt', ',')]:
            body = (('WEBVTT\n\n' if ext == 'vtt' else '') + '1\n' +
                    f'{timestamp(0, sep)} --> {timestamp(info["duration_seconds"], sep)}\n{text}\n')
            (stage / f'voice.{ext}').write_text(body, encoding='utf-8')
        artifacts = {}
        for ext in extensions:
            target = root / 'clips' / f'{prefix}.{ext}'
            shutil.move(str(stage / f'voice.{ext}'), target)
            artifacts[ext.split('.')[0]] = {'file': str(target.relative_to(root)), 'sha256': sha(target)}
        record = {**row, 'identity': identity, 'text_sha256': digest(row['text'].encode('utf-8')),
                  'provider': PROVIDER, 'client_version': version, 'settings': config,
                  **info, 'artifacts': artifacts}
        save(receipt, record)
    print(f'{row["id"]}: generated {info["duration_seconds"]:.3f}s', flush=True)
    return record


async def synthesize(args):
    config, lines = read_narration(args.input, {k: getattr(args, k) for k in DEFAULTS})
    try:
        import edge_tts
        version = importlib.metadata.version('edge-tts')
    except ImportError:
        raise ValueError(f'Install the optional dependency: python -m pip install -r '
                         f'{Path(__file__).with_name("requirements.txt")}')
    if not shutil.which('ffmpeg'):
        raise ValueError('FFmpeg is required for PCM WAV export')
    root = args.output.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    with writer_lock(root):
        (root / 'clips').mkdir(exist_ok=True)
        records = []
        for row in lines:
            records.append(await generate_line(edge_tts, root, row, config, version))
        manifest = {'schema_version': 1, 'provider': PROVIDER, 'settings': config,
                    'input_sha256': sha(args.input), 'lines': records,
                    'timing_source': 'provider-word-boundaries', 'independent_alignment': False}
        save(root / 'manifest.json', manifest)
    print(root / 'manifest.json')


def bind_plan(plan, manifest, starts, manifest_dir, project):
    """Return runtime-compatible audio/captions without shortening or stretching voice."""
    fps, limit = plan.get('fps'), plan.get('duration_frames')
    if type(fps) is not int or fps <= 0 or type(limit) is not int or limit <= 0:
        raise ValueError('Author the production FPS and duration first')
    rows = manifest['lines']
    if not isinstance(rows, list) or not rows or not isinstance(starts, dict):
        raise ValueError('Manifest needs voice lines and schedule needs an ID → frame object')
    ids = [row['id'] for row in rows]
    if len(set(ids)) != len(ids) or set(starts) != set(ids):
        raise ValueError('Schedule must give one start frame for every narration ID')
    audio, captions = [], []
    for row in rows:
        info = verify_record(manifest_dir, row)
        start = starts[row['id']]
        if type(start) is not int or start < 0:
            raise ValueError(f'Invalid integer start frame: {row["id"]}')
        end = start + (info['samples'] * fps + info['sample_rate'] - 1) // info['sample_rate']
        if end > limit:
            raise ValueError(f'{row["id"]} exceeds the film; lengthen its shot/timeline')
        file = local_file(manifest_dir, row['artifacts']['wav']['file'])
        try:
            relative = file.relative_to(project.resolve()).as_posix()
        except ValueError:
            raise ValueError('Keep generated voice artifacts inside the production project')
        audio.append({'file': relative, 'sha256': row['artifacts']['wav']['sha256'],
                      'start': start, 'end': end, 'role': 'voice', 'gain': 1})
        captions.append({'text': row['text'], 'start': start, 'end': end})
    captions.sort(key=lambda row: row['start'])
    if any(a['end'] > b['start'] for a, b in zip(captions, captions[1:])):
        raise ValueError('Narration overlaps; move the scheduled starts')
    return audio, captions


def bind(args):
    project = args.project.expanduser().resolve()
    plan_path = project / 'content/production.json'
    manifest_path = args.manifest.resolve()
    schedule = json.loads(args.schedule.read_text(encoding='utf-8'))
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    with writer_lock(project):
        before = plan_path.read_bytes()
        plan = json.loads(before)
        if (plan.get('captions') or any(a.get('role') == 'voice' for a in plan.get('audio', []))) and not args.replace_voice:
            raise ValueError('Existing voice/captions preserved; use --replace-voice for a deliberate replacement')
        audio, captions = bind_plan(plan, manifest, schedule, manifest_path.parent, project)
        plan['audio'] = [a for a in plan.get('audio', []) if a.get('role') != 'voice'] + audio
        plan['captions'] = captions
        plan['silent'] = False
        plan['tts_binding'] = {'provider': manifest['provider'], 'manifest_sha256': sha(manifest_path),
                               'schedule_sha256': sha(args.schedule),
                               'timing_source': 'measured-wav-duration; authored-start-frames',
                               'independent_alignment': False}
        if args.apply:
            backup = plan_path.with_name(f'production-before-voice-{digest(before)[:16]}.json')
            if not backup.exists():
                backup.write_bytes(before)
            if plan_path.read_bytes() != before:
                raise ValueError('Production changed during binding; retry after the other writer finishes')
            save(plan_path, plan)
            print(f'Bound {len(audio)} voice clips; previous plan: {backup}')
        else:
            print(json.dumps(plan, ensure_ascii=False, indent=2))


async def voices(locale):
    try:
        import edge_tts
    except ImportError:
        raise ValueError(f'Install edge-tts using {Path(__file__).with_name("requirements.txt")}')
    for voice in await edge_tts.list_voices():
        if not locale or voice['Locale'].lower().startswith(locale.lower()):
            print(f'{voice["ShortName"]}\t{voice["Gender"]}\t{voice["Locale"]}')


def export_wavs(args):
    """Bridge to style-specific importers that require ID.wav filenames."""
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    root = args.manifest.resolve().parent
    rows = manifest['lines']
    if not rows or len({row['id'] for row in rows}) != len(rows):
        raise ValueError('Expected unique nonempty narration lines')
    sources = []
    for row in rows:
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', row['id']):
            raise ValueError('Invalid narration ID')
        verify_record(root, row)
        sources.append((row['id'], local_file(root, row['artifacts']['wav']['file'])))
    args.output.mkdir(parents=True, exist_ok=False)
    for line_id, source in sources:
        shutil.copy2(source, args.output / f'{line_id}.wav')
    print(f'Exported {len(sources)} WAVs to {args.output}; import them with the style\'s audio importer')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    gen = sub.add_parser('synthesize', help='Generate/resume WAVs and provider timing')
    gen.add_argument('input', type=Path)
    gen.add_argument('--output', type=Path, required=True)
    for key in DEFAULTS:
        gen.add_argument(f'--{key}')
    listing = sub.add_parser('voices', help='List currently available online voices')
    listing.add_argument('--locale', help='Locale prefix, e.g. en-US or zh')
    exporting = sub.add_parser('export-wavs', help='Export ID.wav files for style-specific importers')
    exporting.add_argument('manifest', type=Path)
    exporting.add_argument('--output', type=Path, required=True, help='New export directory')
    binding = sub.add_parser('bind', help='Preview or apply voice to the shared runtime timeline')
    binding.add_argument('--project', type=Path, default=Path('.'))
    binding.add_argument('--manifest', type=Path, required=True)
    binding.add_argument('--schedule', type=Path, required=True, help='JSON object: line ID → start frame')
    binding.add_argument('--apply', action='store_true', help='Back up and update content/production.json')
    binding.add_argument('--replace-voice', action='store_true', help='Replace existing voice and all captions')
    args = parser.parse_args()
    try:
        if args.command == 'synthesize':
            asyncio.run(synthesize(args))
        elif args.command == 'voices':
            asyncio.run(voices(args.locale))
        elif args.command == 'export-wavs':
            export_wavs(args)
        else:
            bind(args)
    except (ValueError, RuntimeError, OSError) as exc:
        parser.exit(1, f'{exc}\n')


if __name__ == '__main__':
    main()
