# LiDAR Survey · 点云测绘

A measured place becomes a film: enter the point cloud, remove a layer, reveal
the surface and hold one reading long enough to understand it. Spatial evidence
leads the story. The cloud is not decorative dust and never morphs into a logo.

Adapted from the visual grammar in LemoLab's LiDAR Survey guide; see
[provenance](PROVENANCE.md) and [upstream licence](UPSTREAM-LICENSE.txt).

## Data before pictures

Use real survey returns for a film about a real place. Preserve point positions,
gaps, acquisition dates and provider classifications. Keep source URLs, dataset
licences, units, horizontal and vertical reference systems, processing steps and
measurement methods with the production. Convert to a local coordinate frame
before rendering. Check ground levels against a known reference; do not infer a
vertical datum from a file extension. A class label is the provider's claim,
not proof that every point was correctly classified.

The independent page uses an explicitly labelled synthetic material study. Its
shapes demonstrate the visual vocabulary and are not survey observations or
evidence for a real location. Do not substitute those shapes for production data.

## Picture and palette

- A cold near-black field gives sparse returns room to read. No gradient sky.
- Colour height or classification with one muted green-to-pale ramp; use return
  intensity for brightness. Avoid decorative rainbow ramps.
- Ground returns are warm grey; the derived surface is stone or clay, revealed
  by low raking light. Quiet contours should describe the land rather than hide it.
- Reserve amber for a feature, section or measurement. A cool pale seam belongs
  to the scan front. Keep glow local to that seam.
- Render depth-tested points at readable output size. Keep their positions fixed
  relative to one another; camera motion provides parallax.
- Crop a survey window deliberately. Keep the surrounding cloud dim enough to
  explain where the selected region sits.

## Native motion

1. **Enter the returns.** Move from overhead to an oblique view. Reveal points
   along a spatial front rather than a random whole-frame dissolve.
2. **Peel a class.** Lower a height plane or isolate an identified class. Short
   eased holds make successive layers legible. Fade removed returns or separate
   them as a labelled visual treatment; never alter positions used to measure.
3. **Resolve the surface.** A single world-space front drives both the point mask
   and surface reveal. The surface represents the same underlying measurements.
4. **Take a section.** Attach a fine section line to its feature and display the
   corresponding profile. Show units and method next to the reading. Measure on
   undistorted coordinates; label any vertical display exaggeration.
5. **Return the context.** Bring removed layers back as a faint ghost, preserving
   the relationship between the finding and its setting.

Use a continuous, eased camera route with smooth velocity: a low oblique move
for volume, an orbit for inspection, a pullback for extent. Keep the subject large
enough to read. Avoid abrupt cuts inside a cloud and avoid a stationary camera
with simulated point wobble. Author timing on an integer-frame timeline, normally
24 fps, shared by scan planes, camera, labels, voice and sound.

## Type, instruments and sound

Use light condensed type for a held reading, a monospace for source and instrument
labels, and a clear language-appropriate sans for prose and subtitles. Anchor
instruments to consistent corners and leaders to world-space features. Reserve a
subtitle strip. Check actual font metrics and reading time at delivery size.

Tie fine ticks, filtered sweeps and sparse pings to the scan, peel and landing of
a reading. Leave a quiet interval before a major surface reveal. A restrained
ambient score and location sound can provide continuity; narration stays clear
above them. Review the actual mix as well as its loudness measurements.

## New production workflow

Fill the blank `content/film.json` contract in the independent project. Select and
verify data, author a new argument, build its renderer and plan camera, labels
and sound together. Keep raw survey files, generated media, facts and review
records outside the style library. The package contains a guide and input
contract; it does not contain a survey loader or a finished film renderer.

Inspect encoded stills at native size for point clarity, legible labels, correct
occlusion and undistorted measurement. Watch the transitions and complete camera
route at normal speed. Listen to voice and mix separately. Report the actual
review coverage; rendering or generating a contact sheet is not visual review.
