# Visual reference library

Use this library before designing a new subject. `index.json` identifies three
exact source encodes, colour tags, shot ranges and **408 selected frames**.
`frames/files.json` identifies the JPEGs and overview pages by SHA-256.
These are screenshots of existing examples, not generated substitutes. The
144 original-demo frames describe limited-animation performance; the 69 short
and 195 long-example frames show how that language expands into explanation.

The original demo is by LemoLab / Lemomo, under the retained
[MIT licence](../UPSTREAM-LICENSE.txt). The registered short and long examples
are Codex Film Studio productions. These images are for study and comparison.
Do not reuse the example's character identity, product, claims, captions or
story in a new subject. Stills do not supply a soundtrack or prove motion
quality. Complete source videos are not duplicated in this package.

The blank starter includes generic original-engine drawing primitives in
`lib/print-cels/`. Its README explains the supported scope and adaptation.

## Start with the visible target

| Function | Frame anchors | What must survive adaptation |
| --- | --- | --- |
| Reveal/title | [f30](frames/pip/000030.jpg), [f74](frames/pip/000074.jpg), [f140](frames/pip/000140.jpg) | Physical reveal, large subject, sequential type, held read |
| Object iris | [f164](frames/pip/000164.jpg), [f172](frames/pip/000172.jpg), [f180](frames/pip/000180.jpg) | A visible object motivates the transition and its center |
| Context/detail | [f196](frames/pip/000196.jpg), [f210](frames/pip/000210.jpg), [f239](frames/pip/000239.jpg) | Actual contact; native-drawn inset clarifies operation |
| Feedback | [f340](frames/pip/000340.jpg), [f374](frames/pip/000374.jpg), [f398](frames/pip/000398.jpg) | Operation precedes result; attention follows cause |
| Hand close-up | [f455](frames/pip/000455.jpg), [f503](frames/pip/000503.jpg), [f515](frames/pip/000515.jpg), [f525](frames/pip/000525.jpg) | Approach, touch, feedback, object-centred iris; readable fingers |
| Overhead | [f540](frames/pip/000540.jpg), [f588](frames/pip/000588.jpg), [f633](frames/pip/000633.jpg) | A new viewpoint explains progressive mechanism states |
| Material action | [f680](frames/pip/000680.jpg), [f684](frames/pip/000684.jpg), [f692](frames/pip/000692.jpg) | Lower body, grip the real object, then lift |
| Recap/end | [f767](frames/pip/000767.jpg), [f815](frames/pip/000815.jpg), [f878](frames/pip/000878.jpg) | Recognizable prop miniatures, order and calm hold |

Open individual images for native-size checks. Complete navigation is in
[gallery.md](gallery.md). Overview tiles are smaller. A claim about all frames
requires a separate consecutive-frame review; these selected frames are not it.

## Author and judge against the reference

1. Read [performance.md](performance.md). Map each new shot to a visual function
   in `index.json`, rather than matching unrelated stories by absolute time.
2. Inspect the native frames and source motion for that function. Record scale,
   pose, contact, result, reading time, ground and transition.
3. Build a short section with the new cast and actual subject, a physical
   operation, detail view and motivated transition. Compare side by side before
   expanding the film. A palette swatch is not performance calibration.
4. Use [shot-contract.json](shot-contract.json) in the external production and
   connect its fields to the real shared timeline. Missing source motion,
   audio or editable sources are explicit gaps.
5. Review final encoded pictures, continuous motion and audio separately. Save
   observations and defects outside this library. A hash check proves identity,
   not artistic acceptance or another agent's success.

## Restore missing images

`extract.py` takes `--source ID=/path/to/video.mp4` for any of `pip`,
`reference-short`, `reference-long`, and `--output NEW_DIRECTORY`. It verifies
source hashes, colour conversion and frame bounds, waits for other FFmpeg
processes using the shared lock, and extracts original-size frames. It never
marks images reviewed. Requires Python 3, Pillow, FFmpeg and ffprobe.

The upstream revision/path is in `index.json`. A URL is a location hint;
SHA-256 determines identity. Local paths must come from the current machine.
If a video is unavailable, the bundled stills remain useful, but source
playback has not been checked. Run `python reference/verify.py reference` from
the independent project to verify assets. Never regenerate reference images
from new drawing code: that would replace the target with the candidate.
