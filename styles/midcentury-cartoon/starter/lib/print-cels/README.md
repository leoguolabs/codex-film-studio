# Printed-cel drawing primitives

These generic drawing primitives retain the original LemoLab MIT engine's
paper, pressure-varying broken ink, separate fill registration and on-twos
clock. `toon.mjs` adapts OffscreenCanvas to the starter's pinned
`@napi-rs/canvas`; `hand.mjs` supplies a generic four-finger hand with capped
screen-space outline widths at detail scale. No sample cast, claims or scenes
are included. Read the neighbouring LICENSE.txt.

Import primitives into your new `src/scene.mjs`. Set `setClock(frame / 24)`;
use one 1920×1080 logical composition scaled to the requested output size.
`reg()` updates on twos, while camera/transition masks may update each frame.
`shape`, `ink`, `spline`, `ellipse`, `rrect`, `text`, `arrow`, `rays` and
`paperFinish` take a Canvas 2D context. Inspect their exported options rather
than inventing unsupported arguments. Register the actual licensed fonts
before measuring or drawing text.

The default starter remains a material proof. These primitives do not author
your narrative, pose rig, semantic contacts, typography, camera or soundtrack.
Before expansion, compare a short new-subject calibration against references
available to the production. Do not certify aesthetic equivalence from a
renderer, pixel hash or successful import.
