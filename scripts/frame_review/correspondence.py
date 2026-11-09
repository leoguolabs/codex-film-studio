#!/usr/bin/env python3
"""Expand authored shot roles into a hash-bound frame navigation ledger.

This indexes comparisons. It does not inspect pixels, align action phases,
retime media, or certify aesthetic similarity. No FFmpeg process is started.
"""
import argparse
import hashlib
import json
from pathlib import Path


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def build_rows(contracts, sources, frame_count):
    shots = contracts['shots']
    cursor = 0
    for i, shot in enumerate(shots):
        start, end = shot['start'], shot['end']
        if start != cursor or end <= start or end > frame_count:
            raise ValueError(f"Gap, overlap or invalid bounds at {shot['id']}: {start}:{end}, expected {cursor}")
        cursor = end
        ref_id = shot.get('reference_source')
        ref_range = shot.get('reference_range')
        unmatched = shot.get('unmatched_reason')
        if not ref_id:
            if not unmatched:
                raise ValueError(f"Missing reference or unmatched_reason for {shot['id']}")
        else:
            if ref_id not in sources:
                raise ValueError(f'Unknown reference: {ref_id}')
            if not ref_range or not 0 <= ref_range[0] < ref_range[1] <= sources[ref_id]['frame_count']:
                raise ValueError(f"Invalid reference range for {shot['id']}")
        transition = shot.get('transition', {})
        transition_frames = transition.get('frames', 0) if i + 1 < len(shots) else 0
        if not isinstance(transition_frames, int) or not 0 <= transition_frames <= end-start:
            raise ValueError(f"Invalid transition length for {shot['id']}")
        action_phases = []
        for phase in shot.get('action_phases', []):
            bounds = phase.get('range', [phase.get('start'), phase.get('end')])
            name = phase.get('name', phase.get('phase'))
            if not name or len(bounds) != 2 or not all(isinstance(v, int) for v in bounds):
                raise ValueError(f"Invalid action phase in {shot['id']}: {phase}")
            if not start <= bounds[0] <= bounds[1] <= end:
                raise ValueError(f"Action phase outside shot in {shot['id']}: {phase}")
            action_phases.append((name, *bounds))
        for f in range(start, end):
            phases = [name for name, a, b in action_phases if a <= f < b]
            row = {'frame': f, 'shot': shot['id'], 'visual_function': shot['visual_function'],
                   'candidate_phase': phases or ['unspecified in contract'],
                   'shot_range': [start, end], 'reference_source': ref_id,
                   'reference_range': ref_range, 'basis': 'authored shot contract; not visual acceptance'}
            if transition_frames and f >= end-transition_frames:
                row.update({'reference_frame': None, 'status': 'unmatched_transition_composite',
                            'reason': 'Outgoing picture and next-shot first frame coexist; a single-frame counterpart would be misleading.',
                            'incoming_shot': shots[i+1]['id'], 'incoming_source_frame': shots[i+1]['start'],
                            'transition': transition.get('type', 'unspecified')})
            elif not ref_id:
                row.update({'reference_frame': None, 'status': 'unmatched', 'reason': unmatched})
            else:
                a, b = ref_range
                # Map endpoints of the declared interval. This is an index,
                # explicitly not a claim that contact/reveal events coincide.
                numerator, denominator = (f-start)*(b-a-1), max(1, end-start-1)
                rf = a + (2*numerator+denominator)//(2*denominator)
                row.update({'reference_frame': rf, 'status': 'provisional_role_navigation',
                            'reason': shot.get('reference_reason', f"Compare the {shot['visual_function']} role; object, content and duration may differ."),
                            'temporal_alignment': 'normalized shot position only; action phases not aligned'})
            yield row
    if cursor != frame_count:
        raise ValueError(f'Coverage ends at {cursor}, expected {frame_count}')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--contracts', type=Path, required=True)
    p.add_argument('--reference-index', type=Path, required=True)
    p.add_argument('--candidate', type=Path, required=True)
    p.add_argument('--expected-sha256', required=True)
    p.add_argument('--frame-count', type=int, required=True, help='Previously verified decoded count; this tool does not decode.')
    p.add_argument('--reference-source', action='append', default=[], metavar='ID=PATH', help='Verify each used reference movie against its indexed hash.')
    p.add_argument('--output', type=Path, required=True, help='New directory, never an existing review.')
    a = p.parse_args()
    if a.output.exists():
        raise ValueError(f'Output already exists: {a.output}')
    contracts = json.loads(a.contracts.read_text())
    sources = {s['id']: s for s in json.loads(a.reference_index.read_text())['sources']}
    actual = sha256(a.candidate)
    if actual != a.expected_sha256:
        raise ValueError('Candidate SHA-256 differs from expected delivery')
    refs = dict(item.split('=', 1) for item in a.reference_source)
    used = sorted({s['reference_source'] for s in contracts['shots'] if s.get('reference_source')})
    verified = {}
    for key in used:
        if key not in refs:
            raise ValueError(f'Missing --reference-source {key}=PATH')
        h = sha256(refs[key])
        if h != sources[key]['sha256']:
            raise ValueError(f'Reference SHA-256 differs: {key}')
        verified[key] = {'file': str(Path(refs[key]).resolve()), 'sha256': h,
                         'frame_count_from_index': sources[key]['frame_count'], 'fps': sources[key]['fps']}
    # Validate every row before creating an output directory.
    rows = list(build_rows(contracts, sources, a.frame_count))
    counts = {}
    phase_unspecified = 0
    empty_phases = []
    for shot in contracts['shots']:
        for phase in shot.get('action_phases', []):
            bounds = phase.get('range', [phase.get('start'), phase.get('end')])
            if bounds[0] == bounds[1]:
                empty_phases.append({'shot': shot['id'], 'annotation': phase,
                                     'effect': 'Empty half-open interval; owns no frame'})
    for row in rows:
        counts[row['status']] = counts.get(row['status'], 0) + 1
        phase_unspecified += row['candidate_phase'] == ['unspecified in contract']
    a.output.mkdir(parents=True)
    ledger = a.output/'frames.jsonl'
    with ledger.open('w') as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, separators=(',', ':'))+'\n')
    manifest = {'schema': 1, 'purpose': 'Frame-by-frame comparison navigation; no similarity or review verdict',
                'candidate': {'file': str(a.candidate.resolve()), 'sha256': actual,
                              'frame_count_from_prior_verification': a.frame_count, 'fps': contracts['fps']},
                'references': verified, 'contracts_sha256': sha256(a.contracts),
                'reference_index_sha256': sha256(a.reference_index), 'tool_sha256': sha256(__file__),
                'rows': len(rows), 'status_counts': counts, 'unlabeled_phase_rows': phase_unspecified,
                'empty_phase_annotations': empty_phases,
                'coverage_gaps': 0, 'coverage_overlaps': 0,
                'ledger_sha256': sha256(ledger), 'observations_created': 0,
                'limits': ['All role matches remain provisional until separately observed.',
                           'Normalized shot position does not align anticipation, contact, feedback or reading holds.',
                           'Transition composites are explicitly unmatched, not silently dropped.',
                           'No frame is decoded, viewed or heard by this indexing tool.']}
    (a.output/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'rows': len(rows), 'status_counts': counts, 'output': str(a.output)}))


if __name__ == '__main__':
    main()
