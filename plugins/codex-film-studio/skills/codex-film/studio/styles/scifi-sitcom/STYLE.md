# Sci-Fi Sitcom Toon: drawing, performance and sound

Use this as a visual contract for a new story. Establish a small ordinary desire,
opposing reactions, and a consequence the audience can see. A world-travel device
is available when the subject benefits from it; it is not a mandatory plot.

## Stable language and variable content

| Keep recognizable | Decide for this film |
| --- | --- |
| Dark irregular outlines, flat fills, contained hard shadows | Exact colors, environments, clothing, props and identities |
| Large readable eyes and silhouette-driven acting | Cast size, ages, identities, faces and relationship |
| Contrast between restrained and escalating reactions | Which person is calm, which is anxious, and when that changes |
| Stable hand-drawn contours, readable holds and purposeful smooth motion | Gesture, framing, duration, number of worlds and scene order |
| Readable outlined captions and purposeful retro graphics | Language, font coverage, factual content and word choices |
| Cartoon sound coordinated with the action and room for silence | Voices, instruments, music density and delivery loudness |

Countries, numbers, brands, flags, specific people and documentary cases are
content inputs. Choose them from the new subject and evidence. Never carry a
previous country's data to another flag or require the reference's characters.

## Drawing

At 1920×1080, a useful starting range is 5–7 output pixels for main contours
and 3–5 for background detail. Dark purple-black reads warmer than pure black.
Transform geometry into screen space before stroking so a close-up does not
multiply the line weight. Preview at the actual delivery scale before fixing
these values; the numbers are starting points, not a universal match score.

Hand-drawn irregularity is spatial, not a reason for a still contour to move.
Use fixed, low-frequency displacement along the path normals. Keep sampling,
arc distance and shape seeds in local geometry so pans and zooms cannot resample
the path or make its texture crawl. Keep fills attached to that same contour.
The provided `Ink` helper keeps displacement and stroke width in output pixels
and restores the Canvas context. `roughness` controls the fixed irregularity;
the legacy `boil` argument is only an alias for that spatial amplitude.

Do not cycle outline drawings, add frame-random noise, or displace a scene just
to imitate reference wobble. A held shape must be identical at different frames
when its pose and camera are unchanged. This stable-contour rule supersedes the
earlier three-drawing/two-frame line-boil prescription. The reference may contain
shake; that is an observed property, not a requirement for this style.

Ordinary camera changes keep stroke weight constant. When a character becomes
very small, reduce contour width and displacement together until its face and
limbs remain distinguishable. Scope that change to the character and restore
it afterward. The helper's 0.65 scale threshold and 0.12 minimum are adjustable
production-derived starting values; judge the actual pixels, not the parameter.

Use a limited palette per environment and clean hard shadow shapes contained
inside their forms. Separate adjacent worlds in hue and lightness. Keep eye
white and outline color stable. Build device glow from flat translucent shapes.
Preserve enough contrast for faces, symbols and labels in every palette.

## Character performance

Design a new silhouette and costume idea for each lead. Use large white eye
masses, small pupils, controllable lids, brows and a mouth whose opening responds
to the dialogue. Different expressions should change attitude, not identity.
Hands need clear contact with held objects; clothing and feet must support a
lean or landing. Test silhouettes before adding details.

Hold the body and head still between actions. Avoid default breathing scale
loops, panic translation, pupil jitter and periodic nodding. Show emotion through
silhouette, expression and a motivated gesture that enters, holds and releases.
Interpolate moving geometry on the full output-frame clock; discrete mouth and
blink drawings may remain on twos at 24 fps. Drawing cadence is independent of
outline texture and must never make the whole image tremble. At another output
rate, select that cadence deliberately. Stagger purposeful reactions so they read.

Derive mouth openings from the accepted audio envelope. Envelope motion is an
approximation, not phoneme-perfect lip sync. Inspect visible speech starts,
stops, interruptions and loud reactions against the final soundtrack.

## Camera, objects and continuity

Use medium two-shots to establish the relationship, hard close-ups for reactions,
and inserts when an object or mechanism must be understood. Give the audience
time to see an absurd action before showing the response. A small push-in can
hold attention during a quiet beat; avoid constant motion that has no purpose.
Keep dialogue cameras locked unless a particular reveal calls for a move. Do
not add camera shake to every strong reaction. Keep portal rims and labels
stable; animate the transport, internal swirl or indicated action separately.

Frame an insert around the object and the path of its action. Labels must clear
both busy scenery and captions. Face size, foreground interaction and occupied
area are useful reference properties; copying exact head coordinates is not
required for a new scene. Judge spacing by intent and readability.

When a travel device crosses a cut, carry its world position, camera, visible
radius, phase and actor positions through the boundary. Expand the existing
portal into the wipe instead of introducing a second, newly positioned portal.
Inspect frames immediately before and after cuts. Keep actors visible until
the intended occlusion; avoid a glow or rim accidentally covering the speaker.

## Typography and real identities

Use rounded heavy caption lettering, an off-white fill and a dark outline.
Speaker indicators may use each character's color. Retro pixel lettering suits
small world labels and machine readouts. Font licenses and glyph coverage must
be checked for the requested language. No font is bundled by this starter.

Reserve a caption region before staging people and objects. Wrap by measured
text width; check at a practical viewing size. Clear captions for intentional
silent beats. Let word alignment and reading time set caption duration rather
than reusing one fixed duration from the reference.

If a country, logo or real person matters to the story, preserve its identifying
geometry within the flat style. Follow the repository's supplied-portrait
requirement for specific people. A label does not compensate for a generic face
when recognizable likeness is required. Keep factual statements and their
qualifications together. None of these identities belongs in the method's defaults.

## Sound

Choose contrasting voices by listening to representative lines in this project.
Pocket TTS, Chatterbox and recorded dialogue are interchangeable input routes;
no particular voice name, endpoint or reference recording defines the style.
Keep spoken audio at natural speed and let the edit follow its measured duration.

A small retro synth ensemble can provide the musical identity. Vary cues with
environment and emotion; synchronize effects to named action frames. Keep speech
clear, reduce competing music during dialogue, and check the final mix on the
intended playback surface. Loudness targets follow the destination.

Silence is a compositional choice. When a joke needs a clean stop, cut both the
music and its tail deliberately; retain only the room sound that serves the beat.
Do not infer that ASR agreement or unclipped samples proves a pleasant voice or mix.
