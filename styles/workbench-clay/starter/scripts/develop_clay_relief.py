"""Develop an uncalibrated fine relief map from an evenly coloured modelling-clay swatch.

R and G encode two slopes. B stores the local variation after removing the
broad lamp gradient. The photographed colour is discarded so a single map
can be re-lit on puppets of any pigment.
"""

import argparse
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


def develop(source, destination):
    value = np.asarray(Image.open(source).convert("L"), dtype=np.float32) / 255
    micro = gaussian_filter(value, 0.8) - gaussian_filter(value, 7)
    broad = gaussian_filter(value, 3) - gaussian_filter(value, 34)
    relief = micro + 0.55 * broad
    limit = np.percentile(abs(relief), 99.7)
    rise = np.clip(relief / max(limit, 1.0e-5), -1, 1)
    dy, dx = np.gradient(gaussian_filter(rise, 0.9))
    # Fine highlights provide estimated relief cues under the new light.
    mapped = np.stack((0.5 + 1.5 * dx, 0.5 + 1.5 * dy, 0.5 + 0.46 * rise), axis=-1)
    Image.fromarray(np.rint(255 * np.clip(mapped, 0, 1)).astype(np.uint8)).save(
        destination
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    develop(args.input, args.output)
