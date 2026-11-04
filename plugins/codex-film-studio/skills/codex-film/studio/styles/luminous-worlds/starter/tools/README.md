# Every-frame diagnostics

Install Python dependencies in an isolated environment: NumPy, OpenCV, Pillow
and PyAV (tested with 18.1.0). Pin the versions used by the production. These tools do
not launch the ffmpeg executable; PyAV decodes through its bundled FFmpeg libraries.

The reader requires declared SDR BT.709 primaries, transfer, matrix and a known
limited or full range. Other or missing colour metadata raises an error instead
of silently choosing a conversion. HDR and display/ICC colour management are
outside this tool's scope. A stream without a declared frame count reports its
decoded count and EOF completion; it cannot claim agreement with an unknown
expected count. Check colour-bar conversion with `python tools/test_color_decode.py`.

Do not use a generic decoder's default RGB output as a colour reference without
checking it. Matrix/range tags in the MP4 are insufficient if the screenshot
path ignores them. Compare representative decoded colour patches against a
known conversion, and record the decoder and conversion in the review evidence.

```sh
python tools/audit_frames.py reference.mp4 review/reference
python tools/audit_frames.py candidate.mp4 review/candidate
python tools/compare_roles.py review/reference/features.npz review/candidate/features.npz content/roles.json review/pairs.csv
```

The audit decodes every frame, writes a CSV and compressed feature archive,
selects stills every five seconds and creates overview sheets. Processing uses
320 × 180 images after full-frame decoding. It does not test subjective quality,
full-resolution sharpness, PTS cadence or audio.

Fill the role contract with `role`, `output: [start, end]` and
`reference: [start, end]` for every candidate interval. All bounds are integer
frames, zero-based and half-open. Output intervals must cover every frame once;
reference windows may repeat. Select them from a visual-role analysis before
examining metric results. Pairing linearly maps shot phase and reports its
reference coverage separately from the total reference decode coverage.

Comparison columns contain output value, reference value and signed delta for
value, saturation, edge density, flat area, consecutive-frame change and occupied
composition tiles. There is no similarity percentage or automatic pass threshold.
A cut legitimately produces a large delta. Review causes in the actual images.

Use an encoder gate when rendering or checking with ffmpeg. Wait for another
job rather than stopping it. The parent library has a shared frame-review gate;
a standalone production may implement an equivalent advisory lock and process
check. Technical verification must cover the final encoded file after changes.

## Continuous inspection atlas

```sh
python tools/continuous_atlas.py candidate.mp4 review/continuous
```

Every decoded frame appears once, in presentation order. The manifest records
half-open ranges, page hashes, thumbnail dimensions and the video hash. Its
`inspected_pages` list starts empty. Keep a separate inspection ledger with the
pages actually viewed, observations and any full-resolution follow-ups. Union
ranges before counting coverage; overlapping pages must not inflate the count.
Thumbnail findings are provisional: a full-size view can confirm or overturn a
composition concern. Record that correction rather than leaving both claims.

After a revision, prior visual evidence only applies to unchanged pictures when
identity has been established. Source identity alone does not prove encoded
pixel identity. Report inherited and newly viewed ranges separately. Never
rename an old inspection ledger as if it described a new render.

```sh
python tools/revision_atlas.py prior.mp4 candidate.mp4 review/revision
```

This compares every full-resolution decoded BGR pixel, records identical and
changed ranges, and creates an atlas of every changed frame. Inputs must have
the same dimensions, frame rate and frame count. The generated manifest starts
with an empty viewed-page list. Actually inspect the changed pages, and retain
the earlier inspection ledger and its hash before carrying its observations
onto identical ranges. Identity supports only that ledger's original review
scope; it cannot turn thumbnails into full-resolution inspection or establish
style acceptance. Keep the earlier candidate available to reproduce the check.
