# The Film Studio homepage

Site URL: <https://leoguolabs.github.io/codex-film-studio/>.

The source now builds a unified style library at the root and keeps the existing
whiteboard player at `styles/whiteboard/studio/index.html`. The English and Chinese
READMEs link to the homepage in their own language; film links open the player
directly. Root links with `?edition=short`, `?edition=long` or `#film` continue to
the whiteboard player. The deployed revision is recorded in `build-info.json`;
changing local source alone does not publish it.

## Design and source

`index.html` and `catalog/` contain the homepage. Its streaming-library layout uses
forest black, warm white and coral, an original material-study hero, a searchable
style collection and an authoring path. English and Chinese
copy share the same layout; `?lang=en` / `?lang=zh` overrides the saved language.
Motion respects `prefers-reduced-motion`. No framework, CDN, remote font or
third-party script is needed.

Public builds add the commit revision to homepage asset URLs, catalog requests
and frame previews. This avoids reusing assets from the previous deployment
within GitHub Pages' cache window. Local previews do not require a revision.

`styles.json` supplies every style's name, descriptions, readiness, preview and
showcase paths, as it does for the READMEs. Filters add only presentation metadata
in `catalog/studio.mjs`; an unfamiliar style still appears under All styles and
in search. `docs/readme/frames.json` supplies undecorated film frames when present,
with the registry preview as a fallback. [Preview credits](readme/README.md)
remain with those images. The hero is an original, subject-independent SVG.

Every Collection card opens the same style-detail layout, including Caption News.
Cards with an existing page also have a separate, direct page link. The primary
page is the registered `landing`, otherwise the first released showcase, otherwise
the first local showcase. Style details show only that primary entrance under Films & showcase pages,
followed by guides, prompts and the project creation command. Comparison and
review pages remain reachable from the individual style pages.
The bilingual READMEs and style index use the same page-selection rules.
Readiness describes the reusable package. A displayed frame,
a retained local film and a published sample remain separate states.

Caption News also has a standalone bilingual style page at
`styles/caption-news/showcase/index.html`, linked from both README galleries and
the collection. Its original typography study works without a production folder.
The local screening room can read the current combined delivery from the retained
project. Public playback uses a separately published web preview, with poster,
captions, chapters and credits. `public_assets` points to a checksum-pinned Release
archive and an explicit file list; the builder verifies it before including media
in Pages. No production-specific content is copied into new-film starters or
methods. `landing.page` and `landing.assets` allow the generic page dependencies.
Its README and collection preview cards use actual film frames. The registry’s
`preview_showcase` routes README images, screening-shelf previews and the image
inside its detail dialog to the `screening` player anchor. The Collection card
opens the dialog, and its separate page link opens the complete style page.

Art Collage has a bilingual independent page at
`styles/art-collage/showcase/index.html`. Its original paper-and-type study,
visual rules and project starter are generic library sources. The full V11 film
is published as a 720p web preview with eight chapters, English captions, a
transcript, research notes and credits. Film-specific text and media come from
the checksum-pinned `art-collage-preview-v1` Release bundle; the production
folder and 1080p master remain external. README previews link directly to the screening room. Its Collection card
opens the shared style dialog, with a separate link to the full style page. The package is now `renderer-ready`, with reusable scene tools. Its sample source is a local bundle; only an excerpt rebuild is recorded.

Animated Line Chart Comedy has a bilingual independent page at
`styles/line-chart-comedy/showcase/index.html`. Its original, schematic chart study
lets visitors play, pause, scrub and jump between line reveal, event annotation,
close-up and pullback. The page starts paused and needs no external fonts, media
or production data. The registry provides English/Chinese preview artwork and a
`landing` entry for the Collection and README galleries. It is now `renderer-ready`, with published films and a pinned media bundle. Original sample source is a local bundle, with an excerpt rebuild recorded.

