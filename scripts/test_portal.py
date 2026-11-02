"""Check the portal's deployment boundary and local availability reporting."""
import json
import re
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse

from build_pages import ROOT, build_site, fetch_showcase_bundle, rewrite_public_routes
from fetch_demo import sha
from serve_styles import catalog_availability, resolve_resource


class PortalTests(unittest.TestCase):
    def test_external_showcase_media_uses_allowlist_and_contains_symlinks(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'library'; root.mkdir()
            media_root = Path(temporary) / 'external'
            media = media_root / 'example/media'; media.mkdir(parents=True)
            (media / 'film.mp4').write_bytes(b'final film')
            (media / 'films.json').write_text('{}')
            (media / 'private.txt').write_text('not public')
            secret = Path(temporary) / 'outside.mp4'; secret.write_bytes(b'outside')
            (media / 'escape.mp4').symlink_to(secret)
            (root / 'bundle.json').write_text(json.dumps({'files': [
                'media/film.mp4', 'media/films.json', 'media/escape.mp4']}))
            catalog = {'styles': [{'id': 'example', 'public_assets': 'bundle.json',
                'landing': {'page': 'styles/example/showcase/index.html'},
                'showcases': [{'id': 'example-films',
                    'media_manifest': 'styles/example/showcase/media/films.json'}]}]}
            prefix = '/styles/example/showcase/media/'
            self.assertEqual(resolve_resource(prefix + 'film.mp4?v=revision', root, catalog, media_root),
                             (media / 'film.mp4').resolve())
            for relative in ['private.txt', 'escape.mp4', '../bundle.json', '%2e%2e/bundle.json']:
                self.assertIsNone(resolve_resource(prefix + relative, root, catalog, media_root))
            self.assertTrue(catalog_availability(root, catalog, media_root)['pages']['example-films'])

    def test_public_build_keeps_player_and_excludes_local_productions(self):
        with tempfile.TemporaryDirectory() as temporary:
            demo = Path(temporary) / 'verified-demo'
            catalog = json.loads((ROOT / 'styles.json').read_text())
            manifest = json.loads((ROOT / 'styles/whiteboard/demo-assets.json').read_text())
            for edition, entry in manifest['editions'].items():
                directory = demo / ('editions/long/media' if edition == 'long' else 'media')
                directory.mkdir(parents=True)
                for name in ['timeline.json', 'poster.jpg', 'captions.vtt', entry['video']['name']]:
                    (directory / name).write_bytes(b'verified fixture')
            output = Path(temporary) / 'public-site'
            published_roots = {}
            preview_movies = 0
            for style in catalog['styles']:
                if style.get('public_assets'):
                    bundle = json.loads((ROOT / style['public_assets']).read_text())
                    source = Path(temporary) / style['id']
                    for name in bundle['files']:
                        p = source / name
                        p.parent.mkdir(parents=True, exist_ok=True)
                        p.write_bytes(b'public preview fixture')
                        preview_movies += name.endswith('.mp4')
                    published_roots[style['id']] = source
            build_site(demo, output, 'portal-test', published_roots)
            homepage = (output / 'index.html').read_text()
            for asset in ['catalog/studio.mjs', 'catalog/studio.css', 'catalog/hero.svg',
                          'catalog/brand.css', 'catalog/brand/studio-logo.png']:
                self.assertIn(f'{asset}?v=portal-test', homepage)
            self.assertTrue((output / 'catalog/agent-start.mjs').is_file())
            # A <base> from a retained film must not redirect the shared entry
            # module into that production's media directory on GitHub Pages.
            for relative in ['index.html', 'styles/whiteboard/studio/index.html',
                             *[s['landing']['page'] for s in catalog['styles'] if s.get('landing')]]:
                document = (output / relative).read_text()
                page_url = 'https://example.com/codex-film-studio/' + relative
                base = re.search(r'<base href="([^"]+)"', document)
                module = re.search(r'<script[^>]+src="([^"]*catalog/agent-start\.mjs[^"]*)"', document)
                self.assertIsNotNone(module, relative)
                resolved = urlparse(urljoin(urljoin(page_url, base[1]) if base else page_url, module[1]))
                self.assertEqual(resolved.path, '/codex-film-studio/catalog/agent-start.mjs', relative)
                self.assertEqual(resolved.query, 'v=portal-test', relative)
            self.assertIn('showcase.mjs', (output / 'styles/whiteboard/studio/index.html').read_text())
            self.assertTrue((output / 'styles/whiteboard/studio/editions/long/media/captions.vtt').is_file())
            self.assertEqual(len(list(output.rglob('*.mp4'))), len(manifest['editions']) + preview_movies)
            self.assertTrue((output / 'styles/caption-news/showcase/media/film.mp4').is_file())
            self.assertTrue((output / 'styles/caption-news/showcase/media/manifest.json').is_file())
            public_catalog = json.loads((output / 'styles.json').read_text())
            self.assertEqual([s['id'] for s in catalog['styles']], [s['id'] for s in public_catalog['styles']])
            availability = json.loads((output / 'catalog-availability.json').read_text())
            self.assertEqual(availability['mode'], 'public')
            for style in public_catalog['styles']:
                if landing := style.get('landing'):
                    for name in [landing['page'], *landing['assets']]:
                        self.assertTrue((output / name).is_file(), name)
                self.assertNotIn('project', style.get('landing', {}))
                for key in ['preview', 'preview_zh', 'poster']:
                    if style.get(key):
                        with self.subTest(style=style['id'], asset=key):
                            preview = output / style[key]
                            self.assertTrue(preview.is_file())
                            if preview.suffix == '.svg':
                                # A copied file can still fail to decode in an <img>.
                                self.assertEqual(ET.parse(preview).getroot().tag,
                                                 '{http://www.w3.org/2000/svg}svg')
                for page in style.get('showcases', []):
                    for private_key in ['project', 'source_page', 'linked_files']:
                        self.assertNotIn(private_key, page)
                    self.assertEqual(availability['pages'][page['id']], page['access'] == 'release')
                    if page['access'] == 'local':
                        # A generic style page may ship without its local media.
                        self.assertEqual((output / page['page']).exists(),
                                         page['page'] == style.get('landing', {}).get('page'))
            caption = output / 'styles/caption-news/showcase/index.html'
            self.assertIn('showcase.mjs?v=portal-test', caption.read_text())
            self.assertFalse((output / '_projects').exists())
            self.assertFalse((output / 'productions').exists())
            self.assertFalse(list(output.rglob('combined-delivery-manifest.json')))
            for frame in json.loads((output / 'docs/readme/frames.json').read_text())['frames']:
                self.assertTrue((output / frame['image']).is_file())
                self.assertEqual(set(frame), {'style', 'image'})
            with self.assertRaises(FileExistsError):
                build_site(demo, output)

    def test_released_routes_work_at_root_and_under_project_path(self):
        source = '<base href="/_projects/film/editions/long/"><a href="/">Home</a><a href="/styles/example/index.html">Style</a><script src="/catalog/agent-start.mjs"></script>'
        mounts = {'film': 'styles/example/showcase/_assets'}
        for base in ['/', '/codex-film-studio/']:
            result = rewrite_public_routes(source, mounts, base)
            self.assertNotIn('/_projects/', result)
            self.assertIn(f'<base href="{base}styles/example/showcase/_assets/editions/long/">', result)
            self.assertIn(f'<a href="{base}">', result)
            self.assertIn(f'href="{base}styles/example/index.html"', result)
            self.assertIn(f'src="{base}catalog/agent-start.mjs"', result)

    def test_preview_download_verifies_checksum_and_approved_contents(self):
        import io
        import tarfile
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            assets = root / 'assets'; assets.mkdir()
            archive = assets / 'preview.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                entry = tarfile.TarInfo('media/film.mp4'); entry.size = 4
                tar.addfile(entry, io.BytesIO(b'film'))
                entry = tarfile.TarInfo('_assets/fonts/sample.ttf'); entry.size = 4
                tar.addfile(entry, io.BytesIO(b'font'))
            manifest = {'archive': {'name': archive.name, 'bytes': archive.stat().st_size,
                                    'sha256': sha(archive)},
                        'files': ['media/film.mp4', '_assets/fonts/sample.ttf']}
            stage = fetch_showcase_bundle(manifest, root / 'verified', assets)
            self.assertEqual((stage / 'media/film.mp4').read_bytes(), b'film')
            self.assertEqual((stage / '_assets/fonts/sample.ttf').read_bytes(), b'font')
            manifest['archive']['sha256'] = '0' * 64
            with self.assertRaisesRegex(ValueError, 'checksum'):
                fetch_showcase_bundle(manifest, root / 'bad', assets)
            self.assertFalse((root / 'bad/media/film.mp4').exists())

    def test_preview_archive_rejects_unapproved_and_unsafe_entries(self):
        import io
        import tarfile
        for kind in ['unlisted', 'traversal', 'absolute', 'symlink', 'duplicate']:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                assets = root / 'assets'; assets.mkdir()
                archive = assets / 'preview.tar.gz'
                name = {'traversal': '../escaped', 'absolute': '/escaped'}.get(kind, '_assets/file')
                with tarfile.open(archive, 'w:gz') as tar:
                    entry = tarfile.TarInfo(name)
                    if kind == 'symlink':
                        entry.type = tarfile.SYMTYPE; entry.linkname = '../escaped'
                        tar.addfile(entry)
                    else:
                        entry.size = 4
                        tar.addfile(entry, io.BytesIO(b'file'))
                        if kind == 'duplicate':
                            tar.addfile(entry, io.BytesIO(b'file'))
                manifest = {'archive': {'name': archive.name, 'bytes': archive.stat().st_size,
                                        'sha256': sha(archive)},
                            'files': [] if kind == 'unlisted' else [name]}
                with self.assertRaises(ValueError):
                    fetch_showcase_bundle(manifest, root / 'verified', assets)
                self.assertFalse(list((root / 'verified').rglob('*')))

    def test_local_availability_checks_entry_file_and_routes_portal_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'catalog').mkdir()
            (root / 'index.html').write_text('portal')
            (root / 'catalog/studio.css').write_text('body{}')
            (root / 'project').mkdir()
            catalog = {'styles': [{'showcases': [{'id': 'film', 'access': 'local',
                                                  'project': 'project', 'source_page': 'watch.html'}]}]}
            self.assertFalse(catalog_availability(root, catalog)['pages']['film'])
            (root / 'project/watch.html').write_text('player')
            catalog['styles'][0]['showcases'][0]['access'] = 'release'
            self.assertTrue(catalog_availability(root, catalog)['pages']['film'])
            self.assertEqual(resolve_resource('/_projects/film/watch.html', root, catalog),
                             (root / 'project/watch.html').resolve())
            self.assertEqual(resolve_resource('/', root, catalog), (root / 'index.html').resolve())
            self.assertEqual(resolve_resource('/catalog/studio.css', root, catalog), (root / 'catalog/studio.css').resolve())
            (root / 'private.txt').write_text('private')
            self.assertIsNone(resolve_resource('/catalog/../private.txt', root, catalog))
            self.assertIsNone(resolve_resource('/private.txt', root, catalog))


if __name__ == '__main__':
    unittest.main()
