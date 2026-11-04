"""Check that a picture revision preserves an accepted audio stream exactly.

Uses PyAV for packet inspection and full audio decoding. This establishes data
identity, not listening quality. Write evidence to the external production.
"""
import argparse
import hashlib
import json
from pathlib import Path

import av


def file_hash(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def fingerprint(path):
    payload = hashlib.sha256()
    timing = hashlib.sha256()
    packet_count = 0
    with av.open(str(path)) as source:
        if len(source.streams.audio) != 1:
            raise ValueError(f'Expected one audio stream: {path}')
        stream = source.streams.audio[0]
        codec = stream.codec_context
        configuration = {
            'codec': codec.name,
            'extradata_sha256': hashlib.sha256(codec.extradata or b'').hexdigest(),
            'sample_rate': codec.sample_rate,
            'layout': codec.layout.name,
            'format': codec.format.name,
            'time_base': str(stream.time_base),
            'start_time': stream.start_time,
            'duration': stream.duration,
        }
        for packet in source.demux(stream):
            if not packet.size:
                continue
            data = bytes(packet)
            payload.update(len(data).to_bytes(8, 'big'))
            payload.update(data)
            timing.update(json.dumps([
                packet.pts, packet.dts, packet.duration, str(packet.time_base)
            ]).encode() + b'\n')
            packet_count += 1
    pcm = hashlib.sha256()
    frame_timing = hashlib.sha256()
    samples = 0
    with av.open(str(path)) as source:
        for frame in source.decode(audio=0):
            array = frame.to_ndarray()
            frame_timing.update(json.dumps([
                frame.pts, str(frame.time_base), frame.samples,
                str(array.dtype), list(array.shape)
            ]).encode() + b'\n')
            pcm.update(array.tobytes())
            samples += frame.samples
    if not packet_count or not samples:
        raise ValueError(f'Empty audio stream: {path}')
    return {
        'path': str(path.resolve()),
        'file_sha256': file_hash(path),
        'configuration': configuration,
        'packet_count': packet_count,
        'packet_payload_sha256': payload.hexdigest(),
        'packet_timing_sha256': timing.hexdigest(),
        'decoded_samples_per_channel': samples,
        'decoded_pcm_sha256': pcm.hexdigest(),
        'decoded_frame_timing_sha256': frame_timing.hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('accepted', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve() in {args.accepted.resolve(), args.candidate.resolve()}:
        parser.error('The evidence output must not overwrite an input')
    accepted, candidate = fingerprint(args.accepted), fingerprint(args.candidate)
    checks = {key: accepted[key] == candidate[key]
              for key in accepted if key not in {'path', 'file_sha256'}}
    result = {
        'accepted': accepted, 'candidate': candidate, 'checks': checks,
        'audio_identical': all(checks.values()),
        'pyav_version': av.__version__,
        'scope': 'Exact compressed payload, timing, configuration and decoded audio identity. No listening claim.',
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'audio_identical': result['audio_identical'], 'checks': checks}))
    raise SystemExit(0 if result['audio_identical'] else 1)


if __name__ == '__main__':
    main()
