"""Verify decoded pixels and timestamps before inheriting a prefix review.

This is an identity check, not a visual-quality or style-similarity measure.
Review data and per-frame hashes are written to the external output directory.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import av


def file_hash(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('accepted', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('--end-frame', type=int, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.end_frame <= 0:
        parser.error('end-frame must be positive')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    csv_path = args.output.with_suffix('.csv')
    differences, compared = [], 0
    with av.open(str(args.accepted)) as left, av.open(str(args.candidate)) as right, csv_path.open('w') as report:
        writer = csv.writer(report)
        writer.writerow(['frame', 'accepted_sha256', 'candidate_sha256', 'pixels_equal', 'timestamp_equal'])
        old, new = left.decode(video=0), right.decode(video=0)
        for i in range(args.end_frame):
            try:
                a, b = next(old), next(new)
            except StopIteration:
                differences.append({'frame': i, 'reason': 'early_end_of_stream'})
                break
            sa = hashlib.sha256(a.to_ndarray().tobytes()).hexdigest()
            sb = hashlib.sha256(b.to_ndarray().tobytes()).hexdigest()
            pixels = (a.width, a.height, a.format.name, sa) == (b.width, b.height, b.format.name, sb)
            timing = a.pts is not None and b.pts is not None and a.pts*a.time_base == b.pts*b.time_base
            writer.writerow([i, sa, sb, pixels, timing])
            if not pixels or not timing:
                differences.append({'frame': i, 'pixels_equal': pixels, 'timestamp_equal': timing})
            compared += 1
    result = {
        'accepted': {'path': str(args.accepted), 'sha256': file_hash(args.accepted)},
        'candidate': {'path': str(args.candidate), 'sha256': file_hash(args.candidate)},
        'range': [0, args.end_frame], 'interval': 'half-open', 'frames_compared': compared,
        'all_prefix_pixels_and_timestamps_identical': compared == args.end_frame and not differences,
        'differences': differences, 'per_frame_report': str(csv_path),
        'scope': 'Exact decoded prefix identity only. New ranges require new review. No style score or auditory claim.',
    }
    args.output.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))
    if not result['all_prefix_pixels_and_timestamps_identical']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