Microgame Frenzy has a bilingual independent page at
`styles/microgame/showcase/index.html`, registered through `landing` and linked
from All Styles and both README galleries. Following the whiteboard page’s
showcase, creation steps, prompt, build notes and reference structure, it adds
an original 16-second silent material study: Swiss print, indexed pixels,
character-built terminal and blueprint construction. Playback starts paused;
visitors can play, restart, scrub or select a material. The blueprint uses the repository’s licensed Architects Daughter
font; no remote media or production folder is needed. Its bilingual preview artwork is labelled as a
style study. The package is now `renderer-ready`, with published films. Sample source remains a local bundle; its recorded rebuild scope is an excerpt.

Art Deco has a bilingual independent page at
`styles/art-deco/showcase/index.html`. Its original 16-second silent Canvas study
uses the shared Art Deco material toolkit for hinged doors, articulated figures,
sequential lights and overhead ivory fans. It starts paused, supports playback,
seeking, chapter jumps and replay, and pauses when hidden or offscreen. The page
also includes palette and motion principles, project commands, a reusable prompt,
production notes and provenance. Locally hosted OFL fonts, the toolkit module and
all page assets are explicitly registered in `landing.assets`. English/Chinese
schematic preview SVGs link from the Collection, root README galleries and style
index. Art Deco is now `renderer-ready`, and published films use a pinned media bundle. Original source remains local; the recorded rebuild covers an excerpt.

LiDAR Survey has a bilingual independent page at
`styles/lidar-survey/showcase/index.html`, following Whiteboard's demonstration,
creation steps, prompt, build notes and reference structure. A silent 20-second
Canvas study shows fixed synthetic returns, canopy peeling, surface reveal, a
section and ghosted context. The page starts paused, supports play, restart,
seeking and chapter selection, and pauses offscreen or when hidden. All geometry
is labelled synthetic; no measurements or observations of a real place are implied.
The package is now `renderer-ready`; published films are registered separately from the synthetic study. Its sample source remains local and rebuild scope is an excerpt.
All Styles (including Geography), both root README galleries and the style index
link to the page. Bilingual search summaries also supply its generated guide
pages and sitemap entries. The generic page, preview SVGs, self-hosted OFL fonts and licence
notices are included through the registry. No upstream film or survey is republished.

Sci-Fi Sitcom Toon has a bilingual independent page at
`styles/scifi-sitcom/showcase/index.html`. Plum-black outlines, flat mint/coral/lilac
surfaces, oversized lettering and a cartoon television frame carry the visual
language of its style guide. The existing English film leads the page, with a
poster, shot selection and an MP4 link. A six-second, initially paused expression
study uses the style’s generic ink helper and two original neutral figures;
visitors can play, pause, restart, scrub or select a reaction beat. Playback stops
when the study leaves view or the page becomes hidden. The page also includes
visual principles, project creation, copyable prompts, production notes and
provenance. The former frame-review interface is retained at `comparison.html`.
All page dependencies and the locally hosted OFL display font are registered in
`landing.assets`. Films, reference material and timelines still come from the
existing pinned Release bundle. The package is now `renderer-ready`; the registry records a full sample rebuild, while source access remains a local bundle.

Crayon Picture Book now has a complete bilingual independent page at
`styles/crayon-book/showcase/index.html`. Following the Whiteboard page’s film,
creation, production-note and source structure, it uses warm paper, handwritten
titles, wax colours and original schematic material drawings. The retained
*Leo the Farmer* 720p web preview has fifteen chapter jumps, active-chapter
tracking, playback error feedback and its existing frame comparison. The page
also covers paper/pigment, drawing reveals and physical book motion, with shared
Agent prompts, a copyable creative brief, production guides and source credits.
English and Chinese page text share the same video and preserve playback when
switching languages. `landing.assets` registers the CSS and module; README
preview images and watch links open `#film`, while the style-page entry opens
the complete page. The checksum-pinned film bundle and review records are unchanged. Chinese
display text uses a locally hosted, renamed Xiaolai subset (Crayon Hand SC),
with fixed dry-pigment grain on large titles. The pinned generator verifies
source identity and all page glyphs; its OFL licence ships with the font.

## Prompt-first film creation

