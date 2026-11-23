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

The interactive cover uses four orthographic plates centred on Singapore.
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

A single elegant scientific Earth-observation satellite, isolated cutout, real transparent background. A pristine aerospace museum engineering model photographed in space-grade dramatic side light. Compact faceted champagne-gold multilayer foil bus, silver struts, one camera telescope and two long deep ink-navy solar-panel wings with fine warm metallic gridlines. Three-quarter oblique view in perspective, panel axis leaning diagonally from lower left to upper right across a landscape frame. Entire instrument in frame, object fills the canvas with modest clear margin, beautifully legible graphic silhouette, rich photographic microdetail, warm sun on upper left facing edges, cool teal ambient fill, high contrast. No planet, no background, no ground shadow, no stars, no lettering, no logos or insignia, no diagrams. Designed as a floating foreground element for an editorial orbital atlas.

</details>
