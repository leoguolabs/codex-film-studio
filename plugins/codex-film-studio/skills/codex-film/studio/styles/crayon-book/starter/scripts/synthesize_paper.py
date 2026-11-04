"""Synthesize new paper relief from a blank reference's texture statistics.

The random phases discard spatial correspondence with the reference. Iterative
rank matching retains its relief histogram; the smoothed power spectrum retains
the scale and directional character of fibres. No reference image is composited.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


def synthesize(image, seed=4703, iterations=8):
    rgb = np.asarray(image.convert('RGB'), dtype=np.float64)
    luminance = rgb.mean(axis=2)
    relief = luminance - gaussian_filter(luminance, 12, mode='reflect')
    relief -= relief.mean()
    target_values = np.sort(relief.ravel())
    spectrum = np.fft.fft2(relief)
    # Smooth individual frequency bins so compression/block frequencies and
    # any accidental individual mark are not replicated as exact components.
    power = gaussian_filter(np.abs(spectrum) ** 2, 2, mode='wrap')
    amplitude = np.sqrt(power)
    amplitude[0, 0] = 0
    rng = np.random.default_rng(seed)
    candidate = rng.normal(size=relief.shape)
    for _ in range(iterations):
        phase = np.angle(np.fft.fft2(candidate))
        candidate = np.fft.ifft2(amplitude * np.exp(1j * phase)).real
        order = np.argsort(candidate, axis=None)
        matched = np.empty(candidate.size, dtype=np.float64)
        matched[order] = target_values
        candidate = matched.reshape(relief.shape)
    return candidate, relief


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--seed', type=int, default=4703)
    args = parser.parse_args()
    image = Image.open(args.reference)
    candidate, reference = synthesize(image, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    candidate.astype('<f4').tofile(args.output)
    report = {
        'reference': str(args.reference),
        'reference_sha256': hashlib.sha256(args.reference.read_bytes()).hexdigest(),
        'output_sha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
        'dimensions': list(image.size), 'format': 'little-endian float32, row-major',
        'seed': args.seed, 'iterations': 8,
        'reference_relief_std': float(reference.std()),
        'synthesized_relief_std': float(candidate.std()),
        'aligned_correlation': float(np.corrcoef(candidate.ravel(), reference.ravel())[0, 1]),
        'interpretation': 'New random spatial structure with matched texture statistics; not a perceptual similarity score.',
    }
    args.output.with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
