"""Compare every decoded shot frame against frames with the same dramatic function."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

FIELDS = ('ink', 'carved_white', 'spot', 'edge', 'motion', 'margin_luma')
FLOORS = np.array([.12, .12, .06, .10, .035, .10])


def scan(path, roles):
    cap = cv2.VideoCapture(str(path))
    expected = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not cap.isOpened() or fps <= 0:
        raise ValueError('Could not open ' + str(path))
    if not roles or roles[0][0] != 0 or any(b[0] <= a[0] for a, b in zip(roles, roles[1:])):
        raise ValueError('Role intervals must start at zero and increase in time.')
    rows = []
    previous = None
    while True:
        ok, image = cap.read()
        if not ok:
            break
        proxy = cv2.resize(image, (480, 270), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(proxy, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        plate = gray[10:237, 10:471]
        color = proxy[10:237, 10:471].astype(np.int16)
        dx = cv2.Sobel(plate, cv2.CV_32F, 1, 0)
        dy = cv2.Sobel(plate, cv2.CV_32F, 0, 1)
        position = len(rows) / fps
        role = next(name for at, name in reversed(roles) if position >= at)
        values = [np.mean(plate < .24), np.mean(plate > .72),
                  np.mean((np.ptp(color, axis=2) > 46) & (color.max(axis=2) > 83)),
                  np.mean(np.hypot(dx, dy) > .65),
                  np.abs(plate - previous).mean() if previous is not None else 0,
                  np.median(gray[:5])]
        rows.append(dict(frame=len(rows), seconds=position, role=role, **dict(zip(FIELDS, values))))
        previous = plate
    cap.release()
    if not rows or len(rows) != expected:
        raise ValueError(f'Incomplete decode of {path}: {len(rows)} / {expected}')
    return rows


def pairs(source, target):
    result = []
    for role in dict.fromkeys(row['role'] for row in source):
        a = [r for r in source if r['role'] == role]
        b = [r for r in target if r['role'] == role]
        if not b:
            result.extend(dict(frame=r['frame'], role=role, phase_frame='', nearest_frame='', distance='') for r in a)
            continue
        features = np.array([[r[k] for k in FIELDS] for r in b])
        scale = np.maximum(FLOORS, features.std(axis=0))
        for idx, r in enumerate(a):
            distance = np.sqrt(np.mean(((features - [r[k] for k in FIELDS]) / scale) ** 2, axis=1))
            nearest = int(np.argmin(distance))
            phase = round(idx / max(1, len(a) - 1) * (len(b) - 1))
            result.append(dict(frame=r['frame'], role=role, phase_frame=b[phase]['frame'],
                               nearest_frame=b[nearest]['frame'], distance=round(float(distance[nearest]), 5)))
    return sorted(result, key=lambda r: r['frame'])


def write(path, rows):
    with path.open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('reference', 'film', 'reference_roles', 'film_roles', 'output'):
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    reference = scan(args.reference, json.loads(args.reference_roles.read_text()))
    film = scan(args.film, json.loads(args.film_roles.read_text()))
    for name, rows in [('reference', reference), ('film', film),
                       ('reference-to-film', pairs(reference, film)), ('film-to-reference', pairs(film, reference))]:
        write(args.output / (name + '.csv'), rows)
    result = {k: dict(frames=len(rows), sha256=hashlib.file_digest(path.open('rb'), 'sha256').hexdigest())
              for k, path, rows in [('reference', args.reference, reference), ('film', args.film, film)]}
    (args.output / 'coverage.json').write_text(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
