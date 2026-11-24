# Provenance and scope

Visual grammar and library organization were studied from LemoLab / Lemomo's
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar), especially its
[Satellite Briefing guide](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/satellite-briefing/STYLE.md)
and released *The Map Still Says Sea* reference film. The guide's blob inspected
on 23 October 2026 was `8fb341c5fe18f85ddcec9ef24085b229b4db38c4`.
Credit: [LemoLab on X](https://x.com/lemomo_ai).

This package is an independently written synthesis. It retains the ideas of a
geographic camera, photographic ground, sparse measurements, a local map layer
and controlled colour. It does not copy the upstream renderer, voice setup,
music, source rasters, film or reference stills. Original package code and prose
use this repository's [MIT license](../../LICENSE). Actual third-party material
retains its own terms and must be recorded by each production.

The optional YouTube-footage process is an independent extension from production
experience, not a claim that lemo-opuscar includes a stock-footage pipeline.
The inspected upstream TECHNIQUE.md explicitly describes a code-made approach
without stock footage. Our extension records actual place identity, source
intervals, permissions, timestamps and compositing behavior. It does not depend
on FrontierTechSN application Tasks, its database or a saved browser session.

The Chatterbox guidance is an integration contract: choose and verify a real
runtime or service for each production. No endpoint, credential, preset voice,
provider job, model file or prior waveform is bundled here.

The general `scripts/frame_review/` utilities belong to Codex Film Studio and
are copied by the creator. Tests and prior production findings justify reusable
engineering rules; they do not establish visual or listening acceptance for a
new export. Historical example productions already in this repository are not
modified, republished or copied into this starter.

## Orbital atlas on the showcase page

The opening schematic projects Natural Earth land at 1:110m onto a sphere
centred on Singapore (1.35° N, 103.82° E). The dot rows follow parallels
and stop at the coastline. The locator and the photographic descent share
the same projection. [Land polygons, v5.1.2](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_land.geojson) · [Public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/)

The descent uses four orthographic photographic plates centred on Singapore.
The outer three sample NASA Blue Marble Next Generation (2004). The island
view uses Sentinel-2 cloudless 2016 by EOX, containing modified Copernicus
Sentinel data 2016, under CC BY 4.0. The cover reprojects and tones the
retained production rasters. Its scale bar measures a spherical surface arc
through the centre of the view, using an Earth radius of 6,371 km.
[NASA Blue Marble](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/) ·
[EOX](https://s2maps.eu/) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

The spacecraft is original illustrative artwork generated with the built-in
ImageGen tool. Its transparent WebP and the atlas plates live in `showcase/`.
Instrument Serif is distributed with its [OFL](showcase/OFL-instrument-serif.txt).

<details><summary>Spacecraft art prompt</summary>

Create a single isolated spacecraft illustration on genuine alpha transparency, for a refined minimalist geospatial interface. Style is an impeccably designed orthographic industrial pictogram in soft 3D, midway between Dieter Rams product design and a Swiss transport diagram. Composition: an ultra-simple civil earth observation spacecraft viewed three-quarter isometric. Exactly one compact clean silver-white cuboid instrument bus with softly chamfered edges, one circular dark blue-black optical lens set FLUSH into its downward-forward face, and two identical extended flat rectangular slate-blue solar wings connected symmetrically on short rods. Make the central bus substantial, around one third of the full span. The array axis runs diagonally from LOWER LEFT to UPPER RIGHT at 20 degrees; visible foreshortening and three well-defined flat faces. Each wing is divided into just THREE wide clean segments by two thin pale parallel seams, and is surrounded by a narrow silver rim. Flat matte materials, very restrained tonal shading, sharp silhouette readable at 110 pixels wide. A little cool light on top-left planes, no black ink outline. STRICTLY LIMITED forms, no gold or foil, no complex PV cells, no circuit traces, no antennas, no dishes, no lettering, no emblems, no visible bolts, no greebles, no branding, no floor shadow, no backdrop, no Earth. Full object fits in frame with small transparent margin on all sides. Wide landscape composition.

</details>