The homepage, style detail dialogs and registered style pages use
`catalog/agent-start.mjs` for the same bilingual entry point. Visitors copy a
natural-language brief for a new film or an exact sample recreation. An optional
setup prompt delegates cloning to the Agent. Project creation, environment setup
and production commands belong to the Agent; visitors stay in one conversation.
Exact replay still requires available original source inputs. The component
preserves each page's fonts and colors, follows its language switch and offers
manual text selection when clipboard access fails. Static prompt text remains
available if JavaScript does not load. The Pages builder includes and versions
the module, including routes on pages with retained-project base URLs.

Animated Line Chart Comedy has a bilingual independent page at
`styles/line-chart-comedy/showcase/index.html`. Its original, schematic chart study
lets visitors play, pause, scrub and jump between line reveal, event annotation,
close-up and pullback. The page starts paused and needs no external fonts, media
or production data. The registry provides English/Chinese preview artwork and a
`landing` entry for the Collection and README galleries. It remains an authoring
starter, with no published film registered. Only its generic page, assets and
guides enter the Pages build.

Microgame Frenzy has a bilingual independent page at
`styles/microgame/showcase/index.html`, registered through `landing` and linked
from All Styles and both README galleries. Following the whiteboard page’s
showcase, creation steps, prompt, build notes and reference structure, it adds
an original 16-second silent material study: Swiss print, indexed pixels,
character-built terminal and blueprint construction. Playback starts paused;
visitors can play, restart, scrub or select a material. The blueprint uses the repository’s licensed Architects Daughter
font; no remote media or production folder is needed. Its bilingual preview artwork is labelled as a
style study. The package remains a material toolkit without an accepted film.

Art Deco has a bilingual independent page at
`styles/art-deco/showcase/index.html`. Its original 16-second silent Canvas study
uses the shared Art Deco material toolkit for hinged doors, articulated figures,
sequential lights and overhead ivory fans. It starts paused, supports playback,
seeking, chapter jumps and replay, and pauses when hidden or offscreen. The page
also includes palette and motion principles, project commands, a reusable prompt,
production notes and provenance. Locally hosted OFL fonts, the toolkit module and
all page assets are explicitly registered in `landing.assets`. English/Chinese
schematic preview SVGs link from the Collection, root README galleries and style
index. Art Deco remains `toolkit-ready`; this page does not publish the retained
experimental films.

## Prompt-first film creation

The homepage, style detail dialogs and all twelve style pages use
`catalog/agent-start.mjs` for the same bilingual entry point. Visitors copy a
natural-language brief for a new film or an exact sample recreation. An optional
setup prompt delegates cloning to the Agent. Project creation, environment setup
and production commands belong to the Agent; visitors stay in one conversation.
Exact replay still requires available original source inputs. The component
preserves each page's fonts and colors, follows its language switch and offers
manual text selection when clipboard access fails. Static prompt text remains
available if JavaScript does not load. The Pages builder includes and versions
the module, including routes on pages with retained-project base URLs.

## Local style catalog

From the repository root:

```sh
python3 scripts/serve_styles.py --port 8249
```

Open **http://127.0.0.1:8249/** for the homepage. The server's
`catalog-availability.json` checks the actual entry file for each retained local
project. Local page links use the current local server, including a custom port.
Published players also work online. Crayon Book, Mid-century Cartoon, Satellite
Briefing and Sci-Fi Sitcom expose all nine existing entrances in both modes:
the catalog server reads retained originals, while Pages uses checksum-pinned
`style-showcases-v1` Release bundles. README previews and the public collection
open the online editions; explicit local-preview links use port 8249. A local
catalog with a missing production falls back to the published edition.

Mid-century Cartoon has short/long players and motion review. Satellite Briefing
has a player, live composition and frame comparison. Sci-Fi Sitcom has its independent style page and frame-review
player, Crayon Book has its player and frame comparison, and Caption News has a
chapter-enabled screening room in its independent style page. Their HTML lives in
`styles/<id>/showcase/`; whiteboard retains `styles/whiteboard/studio/`.

