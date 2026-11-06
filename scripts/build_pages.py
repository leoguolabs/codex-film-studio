#!/usr/bin/env python3
"""Build the style library and checksum-verified public sample previews."""
import argparse
import json
import re
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from urllib.parse import urlencode
from fetch_demo import sha
from build_search import build_search, DEFAULT_ORIGIN, REPO

ROOT = Path(__file__).resolve().parents[1]
STUDIO = ROOT / "styles/whiteboard/studio"


def fetch_showcase_bundle(manifest, destination, asset_dir=None):
    """Install a pinned public preview archive, separate from production sources."""
    asset = manifest['archive']
    destination.mkdir(parents=True, exist_ok=False)
    archive = destination.parent / asset['name']
    if asset_dir:
        shutil.copyfile(asset_dir / asset['name'], archive)
    else:
        request = urllib.request.Request(asset['url'], headers={'User-Agent': 'codex-film-studio'})
        with urllib.request.urlopen(request, timeout=120) as response, archive.open('wb') as handle:
            shutil.copyfileobj(response, handle)
    if archive.stat().st_size != asset['bytes'] or sha(archive) != asset['sha256']:
        raise ValueError(f"Release checksum mismatch: {asset['name']}")
    # A showcase may contain fonts, images and scripts as well as media. Verify
    # its entire allowlist before extracting; the whiteboard input unpacker only
    # accepts files under media/ and cannot install these preview bundles.
    with tarfile.open(archive, 'r:gz') as tar:
        members = tar.getmembers()
        names = [member.name for member in members]
        if len(names) != len(set(names)) or set(names) != set(manifest['files']):
            raise ValueError('Public preview archive differs from the approved file list')
        for member in members:
            path = PurePosixPath(member.name)
            if (path.is_absolute() or '..' in path.parts or not path.parts
                    or str(path) != member.name or not member.isfile()):
                raise ValueError(f'Unsupported preview archive entry: {member.name}')
        for member in members:
            target = destination / member.name
            target.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(member) as source, target.open('wb') as handle:
                shutil.copyfileobj(source, handle)
    actual = {str(p.relative_to(destination)) for p in destination.rglob('*') if p.is_file()}
    if actual != set(manifest['files']):
        raise ValueError('Public preview archive differs from the approved file list')
    return destination


def rewrite_public_routes(text, mounts, base_path):
    """Map retained-project URLs to verified assets under any Pages subpath."""
    prefix = '/' + base_path.strip('/') + '/' if base_path.strip('/') else '/'
    for route, destination in mounts.items():
        text = text.replace(f'/_projects/{route}/', prefix + destination.rstrip('/') + '/')
    text = re.sub(r'''(["'(])/(styles/|catalog/)''', lambda m: m[1] + prefix + m[2], text)
    text = re.sub(r'''(["'])/\1''', lambda m: m[1] + prefix + m[1], text)
    return text


def prepare_public_document(text, mounts, base_path, web_preview=False):
    text = rewrite_public_routes(text, mounts, base_path)
    if not web_preview:
        return text
    home = '/' + base_path.strip('/') + '/' if base_path.strip('/') else '/'
    notice = ('<aside style="padding:10px 18px;background:#eee7d8;color:#343258;'
              'font:14px/1.6 system-ui">'
              f'<a style="color:inherit" href="{home}">All styles / 全部风格</a> · Online edition · '
              'Films and review images are web previews. Full-resolution originals '
              'and review records remain in the local production. '
              '线上版为网络预览，原始分辨率素材和审阅记录保留在本地工程。</aside>')
    # Keep the finished film first; preview provenance belongs below the player.
    if '</body>' in text:
        return text.replace('</body>', notice + '</body>', 1)
    if '</main>' in text:
        return text.replace('</main>', '</main>' + notice, 1)
    return text.replace('</style>', '</style>' + notice, 1)


