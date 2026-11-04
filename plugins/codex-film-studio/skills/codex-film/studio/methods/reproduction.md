# Preserve a reproducible style

There are two independent delivery paths:

1. **New subject:** create a blank external project with `scripts/new_film.py`.
   Its pinned dependencies, fonts, material helpers and executable runtime move
   with it. Author new scenes, source imagery, accepted recordings and timing.
   Run the diagnostic material proof before production. It is not a film or a
   reference-match verdict.
2. **Same sample:** restore an external source bundle with
   `python3 scripts/new_film.py NAME --style STYLE --replay-bundle /path/to/bundle`.
   Verify the file list and follow the recorded setup/render commands in the
   restored `REPRODUCTION.json`. No code or dependency installer runs on restore.
   A bundle contains the original composition and inputs. A showcase media
   archive containing MP4s alone is insufficient for this purpose.

Create a source bundle with `scripts/reproduction.py seal SOURCE OUTPUT
--recipe RECIPE.json`. The recipe is an external production record containing
`style`, an explicit `files` list, dependency/setup/render commands, source
provenance, platform constraints, and any relocation changes. Use project-relative
paths. Include source, accepted audio, alignment, source images, fonts and license
notices, settings, random seeds, data, dependency locks and the exact scene clock.
Exclude credentials, provider job payloads, dependency directories, disposable
render caches and obsolete revisions. Preserve any inputs currently reached
through another checkout inside the new project and repair those imports there.

The tool hashes every file before copying, verifies the copy, rejects changed or
unlisted files on restore, and refuses existing destinations. Keep the bundle
outside the library. Run `python3 scripts/reproduction.py check BUNDLE` after
moving or backing it up. Back up the entire bundle directory, not just its JSON.
Publishing such a bundle requires a separate publication request and asset-rights
review; local source preservation does not publish it.

Record validation in the external production: fresh dependency installation,
rendered native stills at meaningful intervals, encoded motion previews, complete
decode, frame clock, fonts and audio checks. Compare actual native pixels against
the accepted production when available. Preserve OS-font requirements explicitly;
replacing a proprietary system font changes appearance and is not exact replay.
Byte-identical encoding is not promised across encoder versions or platforms.
Keep technical evidence, visual inspection, playback and listening separate.

## Portable archives and acquisition

A sealed directory can now be packaged as a deterministic `.tar.gz`. File hashes
protect project contents; the archive hash additionally pins the recipe itself.
Obtain that hash from the bundle supplier's release index, not from the downloaded
archive alone. Both local files and HTTPS URLs use the same acquisition entry:

```sh
python3 scripts/reproduction.py archive /external/bundle /external/sample-source.tar.gz
python3 scripts/reproduction.py acquire /external/sample-source.tar.gz /external/unpacked --sha256 SHA256_FROM_INDEX
python3 scripts/new_film.py replay --style STYLE --replay-bundle /external/unpacked
```

Acquisition rejects traversal, symlinks, duplicate entries, unlisted files and
checksum mismatches, and never overwrites an existing destination. It does not
execute the recipe. In the restored project read `REBUILD.md`, run its setup,
preview and full commands, then retain the technical receipt alongside the MP4.
A completed clip is reported as **clip**, never a complete sample rebuild.
Local source availability does not imply public download availability.

Each file record may contain a boolean `executable` flag. New seals preserve this
intent as mode 0755 for executable files and 0644 for other files through archive,
acquisition and restore. Setuid, setgid and group/world write bits are never
restored. Legacy schema-1 records without the flag remain readable and default
to 0644; reseal original inputs to recover executable intent. Tar header modes
cannot override the checksum-pinned manifest.

`styles.json` capability schema 2 separates `published_film`, `scene_renderer`,
`original_source`, `sample_rebuild`, and `new_film_scope`. `published_demo` remains
the legacy bundled-demo flag for compatibility. `renderer-ready` means reusable
style tools and an executable pipeline; it does not promise automatic story
illustration, an accepted new film, or complete reconstruction of every edition.

A supplier index can select the archive and checksum without manually copying
hashes. The index has `bundles: [{style, file, sha256, bytes, url?}]`; archives sit
beside a local index, or use explicit HTTPS release URLs after publication.

```sh
python3 scripts/fetch_source.py --index /external/source-packs/index.json --style STYLE --output /external/sample-source
python3 scripts/new_film.py sample-replay --style STYLE --replay-bundle /external/sample-source
```

Keep `index.json` with the archives when moving them. A local candidate index
contains no invented download URL. A public media manifest is a different input
and cannot be passed to `fetch_source.py` as a source release.