Sci-Fi Sitcom's current player uses a separate stable-motion media filename and
checksum-pinned bundle. Its fixed contours and settled poses replace the old
cycling-line export; the supplied reference remains unchanged inside the optional
reference section. The current revision record ships with the media bundle.
Historical visual-review claims apply only to their identified older export.

Each local `showcases` entry records a repository-relative `project` and original
`source_page`. The server maps `/_projects/<showcase-id>/...` to that project,
with byte-range support for video seeking. An explicitly listed `linked_files`
entry permits a retained file symlink such as the sci-fi reference video; other
paths remain inside their project. Original production files are preserved.
If a project is stored elsewhere, update its `project` path locally.

A fresh clone contains the page source and preview images. It does not contain
local films or private review assets. To replay whiteboard locally, download its
pinned Release assets with:

```sh
python3 scripts/fetch_demo.py --edition all
```

## Build and preview Pages

With Python 3.11 or later:

```sh
python3 scripts/build_pages.py
python3 styles/whiteboard/studio/scripts/serve.py --port 8248 --directory .site
```

Open <http://127.0.0.1:8248/>. Add `--asset-dir /path/to/release-files` to reuse
downloaded Release archives. The builder refuses to overwrite an existing output;
use `--output /path/to/a/new-folder` for another preview build.

The builder copies an explicit list of homepage assets, registered pages and
verified Release bundles. It includes the existing Whiteboard, Caption News and
Art Collage previews plus all nine Crayon Book, Mid-century Cartoon, Satellite
Briefing and Sci-Fi Sitcom pages. Production media and story-specific composition
dependencies stay in Release archives, outside Git source and new-film starters.

Each new bundle lists its exact files and maps retained `_projects/<id>/` routes
to one shared `_assets/` directory per style. The builder rewrites those routes,
root navigation and style links for `--base-path` (default `/codex-film-studio/`).
Use `--base-path /` for a root-hosted preview, or the fork's repository path for
a different GitHub Pages project. It removes private production paths from the
public catalog. `build-info.json` records the revision and pinned archive hashes.

Most online films are H.264/AAC previews up to 1280 × 720. The stable-motion
Sci-Fi Sitcom edition serves its compact 1920 × 1080 master directly, preserving
the original AAC without another compression pass. Frame comparison keeps
every indexed frame; web frame images and Crayon Book review stills are compressed
for delivery. Local original media and historical review records are preserved.
The online-edition notice distinguishes these proxies from the reviewed masters.
This publication does not constitute a new full-film visual or listening review.

Assets use relative paths, including under a project URL such as
`/codex-film-studio/`. The player keeps its own relative media paths, subtitles,
chapters, language and edition controls.

## Deploy

Publishing requires a user request. The existing workflow runs on a push to
`main` or **Deploy film showcase** in Actions. Set **Settings → Pages → Source →
GitHub Actions** first, then wait for both build and deployment jobs. Only the
deployment job has Pages write permission. A local build or preview is not
evidence of a successful public deployment.

To publish another film, add its approved assets and player deliberately; do not
copy a retained production directory into the Pages output.

## Finished films on style pages

Every primary style page leads with a final MP4. Interactive material studies
remain secondary. Microgame, Art Deco and Line Chart Comedy use the shared
`catalog/film-screening.mjs` player; film names, editions, captions and credits
come from `media/films.json` in each external, checksum-verified media bundle.

Local playback uses the same media URLs as Pages. Extract each approved bundle
into `../codex-film-studio-projects/style-page-media/<style-id>/`, or pass
`--media-root /absolute/path` to `scripts/serve_styles.py`. The local server only
serves files explicitly listed in that style's `demo-assets.json`, with byte-range
support for seeking. Generated MP4s and story metadata stay outside this library.
New bundle archives must be uploaded to their pinned Release before publishing
the corresponding website revision. Preparing a local build does not publish it.

The builder rejects sites over a conservative 1,000,000,000-byte budget, matching
the [GitHub Pages size limit](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
Use complete, smaller web encodes when adding films; retain the full-resolution
masters in the independent production. Bundle metadata reports the actual web
encode dimensions, and the film credits identify the web copy.
