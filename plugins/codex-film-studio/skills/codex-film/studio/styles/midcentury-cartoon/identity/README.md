# Offset Frames

An original studio ornament built from two offset film-frame windows.
The open rear contour suggests the preceding frame; the closed front contour
suggests the next. The asymmetric outline remains legible at caption size.

Use `studio-mark.svg` for website wordmarks and `frameMark()` from
`studio-mark.mjs` for Canvas illustrations. Keep the symbol upright. Use the
existing brick, coral or teal print ink with enough contrast against the paper.
Do not rotate it continuously or add radial rays, petals, or a central asterisk.

Small caption ornaments and free-standing accents use the same two-frame mark.
Large numeric badges use a rounded rectangular plate so the mark does not
compete with the number. Real-world flags and research-related product marks
remain factual illustrations and must not be turned into studio branding.

`python3 scripts/apply_midcentury_identity.py --project /path/to/retained/project`
adapts an existing Canvas production using this library's print primitives.
It copies this small renderer into the production, updates its decorations,
and preserves existing audio, timing, flag stars and factual brand assets.
Render both editions again after applying it; prior visual-review coverage
does not automatically apply to the new encoded frames.

After the revision evidence is recorded and bound in `release.json`, run
`python3 scripts/audit_identity_revision.py --project /path/to/edition`
from the library root. It validates hashes, frame coverage, the recorded shot
review and browser completion; it does not perform subjective review.
