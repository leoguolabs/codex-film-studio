"""Integration checks for the catalog, isolated projects and local media routes."""
from http.server import ThreadingHTTPServer
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from new_film import ROOT, create
from serve_styles import handler_for, resolve_resource
from update_style_index import render, render_gallery, replace_block


class CatalogTests(unittest.TestCase):
    def test_every_style_has_one_catalog_entry_with_real_capabilities(self):
        catalog = json.loads((ROOT / "styles.json").read_text())
        entries = catalog["styles"]
        ids = [s["id"] for s in entries]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), {p.name for p in (ROOT / "styles").iterdir() if p.is_dir()})
        self.assertFalse(any((ROOT / "methods" / slug).exists() for slug in ids))
        for entry in entries:
            with self.subTest(style=entry["id"]):
                self.assertIn(entry["status"], catalog["statuses"])
                self.assertEqual(entry["guide"], f"styles/{entry['id']}/STYLE.md")
                for key in ["guide", "prompt", "template"]:
                    self.assertTrue((ROOT / entry[key]).exists(), key)
                if entry.get('preview'):
                    self.assertTrue((ROOT / entry['preview']).is_file())
                    self.assertTrue((ROOT / entry['preview_zh']).is_file())
                    self.assertIn(entry['preview_kind'], ['frame', 'schematic'])
                    if entry['preview_kind'] == 'frame':
                        frames = json.loads((ROOT / 'docs/readme/frames.json').read_text())['frames']
                        source = next(item for item in frames if item['style'] == entry['id'])
                        image = ROOT / source['image']
                        self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(), source['image_sha256'])
                self.assertTrue(entry["capabilities"]["project_creation"])
                self.assertIn(entry['capabilities']['original_source'], ['public-inputs-and-repository','local-source-bundle','unavailable','not-audited'])
                self.assertIn(entry['capabilities']['sample_rebuild'], ['full','clip','not-yet-revalidated'])
                if entry['capabilities']['published_film']:
                    self.assertTrue(any(p['access']=='release' for p in entry['showcases']))
                if entry["capabilities"]["published_demo"]:
                    self.assertEqual(entry["status"], "demo-ready")
                    self.assertTrue((ROOT / entry["demo"]).is_file())
                if entry["capabilities"]["scene_renderer"]:
                    self.assertTrue((ROOT / entry["template"] / entry.get("render_script", "scripts/render.mjs")).is_file())
                for page in entry.get("showcases", []):
                    self.assertTrue((ROOT / page["page"]).is_file())
                    if page["access"] == "local":
                        self.assertIn(f'/_projects/{page["id"]}/', (ROOT / page["page"]).read_text())
        self.assertEqual((ROOT / "styles/README.md").read_text(), render(catalog))
        for filename, language in [('README.md', 'en'), ('README.zh-CN.md', 'zh')]:
            document = (ROOT / filename).read_text()
            self.assertEqual(document, replace_block(document, 'style-atlas', render_gallery(catalog, language, include_resource_links=False)))

    def test_all_styles_create_independent_projects_without_showcases(self):
        entries = json.loads((ROOT / "styles.json").read_text())["styles"]
        with tempfile.TemporaryDirectory() as temp:
            for entry in entries:
                with self.subTest(style=entry["id"]):
                    output = Path(temp) / entry["id"]
                    result = create("fresh-film", entry["id"], output=output)
                    self.assertEqual(result, output.resolve())
                    self.assertTrue((result / "STYLE.md").is_file())
                    self.assertTrue((result / "prompt.txt").is_file())
                    self.assertFalse((result / "showcase").exists())
                    for name in ["README.md", "reference-adaptation.md", "media-selection.md",
                                 "revision-delivery.md", "WORKFLOW.md", "REVIEW.md"]:
                        method = result / "methods" / name
                        self.assertTrue(method.is_file(), name)
                        for link in re.findall(r"\]\(([^)]+)\)", method.read_text()):
                            if not link.startswith(("https://", "http://", "#")):
                                self.assertTrue((method.parent / link.split("#")[0]).exists(), (name, link))
                    self.assertTrue((result / "tools/frame_review/ffmpeg_gate.py").is_file())
                    if entry["template_kind"] == "blank":
                        for name in ["README.md", "WORKFLOW.md", "REVIEW.md", "METHOD.md"]:
                            self.assertTrue((result / name).is_file(), name)
                            for link in re.findall(r"\]\(([^)]+)\)", (result / name).read_text()):
                                if not link.startswith(("https://", "http://", "#")):
                                    self.assertTrue((result / link.split("#")[0]).exists(), (name, link))
                        self.assertTrue((result / "tools/frame_review/audit_frames.py").is_file())
                        self.assertFalse(any(result.rglob("*.mp4")))
                        self.assertFalse(any(result.rglob("*.wav")))
                    marker = result / "user-note.txt"
                    marker.write_text("preserve me")
                    with self.assertRaises(FileExistsError):
                        create("fresh-film", entry["id"], output=output)
                    self.assertEqual(marker.read_text(), "preserve me")

    def test_command_lists_styles_and_preserves_method_alias(self):
        listing = subprocess.run([sys.executable, str(ROOT / "scripts/new_film.py"), "--list"],
                                 text=True, capture_output=True, check=True)
        for entry in json.loads((ROOT / "styles.json").read_text())["styles"]:
            self.assertIn(entry["id"], listing.stdout)
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "film"
            result = subprocess.run([sys.executable, str(ROOT / "scripts/new_film.py"),
                                     "film", "--method", "art-collage", "--output", str(output)],
                                    text=True, capture_output=True, check=True)
            self.assertIn("deprecated", result.stderr)
            self.assertTrue((output / "lib/paper.mjs").is_file())


