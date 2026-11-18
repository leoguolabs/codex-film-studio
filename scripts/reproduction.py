#!/usr/bin/env python3
"""Seal and restore explicit, external film source bundles with file hashes.

No publication, dependency installation or execution of bundled code occurs.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import tempfile
import gzip
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'reproduction-manifest.json'
FORBIDDEN = {'node_modules', '.git', '.venv', '__pycache__', '.env'}


def sha(file):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def relative(name):
    p = PurePosixPath(name)
    if (not p.parts or p.is_absolute() or '..' in p.parts or '\\' in name
            or name in {'REPRODUCTION.json', MANIFEST}
            or any(part in FORBIDDEN or part.startswith(('.env.', '.venv')) for part in p.parts)):
        raise ValueError(f'Unsafe bundle path: {name}')
    return Path(*p.parts)


def external(destination):
    raw = Path(destination).expanduser()
    if raw.is_symlink():
        raise ValueError('Bundle output must not be a symlink')
    out = raw.resolve()
    if out == ROOT or ROOT in out.parents:
        raise ValueError('Story source bundles must stay outside the style library')
    if out.exists():
        raise FileExistsError(f'Existing directory preserved: {out}')
    return out


def inspect_bundle(bundle):
    bundle = Path(bundle).resolve()
    if (bundle/MANIFEST).is_symlink() or any(p.is_symlink() for p in (bundle/'project').rglob('*')):
        raise ValueError('Source bundles cannot contain symlinks')
    manifest = json.loads((bundle/MANIFEST).read_text())
    if manifest.get('schema_version') != 1 or not manifest.get('files'):
        raise ValueError('Invalid or empty reproduction manifest')
    seen = set()
    for entry in manifest['files']:
        p = relative(entry['path'])
        if str(p) in seen:
            raise ValueError('Duplicate bundle path')
        seen.add(str(p))
        file = bundle/'project'/p
        if (file.is_symlink() or not file.is_file() or (bundle/'project') not in file.resolve().parents
                or file.stat().st_size != entry['bytes'] or sha(file) != entry['sha256']):
            raise ValueError(f'Missing or changed bundle file: {p}')
    actual = {str(p.relative_to(bundle/'project')) for p in (bundle/'project').rglob('*') if p.is_file()}
    if actual != seen:
        raise ValueError('Unlisted files in bundle project')
    return manifest


def archive(bundle, output):
    """Portable deterministic archive; its SHA-256 authenticates the manifest too."""
    bundle = Path(bundle).resolve()
    inspect_bundle(bundle)
    output = external(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    files = [bundle/MANIFEST, *sorted(p for p in (bundle/'project').rglob('*') if p.is_file())]
    raw = output.open('xb')  # Only clean up an output this invocation created.
    try:
        with raw, gzip.GzipFile(filename='', fileobj=raw, mode='wb', mtime=0) as zipped, tarfile.open(fileobj=zipped, mode='w|') as tar:
            for file in files:
                info = tar.gettarinfo(str(file), arcname=file.relative_to(bundle).as_posix())
                info.uid = info.gid = info.mtime = 0
                info.uname = info.gname = ''
                info.mode = 0o644
                with file.open('rb') as stream: tar.addfile(info, stream)
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    return {'file': output.name, 'sha256': sha(output), 'bytes': output.stat().st_size}


def acquire(source, destination, expected_sha256, max_bytes=20*1024**3):
    """Acquire a checksum-pinned archive and safely unpack, without executing code."""
    if not re.fullmatch('[0-9a-f]{64}', expected_sha256):
        raise ValueError('Provide the published archive SHA-256')
    out = external(destination)
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.acquire-', dir=out.parent) as temporary:
        temp = Path(temporary); downloaded = temp/'archive.tar.gz'
        if str(source).startswith(('https://','http://')):
            stream = urllib.request.urlopen(urllib.request.Request(str(source), headers={'User-Agent':'codex-film-studio'}), timeout=120)
        else:
            stream = Path(source).open('rb')
        with stream, downloaded.open('wb') as target:
            size = 0
            while chunk := stream.read(1024*1024):
                size += len(chunk)
                if size > max_bytes: raise ValueError('Archive exceeds size limit')
                target.write(chunk)
        if sha(downloaded) != expected_sha256: raise ValueError('Archive checksum mismatch')
        stage = temp/'bundle'; stage.mkdir(); seen=set(); size=0
        with tarfile.open(downloaded, 'r:gz') as tar:
            for member in tar:
                name = member.name
                if name in seen or not member.isfile(): raise ValueError('Duplicate or non-regular archive member')
                seen.add(name)
                if name != MANIFEST:
                    if not name.startswith('project/'): raise ValueError('Unexpected archive member')
                    relative(name.removeprefix('project/'))
                size += member.size
                if size > max_bytes or len(seen) > 100000: raise ValueError('Expanded archive exceeds limits')
                target = stage/name; target.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as incoming, target.open('xb') as outgoing:
                    shutil.copyfileobj(incoming, outgoing)
        inspect_bundle(stage)
        out.mkdir()
        try:
            for item in stage.iterdir(): shutil.move(str(item),out/item.name)
        except BaseException:
            shutil.rmtree(out)
            raise
    return out


def seal(source, destination, recipe):
    source = Path(source).resolve()
    out = external(destination)
    records = []
    for name in recipe['files']:
        p = relative(name)
        file = source/p
        if file.is_symlink() or not file.is_file() or source not in file.resolve().parents:
            raise ValueError(f'Missing or linked source: {name}')
        # Do not bundle concrete credentials. Environment-variable references are fine.
        if file.suffix in {'.json', '.py', '.js', '.mjs', '.cjs', '.txt', '.yaml', '.yml'}:
            text = file.read_text(errors='replace')
            if re.search(r'(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)', text):
                raise ValueError(f'Credential material detected; exclude or sanitize {name}')
        records.append(dict(path=p.as_posix(), bytes=file.stat().st_size, sha256=sha(file)))
    if not records or len({r['path'] for r in records}) != len(records):
        raise ValueError('Recipe needs a nonempty, unique file list')
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.reproduction-', dir=out.parent) as temporary:
        stage = Path(temporary)/'bundle'; (stage/'project').mkdir(parents=True)
        for record in records:
            target = stage/'project'/record['path']; target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source/record['path'], target)
        manifest = {**{k:v for k,v in recipe.items() if k != 'files'},
                    'schema_version':1, 'files': records,
                    'verification_scope':'File integrity only; see the external validation record for render/playback coverage.'}
        (stage/MANIFEST).write_text(json.dumps(manifest, indent=2)+'\n')
        inspect_bundle(stage)
        # rename refuses an existing nonempty directory; explicitly reject empty
        # destinations too, preserving the same no-overwrite creation contract.
        out.mkdir()
        try:
            for item in stage.iterdir():
                shutil.move(str(item), out/item.name)
        except BaseException:
            shutil.rmtree(out)
            raise
    return out


def restore(bundle, destination, style=None):
    bundle = Path(bundle).resolve()
    manifest = inspect_bundle(bundle)
    if style and manifest.get('style') != style:
        raise ValueError('Requested style does not match the source bundle')
    out = external(destination)
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.restore-', dir=out.parent) as temporary:
        stage = Path(temporary)/'project'
        shutil.copytree(bundle/'project', stage)
        for entry in manifest['files']:
            if sha(stage/entry['path']) != entry['sha256']:
                raise ValueError('Bundle changed during restore')
        for folder in manifest.get('working_directories', ['media', 'review']):
            target = stage/relative(folder)
            if target.exists() and not target.is_dir():
                raise ValueError(f'Working directory conflicts with a file: {folder}')
            target.mkdir(parents=True, exist_ok=True)
        (stage/'REPRODUCTION.json').write_text(json.dumps(manifest, indent=2)+'\n')
        out.mkdir()
        try:
            for item in stage.iterdir():
                shutil.move(str(item), out/item.name)
        except BaseException:
            shutil.rmtree(out)
            raise
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    pack = sub.add_parser('seal'); pack.add_argument('source', type=Path); pack.add_argument('output', type=Path); pack.add_argument('--recipe', type=Path, required=True)
    check = sub.add_parser('check'); check.add_argument('bundle', type=Path)
    check.add_argument('--environment', action='store_true', help='Also verify declared external system-font inputs')
    copy = sub.add_parser('restore'); copy.add_argument('bundle', type=Path); copy.add_argument('output', type=Path)
    packfile = sub.add_parser('archive'); packfile.add_argument('bundle', type=Path); packfile.add_argument('output', type=Path)
    fetch = sub.add_parser('acquire'); fetch.add_argument('source'); fetch.add_argument('output', type=Path)
    fetch.add_argument('--sha256', required=True); fetch.add_argument('--max-bytes',type=int,default=20*1024**3)
    args = parser.parse_args()
    if args.command == 'seal':
        print(seal(args.source, args.output, json.loads(args.recipe.read_text())))
    elif args.command == 'restore':
        print(restore(args.bundle, args.output))
    elif args.command == 'archive':
        print(json.dumps(archive(args.bundle, args.output)))
    elif args.command == 'acquire':
        print(acquire(args.source, args.output, args.sha256, args.max_bytes))
    else:
        manifest = inspect_bundle(args.bundle)
        if args.environment:
            for record in manifest.get('external_inputs', []):
                file = Path(record['path'])
                if not file.is_file() or sha(file) != record['sha256']:
                    raise ValueError(f'Platform input missing or changed: {file}')
        print(f'{manifest["style"]}: {len(manifest["files"])} files verified')


if __name__ == '__main__':
    main()