def build_site(demo_root, output, revision="", published_roots=None, base_path="/codex-film-studio/", site_origin=DEFAULT_ORIGIN):
    """Copy only the files needed by the public player, never a whole studio."""
    if output.exists():
        raise FileExistsError(output)
    published_roots = published_roots or {}
    source_files = [
        "index.html", "showcase.css", "showcase.mjs", "showcase-i18n.mjs",
        "fonts/ArchitectsDaughter-Regular.ttf", "fonts/WhiteboardHandSC-Regular.woff2",
        "fonts/OFL-Xiaolai.txt", "fonts/README-WhiteboardHandSC.md", "src/comparison.mjs",
        "content/comparison.json", "content/sources.json",
        "editions/long/content/comparison.json", "editions/long/content/sources.json",
    ]
    player_prefix = "styles/whiteboard/studio/"
    files = [(STUDIO / name, player_prefix + name) for name in source_files]
    # Keep the portal independent of the retained local productions. Only generic
    # library artwork and approved Release samples enter the Pages artifact.
    files.extend((ROOT / name, name) for name in [
        "index.html", "catalog/studio.css", "catalog/studio.mjs",
        "catalog/hero.svg", "catalog/mark.svg", "catalog/studio-header.css", "catalog/strings.mjs", "catalog/social-card.jpg",
        "catalog/film-screening.css", "catalog/film-screening.mjs",
        "catalog/agent-start.mjs",
        "catalog/brand.css", "catalog/brand/studio-logo.svg",
    ])
    # Public ownership proof downloaded from the owner's Search Console property.
    files.append((ROOT / "site-verification/google4f5a2a3073124a07.html", "google4f5a2a3073124a07.html"))
    catalog = json.loads((ROOT / "styles.json").read_text())
    mounts = {}
    public_pages = []
    for style in catalog["styles"]:
        if style.get('public_assets'):
            bundle = json.loads((ROOT / style['public_assets']).read_text())
            source = published_roots.get(style['id'])
            if source is None:
                raise FileNotFoundError(f"Verified public preview required: {style['id']}")
            mounts.update({key: str(Path(style['landing']['page']).parent / value)
                           for key, value in bundle.get('mounts', {}).items()})
            if bundle.get('mounts'):
                public_pages.extend(p['page'] for p in style.get('showcases', []))
            files.extend((source / name, str(Path(style['landing']['page']).parent / name))
                         for name in bundle['files'])
        # A generic style landing page can ship independently of its local film.
        # Only these explicitly registered sources enter the public artifact.
        if landing := style.get("landing"):
            files.extend((ROOT / name, name) for name in [landing["page"], *landing["assets"]])
        for key in ["preview", "preview_zh", "poster"]:
            if style.get(key):
                files.append((ROOT / style[key], style[key]))
        if style.get("landing"):
            style["landing"].pop("project", None)
        for page in style.get("showcases", []):
            for private_key in ["project", "source_page", "linked_files"]:
                page.pop(private_key, None)
    frame_manifest = ROOT / "docs/readme/frames.json"
    frames = json.loads(frame_manifest.read_text()).get("frames", []) if frame_manifest.exists() else []
    for frame in frames:
        files.append((ROOT / frame["image"], frame["image"]))
    files = list(dict.fromkeys(files))
    manifest = json.loads((ROOT / "styles/whiteboard/demo-assets.json").read_text())
    for edition, entry in manifest["editions"].items():
        prefix = "editions/long/" if edition == "long" else ""
        for name in ["timeline.json", "poster.jpg", "captions.vtt", entry["video"]["name"]]:
            relative = f"{prefix}media/{name}"
            files.append((demo_root / relative, player_prefix + relative))
    for source, _ in files:
        if not source.is_file():
            raise FileNotFoundError(source)
    # Refuse to overwrite a folder supplied by the caller.
    output.mkdir(parents=True, exist_ok=False)
    for source, relative in files:
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
    # Legacy players use origin-root routes and retained-project base URLs.
    # Rebase only the newly released pages and assets; local sources stay intact.
    for path in output.rglob('*'):
        if path.suffix in {'.html', '.css', '.mjs', '.json'} and path.is_file():
            original = path.read_text(encoding='utf-8')
            # Pinned Release archives retain their original bytes and hashes.
            # Their published media manifests must use the current repository.
            migrated = original.replace('https://github.com/visiontrail/codex-film-studio/', REPO + '/')
            relative = str(path.relative_to(output))
            web_preview = path.suffix == '.html' and (
                relative in public_pages or any(relative.startswith(prefix.rstrip('/') + '/')
                                                for prefix in mounts.values()))
            rewritten = (migrated if path.suffix == '.json' else
                         prepare_public_document(migrated, mounts, base_path, web_preview))
            if rewritten != original:
                path.write_text(rewritten, encoding='utf-8')
    if revision:
        # Pages caches static assets for ten minutes. A new HTML document must
        # request the scripts and styles belonging to this deployment.
        homepage = output / "index.html"
        html = homepage.read_text(encoding="utf-8")
        query = urlencode({"v": revision})
        for asset in ["catalog/studio.css", "catalog/studio.mjs", "catalog/hero.svg", "catalog/mark.svg"]:
            html = html.replace(f'"{asset}"', f'"{asset}?{query}"')
        homepage.write_text(html, encoding="utf-8")
        for style in catalog["styles"]:
            if landing := style.get("landing"):
                page = output / landing["page"]
                html = page.read_text(encoding="utf-8")
                for asset in landing["assets"]:
                    if Path(asset).parent == Path(landing["page"]).parent:
                        html = html.replace(f'"{Path(asset).name}"', f'"{Path(asset).name}?{query}"')
                for asset in ['film-screening.css', 'film-screening.mjs']:
                    html = html.replace(f'"../../../catalog/{asset}"', f'"../../../catalog/{asset}?{query}"')
                page.write_text(html, encoding="utf-8")
        # The shared prompt entry also appears on the legacy player and pages
        # with an external-project <base>, so version every HTML reference.
        for page in output.rglob('*.html'):
            html = page.read_text(encoding='utf-8')
            for asset in ['agent-start.mjs', 'studio-header.css', 'brand.css', 'brand/studio-logo.svg']:
                html = html.replace(f'catalog/{asset}"', f'catalog/{asset}?{query}"')
            page.write_text(html, encoding='utf-8')
    build_search(output, catalog, site_origin, base_path, revision)
    (output / ".nojekyll").touch()
    (output / "styles.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    (output / "docs/readme").mkdir(parents=True, exist_ok=True)
    (output / "docs/readme/frames.json").write_text(json.dumps({
        "frames": [{"style": frame["style"], "image": frame["image"]} for frame in frames],
    }, indent=2) + "\n")
    (output / "catalog-availability.json").write_text(json.dumps({
        "mode": "public",
        "pages": {page["id"]: page["access"] == "release"
                  for style in catalog["styles"] for page in style.get("showcases", [])},
    }, indent=2) + "\n")
    (output / "build-info.json").write_text(json.dumps({
        "revision": revision,
        "release": manifest["release"],
        "videos": {edition: entry["video"] for edition, entry in manifest["editions"].items()},
        "previews": {style['id']: json.loads((ROOT / style['public_assets']).read_text())['archive']
                     for style in catalog['styles'] if style.get('public_assets')},
    }, indent=2) + "\n")
    # https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
    total_bytes = sum(path.stat().st_size for path in output.rglob('*') if path.is_file())
    if total_bytes > 1_000_000_000:
        raise ValueError(f"Pages site exceeds the 1 GB budget: {total_bytes:,} bytes. "
                         "Optimize the web previews before publishing.")
    print(f"Built {len(files)} public assets in {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / ".site")
    parser.add_argument("--asset-dir", type=Path, help="Use locally downloaded Release files.")
    parser.add_argument("--base-path", default="/codex-film-studio/", help="Public URL prefix; use / for a root site.")
    parser.add_argument("--site-origin", default=DEFAULT_ORIGIN, help="Canonical HTTP(S) origin, without the project path.")
    parser.add_argument("--revision", default="", help="Source commit recorded in build-info.json.")
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError(f"Output already exists; choose a new directory: {args.output}")
    with tempfile.TemporaryDirectory(prefix="codex-film-pages-") as temporary:
        demo_root = Path(temporary) / "demo"
        command = [sys.executable, str(ROOT / "scripts/fetch_demo.py"),
                   "--edition", "all", "--target", str(demo_root)]
        if args.asset_dir:
            command.extend(["--asset-dir", str(args.asset_dir.resolve())])
        subprocess.run(command, check=True)
        published_roots = {}
        for style in json.loads((ROOT / 'styles.json').read_text())['styles']:
            if style.get('public_assets'):
                bundle = json.loads((ROOT / style['public_assets']).read_text())
                print(f"Downloading verified {style['id']} preview…", flush=True)
                published_roots[style['id']] = fetch_showcase_bundle(
                    bundle, Path(temporary) / style['id'], args.asset_dir)
        build_site(demo_root, args.output.resolve(), args.revision, published_roots, args.base_path, args.site_origin)


if __name__ == "__main__":
    main()