class ShowcaseServerTests(unittest.TestCase):
    def test_local_media_ranges_and_path_boundaries(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "library"
            project = Path(temp) / "retained-project"
            root.mkdir(); project.mkdir()
            (project / "clip.mp4").write_bytes(bytes(range(100)))
            (project / "outside").symlink_to(Path(temp))
            (Path(temp) / "reference.mp4").write_bytes(b"reference")
            (project / "reference.mp4").symlink_to(Path(temp) / "reference.mp4")
            catalog = {"styles": [{"showcases": [{"id": "film", "access": "local",
                                                   "project": "../retained-project",
                                                   "linked_files": ["reference.mp4"]}]}]}
            (root / "styles.json").write_text(json.dumps(catalog))
            self.assertIsNone(resolve_resource('/_projects/film/../secret', root, catalog))
            self.assertIsNone(resolve_resource('/_projects/film/outside/library/styles.json', root, catalog))
            self.assertIsNone(resolve_resource('/_projects/unknown/clip.mp4', root, catalog))
            self.assertIsNone(resolve_resource('/.git/config', root, catalog))
            self.assertEqual(resolve_resource('/_projects/film/reference.mp4', root, catalog),
                             (Path(temp) / 'reference.mp4').resolve())
            server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(root))
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                url = f'http://127.0.0.1:{server.server_port}/_projects/film/clip.mp4'
                for value, expected in [('bytes=10-19', bytes(range(10, 20))),
                                        ('bytes=-3', bytes(range(97, 100)))]:
                    with urlopen(Request(url, headers={'Range': value})) as response:
                        self.assertEqual(response.status, 206)
                        self.assertEqual(response.read(), expected)
                with self.assertRaises(HTTPError) as failure:
                    urlopen(Request(url, headers={'Range': 'bytes=200-'}))
                self.assertEqual(failure.exception.code, 416)
                failure.exception.close()
            finally:
                server.shutdown(); server.server_close(); worker.join()


if __name__ == '__main__':
    unittest.main()
