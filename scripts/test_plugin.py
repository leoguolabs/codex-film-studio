"""Exercise the shipped skill from a relocated install, outside the source tree."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from unittest.mock import patch

from frame_review.ffmpeg_gate import running_ffmpeg

from package_plugin import build, ROOT


class InstalledPluginTests(unittest.TestCase):
    def test_restricted_process_list_still_allows_the_shared_lock(self):
        with patch("subprocess.check_output", side_effect=PermissionError):
            self.assertEqual(running_ffmpeg(), [])

    def test_distribution_and_every_style(self):
        with tempfile.TemporaryDirectory(prefix="film plugin ") as temp:
            work = Path(temp) / "empty workspace"
            work.mkdir()
            output = build(Path(temp) / "distribution")
            market = json.loads((output / "marketplace/.agents/plugins/marketplace.json").read_text())
            entry, = market["plugins"]
            package = output / "marketplace" / entry["source"]["path"]
            manifest = json.loads((package / "plugin.json").read_text())
            legacy = json.loads((package / ".codex-plugin/plugin.json").read_text())
            self.assertEqual(entry["name"], manifest["name"])
            self.assertEqual(legacy["version"], manifest["version"])
            ext = manifest["extensions"]["com.openai"]
            self.assertTrue(ext["requires_local_executor"])
            self.assertEqual(legacy["interface"], ext["interface"])
            for key in ("logo", "composerIcon"):
                self.assertTrue((package / ext["interface"][key]).is_file())
            archive = output / f"{manifest['name']}-{manifest['version']}.zip"
            with zipfile.ZipFile(archive) as z:
                self.assertIsNone(z.testzip())
                self.assertEqual(set(z.namelist()), {
                    p.relative_to(package).as_posix() for p in package.rglob("*") if p.is_file()})
                for member in z.namelist():
                    self.assertFalse(set(Path(member).parts) & {
                        ".git", "node_modules", ".venv", ".env", "review", "media", "__pycache__"})
                install = Path(temp) / "relocated plugin"
                z.extractall(install)
            shutil.rmtree(output)
            launcher = [sys.executable, str(install / "skills/codex-film/studio.py")]
            listed = subprocess.check_output([*launcher, "list"], cwd=work, text=True)
            missing = subprocess.run([*launcher, "doctor", "--style", "whiteboard"],
                                     cwd=work, env={**os.environ, "PATH": ""}, capture_output=True, text=True)
            self.assertNotEqual(missing.returncode, 0)
            self.assertIn("install Node.js 22+", missing.stderr)
            self.assertIn("ffprobe missing", missing.stderr)
            catalog = json.loads((ROOT / "styles.json").read_text())
            studio = Path(subprocess.check_output([*launcher, "root"], cwd=work, text=True).strip())
            self.assertTrue(studio.is_relative_to(install.resolve()))
            self.assertEqual(json.loads((studio / "styles.json").read_text()), catalog)
            for style in catalog["styles"]:
                with self.subTest(style=style["id"]):
                    name = style["id"]
                    self.assertIn(name, listed)
                    subprocess.run([*launcher, "new", name, "--style", name], cwd=work,
                                   stdout=subprocess.DEVNULL, check=True)
                    project = work / name
                    self.assertTrue((project / "STYLE.md").is_file())
                    self.assertTrue((project / "tools/tts/edge_voice.py").is_file())
                    template = ROOT / style["template"]
                    files = subprocess.check_output(
                        ["git", "ls-files", "-z", "--", style["template"]], cwd=ROOT)
                    for item in files.decode().split("\0"):
                        if item:
                            self.assertTrue((project / (ROOT / item).relative_to(template)).is_file(), item)
                    if style["status"] == "renderer-ready":
                        self.assertTrue((project / "tools/runtime/build.py").is_file())
            bad = subprocess.run([*launcher, "new", "bad", "--style", "caption-news",
                                  "--output", str(install / "bad")], cwd=work, capture_output=True)
            self.assertNotEqual(bad.returncode, 0)
            self.assertFalse((install / "bad").exists())
