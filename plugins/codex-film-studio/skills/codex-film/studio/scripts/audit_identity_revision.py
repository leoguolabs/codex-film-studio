#!/usr/bin/env python3
"""Check a retained film's hash-bound identity revision; does not review art."""
import argparse
import csv
import hashlib
import json
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def audit(root):
    def read(relative):
        return json.loads((root / relative).read_text())

    def require(condition, message):
        if not condition:
            raise ValueError(message)

    release = read('release.json')
    require(release['identity_revision']['name'] == 'Offset Frames',
            'Not an Offset Frames revision')
    for relative, expected in release['files'].items():
        file = root / relative
        require(file.is_file(), f'Missing file: {relative}')
        require(file.stat().st_size == expected['bytes'] and
                sha256(file) == expected['sha256'], f'Stale evidence: {relative}')
    timeline = read('content/timeline.json')
    inventory = read('review/final/summary.json')
    visual = read('review/visual-review.json')
    revision = read('review/identity-revision/every-frame-summary.json')
    delivery = read('review/delivery/delivery-check.json')
    playback = read('review/identity-revision/browser-playback.json')
    audio = read('review/identity-revision/audio-identity.json')
    frames = timeline['duration_frames']
    final_hash = release['files'][release['identity_revision']['video']]['sha256']
    require(all(item == final_hash for item in
                [inventory['sha256'], visual['final_sha256'], revision['final_sha256']]),
            'Final video hash differs between evidence records')
    require(frames == inventory['decoded_frames'] == revision['frames_compared'] ==
            delivery['decoded_frames'], 'Incomplete frame coverage')
    with (root / 'review/identity-revision/every-frame-before-after.csv').open() as stream:
        indices = [int(row['frame']) for row in csv.DictReader(stream)]
    require(indices == list(range(frames)), 'Before/after frame indices have gaps')
    require(delivery['checks_passed'] and delivery['full_decode_passed'],
            'Delivery decode checks failed')
    require(visual['manual_shot_review']['shot_ids'] ==
            [shot['id'] for shot in timeline['shots']], 'Incomplete shot review record')
    for board in visual['manual_shot_review']['opened_boards']:
        require(board in release['files'], f'Unbound visual board: {board}')
    end = playback['end']
    require(end['ended'] and end['error'] is None and
            abs(end['time'] - frames / timeline['fps']) < 0.05,
            'Browser did not reach the expected ending')
    require(playback['progress_observed']['to'] > playback['progress_observed']['from'],
            'No advancing browser playback recorded')
    require(audio['identical_audio_packets'] > 0 and audio['packet_sequence_sha256'],
            'Missing retained audio identity evidence')
    return {'checks_passed': True, 'frames': frames,
            'shots': len(timeline['shots']), 'sha256': final_hash,
            'note': 'Validates retained evidence, not a new subjective review.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(audit(args.project.resolve()), indent=2))


if __name__ == '__main__':
    main()
