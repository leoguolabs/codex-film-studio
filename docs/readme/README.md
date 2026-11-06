# README artwork and layout

The README opens with a full-width editorial cover, a centered title and short
introduction, primary navigation and a single X profile badge. It continues as
a film-style field guide: a numbered image-and-text atlas, a screening room and
a three-step authoring path. English and Chinese share the same structure.
Detailed replay and deployment instructions live in native Markdown disclosure
blocks. The layout uses GitHub-supported HTML tables, links and images; it needs
no custom CSS, JavaScript, remote fonts or badge service.

## Reference study

These project READMEs were reviewed for information architecture:

| Reference | Principle studied |
| --- | --- |
| AutoGPT (user-supplied README screenshot) | Lead with a wide banner, then center the title, introduction, navigation and social link |
| [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) | Make the complete style collection discoverable visually |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | Separate first use from library development |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | Express the product visually and keep primary navigation direct |
| [D2](https://github.com/d2lang/d2) | Put concrete examples near the introduction and layer detailed documentation |
| [Manim](https://github.com/3b1b/manim) | Connect a minimal working command to examples and deeper usage |

The cover layout and copy are original. Film thumbnails come from this project's
generated films; no reference-film frames are used. All 18 collection cards,
including their static HTML and Chinese editions, use decoded film frames.
Caption News and Art Deco each use three complete portrait frames arranged side
by side; the remaining cards use a single complete frame. The type study on the
Caption News style page remains separately labelled as an original study.

## Frame sources

The collection uses complete decoded source frames, uniformly resized without
repainting their contents or replacing text. Caption News retains three complete
720×1280 frames and Art Deco retains three complete 540×960 frames in 1440×810
strips, with narrow dark padding. Both languages use the same source images.
Legacy decorated preview files and the two six-frame covers remain retained
separately; the collection and README atlas point to the undecorated stills.

| Style | Generated film | Selected time |
| --- | --- | --- |
| Whiteboard Explainer | Does AI Help You Learn—or Just Finish? | 01:45 |
| Art Collage | Does AI Help You Learn—or Just Finish? · V11 | 00:06 |
| Crayon Picture Book | Leo the Farmer · V11 | 01:06 |
| Mid-century Cartoon | Does AI Help You Learn—or Just Finish? | 00:13 |
| Satellite Briefing | Singapore · Three Days, Three Routes | 00:06 |
| Sci-Fi Sitcom Toon | The House Gets Coffee · Stable V10 | 00:20 |
| Microgame Frenzy | Midnight Bakery | 00:06 |
| Art Deco | The Last Frequency | 00:45 / 01:20 / 02:00 |
| Caption News | Published complete web preview | 00:06 / 01:28 / 02:25 |
| Animated Line Chart Comedy | Eight Economies, 1950–2026 | 00:35 |
| LiDAR Survey | The Height of a Forest | 00:40 |
| Newsreel | Under the City · English V3 | 00:54.792 |
| Exploded Teardown | Inside an Imaging Satellite | 00:18 |
| Halftone Dossier | The Coffee Case | 00:01.8 |
| Prismatic Atlas | The Secret Life of a Snowflake | 02:30 |
| Sci-fi Hologram HUD | LYRA · Systems in Space | 02:55 |
| Luminous Worlds | The Sleeping World | 02:20 |
| Vivid Science | The Ocean’s Night Shift | 00:25 |

[frames.json](frames.json) records each source filename, video SHA-256, exact
frame/time, native dimensions and retained image SHA-256. Source movies and
production files remain in their independent local projects. Showing a frame
does not imply that the complete film is published or alter the reusable
package's completion status.

Credits retained from the production records:

- Original generated artwork and compositions: LeoGuoLabs / Codex Film Studio.
  The whiteboard sample and its frames use [CC BY 4.0](../../MEDIA-LICENSE.md).
- Art Collage V11 uses the production's newly generated fictional character and
  original paper composition. Its ChatGPT mark identifies the story's subject.
- Crayon artwork is an independently drawn, unofficial adaptation of **Leo the
  Farmer**, credited in its production to **Play with Gyuri / Gyuri and Friends**.
  Character and story attribution is retained; no official episode frame is used.
- The Singapore frame contains NASA Blue Marble / NASA GIBS imagery and
  EOxCloudless 2016 by EOX IT Services GmbH, containing modified Copernicus
  Sentinel data 2016, CC BY 4.0. Grading, map treatment and annotations are
  production modifications. This selected frame contains no footage insert.
- Mid-century, crayon, satellite and sci-fi visual grammar was studied from
  LemoLab's [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar), by
  [@lemomo_ai](https://x.com/lemomo_ai). These are the new productions' frames.

Caption News footage and reporting credits remain in the [film source notes](https://leoguolabs.github.io/codex-film-studio/styles/caption-news/showcase/media/credits.html).
The additional sample frames retain their films’ credits in the released
`showcase/media/credits.html` files. Exact released-video URLs (or archive
members), source hashes and frame numbers are recorded in `frames.json`.

Code, documentation and layout use MIT. The screenshots retain the source
materials' credits above; this does not relicense third-party marks, characters
or imagery. Font files are not included in these rendered images.

## Maintenance

Set `preview`, `preview_zh`, `preview_kind` and `description_zh` in `styles.json`.
An actual generated film screenshot uses `frame`, whether the full film is
published or retained locally. A style without a preview remains listed.

The repository retains decoded source JPEGs in `frames/`, so rebuilding
the image layouts needs no original MP4, private project or service credential.
Install Pillow in your Python environment, then run from the repository root:

```sh
python3 scripts/build_readme_artwork.py
python3 scripts/update_style_index.py
python3 scripts/update_style_index.py --check
```

Use `python3 scripts/build_readme_artwork.py --style caption-news` to regenerate
only that style’s bilingual previews, preserving both covers and other styles.
`preview_showcase` in `styles.json` selects the destination for preview images;
the README, collection card, screening shelf and detail image link directly to
the selected player anchor.

The artwork builder discovers common local Latin and CJK fonts; alternatively
provide `--latin-font /path/body.ttf --display-font /path/display.ttf
--cjk-font /path/chinese.ttf`. Fonts affect text metrics, so inspect regenerated
images. The current cover retains its first six frame slots; additional frames
join the atlas. Changing that cover selection or layout is a separate edit.
English and Chinese covers are PNGs, with the Chinese title and
labels rendered directly into the image. Preview labels are likewise separate
English and Chinese image files.

The index command regenerates the marked atlas and summary blocks in both root
READMEs and the detailed `styles/README.md`. Edit surrounding prose normally.
The summary sits under the atlas heading, separate from the introduction.
`follow-x.svg` is a local badge linked to `https://x.com/LeoGuoLabs`; it does not
fetch follower counts or depend on a remote badge service.
New styles must meet [the contribution requirements](../../CONTRIBUTING.md).

## LiDAR Survey preview

The bilingual `styles/lidar-survey/showcase/preview.*.svg` artwork is original
synthetic geometry: muted canopy points, a stone-coloured terrain and an amber
section. It illustrates visual grammar, not a real location or measurement.
These style-study previews link to the independent LiDAR Survey page in both
README galleries and the public collection. No upstream film frames are used.

Newsreel's preview is an actual frame (1315) from the 720p web edition of
*Under the City*, English edition v3, retaining the full composition without decoration.
Its source and image hashes are recorded in `frames.json`. The page credits
LemoLab's reference and the new films' archival sources separately.

### Exploded Teardown

The preview is frame 432 (18.000 seconds) of *Inside an Imaging Satellite*,
showing the original illustrative satellite's six functional layers. Its hash
and source are recorded in `frames.json`. The frame is displayed unchanged.
Visual-method inspiration and upstream code attribution: Lemomo / LemoLab's
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar). Full production credits
are supplied with the published film.
