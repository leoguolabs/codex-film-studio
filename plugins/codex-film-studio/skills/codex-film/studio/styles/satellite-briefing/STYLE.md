# Satellite Briefing: visual and motion grammar

## The visual argument

The viewer moves through a real place and learns something from its spatial
relationships. Photographic terrain supplies the setting; thin annotations
explain a measured fact, a route or a clearly labelled interpretation. Build
one readable finding at a time. The geographic camera is the organizing device.

Separate three kinds of marks: observation from the image, a calculated
measurement, and an itinerary or proposal. Name the latter explicitly. A line
on a map must not silently imply a surveyed boundary, navigable route or event.

## One camera and nested photographs

- Sample real georeferenced imagery with documented projection, extent and date.
  Prepare world, regional and local detail only as the story needs them.
- Use one perspective camera for terrain, pins, lines, map masks and labels.
  Distance in a spherical helper is measured from its surface target; the
  instrument altitude is `length(camera_position) - earth_radius`.
- Derive the scale bar by casting its two screen endpoints onto the ground and
  measuring their angular separation. An endpoint above the horizon has no
  ground distance; hide or relocate that bar instead of inventing a value.
- Interpolate positive camera distance logarithmically. Keep a small drift on
  reading holds. Start an adjoining continuous shot at the previous rendered
  frame's actual pose, including any drift, offset or overshoot.
- Blend resolution layers across feathered extents and altitude intervals.
  Check the intermediate zoom, not just its endpoints. A sharp city rectangle,
  source mosaic stripe or cloudy plate is a sourcing/grading issue to fix.
  Do not fabricate photographic evidence to conceal it.
- Keep double-precision camera calculations on the CPU where practical. Pass
  the ray/sphere discriminant constants deliberately; cancellation near the
  ground can damage a shader even when an orbital still looks correct.

The included helper uses a spherical Earth, not terrain or survey-grade
geodesy. Document that approximation. Cross-dateline rasters require splitting
or explicit wrapped sampling; a simple west/east bounding box is insufficient.

## Graphic hierarchy

Use cool, low-chroma terrain with visible land detail and dark water. Bring
colour back at a meaningful point, locally where possible. Reserve near-white
for sparse measurements and readable type; one warm accent carries the main
reading. Avoid a forest of competing dashboard elements.

At a 1920 × 1080 baseline, start with approximately 1.2–2.6 px leaders, 96–130 px
main readings, 24–42 px labels and 20–34 px instruments. These are starting
ranges, not automatic acceptance thresholds. Adapt to the actual language,
font, output size and viewing device. Preload real font glyphs before measuring.
Use a condensed face for readings, monospace for instruments, and a serif for
the map name or final title. Keep credits readable.

Place the main subject prominently, the reading beside it, and the transcript
at lower left. A narrow white rule and a dark plate fading to the right hold
the subtitle. Measure rendered text width and split cues at phrase boundaries;
do not shrink long narration into unreadable text. English single-line and
bilingual layouts need separate typography decisions.

## Map, measurement and footage

The printed-map treatment belongs to a meaningful geographic polygon, with
photography still visible outside it. Grain, graticule, coast and name scale
coherently. A soft scan removes or replaces this layer; it is not a full-screen
slide transition. Time-change scans require registered dated images and an
explicit temporal claim. Do not imply change from two unrelated basemaps.

For a range line, use a documented distance model and one shared progress value
for the line endpoint and counter. Round only the displayed result. A direct
surface distance is not a driving or rail distance. An itinerary count may be
shown as an itinerary count; it must not stand in for a measurement.

Optional real-footage inserts are spatially linked to the identified subject.
Reveal the clip, backing, brackets, title and leader with compatible masks and
opacity. The first revealed strip must already contain an actual decoded
image. Parent fades must affect every child layer. Do not loop a route marker
back to its origin unless that repetition has a narrative purpose.

## Camera and sound phrases

| Phrase | Purpose | Continuity check |
| --- | --- | --- |
| Oblique orbit → descent | Establish where and at what scale | Limb, targeting point and altitude agree |
| Near-nadir hold with drift | Let a finding be read | Ground and annotations remain registered |
| Track along a route | Explain spatial sequence or distance | Pin positions and scale remain geographic |
| Short pan to a nearby subject | Shift attention | Clear arrival; directional blur only during movement |
| Local colour reveal | Reveal the relevant place or change | Mask stays tied to the same ground |
| Climb → title | Return to broader context | Targeting brackets expand into the title frame |

Use a restrained instrumental palette: low orbital bed, dry ticks, short
telemetry pings, soft scan noise and a few weighty arrivals. Tie sounds to named
timeline events. Leave room for narration and intentional quiet. Select and
measure loudness/true-peak targets for the intended destination; a reference
mix value is not proof that the export meets it.

Flags, logos and recognizable objects belong only where the new subject needs
them. Preserve their defining geometry while adapting graphic treatment.
Follow the repository's portrait input rule for a specified real person.
Neither a previous cast nor a previous destination is part of this style.
