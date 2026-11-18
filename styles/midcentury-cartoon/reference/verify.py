#!/usr/bin/env python3
"""Verify identities and frame coverage; does not grant aesthetic acceptance."""
import hashlib
import json
from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
index = json.loads((root / 'index.json').read_text())
inventory = json.loads((root / 'frames/files.json').read_text())
assert hashlib.sha256((root / 'index.json').read_bytes()).hexdigest() == inventory['index_sha256'], 'Changed index'
seen = {source['id']: set() for source in index['sources']}
for item in inventory['files']:
    path = (root / 'frames' / item['path']).resolve()
    assert (root / 'frames').resolve() in path.parents, 'Path leaves reference directory'
    assert path.is_file(), f'Missing {path}'
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256'], f'Changed {path}'
    if 'frame' in item:
        assert item['frame'] not in seen[item['source']], 'Duplicate frame'
        seen[item['source']].add(item['frame'])
for source in index['sources']:
    assert seen[source['id']] == set(source['keyframes']), f'Incomplete {source["id"]}'
print(f'Verified {sum(map(len, seen.values()))} frame identities and {len(inventory["files"])} total assets; no aesthetic acceptance implied.')
