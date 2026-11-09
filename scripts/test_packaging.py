"""Behavior checks for isolated film creation and safe demo installation."""
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from fetch_demo import unpack, install
from new_film import create, create_method, destination_for


class PackagingTests(unittest.TestCase):
    def test_new_film_excludes_rendered_media_and_preserves_existing_work(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "library"
            template = root / "styles/whiteboard/studio"
            (template / "media").mkdir(parents=True)
            (template / "media/film.mp4").write_bytes(b"private-development")
            (template / "film.mjs").write_text("export const film = true")
            for name in ["DIRECTOR.md", "TECHNIQUE.md"]:
                (root / name).write_text(name)
            (root / "styles/whiteboard/STYLE.md").write_text("Whiteboard")
            (root / "scripts/tts").mkdir(parents=True)
            (root / "scripts/tts/edge_voice.py").write_text("# shared voice tool")
            (root / "styles.json").write_text(json.dumps({"styles": [{
                "id": "whiteboard", "template": "styles/whiteboard/studio",
                "guide": "styles/whiteboard/STYLE.md"}]}))
            dest = create("test-film", "whiteboard", root)
            self.assertTrue((dest / "film.mjs").exists())
            self.assertEqual((dest / "tools/tts/edge_voice.py").read_text(), "# shared voice tool")
            self.assertEqual(dest, (root.parent / "library-projects" / "test-film").resolve())
            self.assertNotIn(root.resolve(), dest.parents)
            self.assertFalse((dest / "media").exists())
            (dest / "film.mjs").write_text("user edit")
            with self.assertRaises(FileExistsError):
                create("test-film", "whiteboard", root)
            self.assertEqual((dest / "film.mjs").read_text(), "user edit")
            with self.assertRaises(ValueError):
                create("../../outside", "whiteboard", root)

    def test_production_cannot_enter_library_through_a_symlink(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "library"
            root.mkdir()
            alias = Path(temp) / "alias"
            alias.symlink_to(root, target_is_directory=True)
            for output in [root, root / "films/new", alias / "new"]:
                with self.assertRaises(ValueError):
                    destination_for("new", root, output)

    def test_blank_method_creates_no_inherited_story_or_portrait(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "library"
            method = root / "styles/collage"
            (method / "starter/content").mkdir(parents=True)
            (method / "README.md").write_text("Reusable rules")
            (method / "STYLE.md").write_text("Collage rules")
            for name in ["DIRECTOR.md", "TECHNIQUE.md"]:
                (root / name).write_text(name)
            (root / "methods").mkdir()
            for name in ["WORKFLOW.md", "REVIEW.md"]:
                (root / "methods" / name).write_text(name)
            (root / "scripts/frame_review").mkdir(parents=True)
            (root / "scripts/frame_review/README.md").write_text("Review tools")
            (root / "styles.json").write_text(json.dumps({"styles": [{
                "id": "collage", "template": "styles/collage/starter",
                "guide": "styles/collage/STYLE.md", "template_kind": "blank"}]}))
            (method / "starter/content/characters.json").write_text('{"characters": []}')
            dest = create_method("new", "collage", root, Path(temp) / "my-project")
            self.assertEqual(json.loads((dest / "content/characters.json").read_text()), {"characters": []})
            self.assertEqual((dest / "METHOD.md").read_text(), "Reusable rules")
            self.assertFalse((dest / "content/narration.json").exists())
            with self.assertRaises(FileExistsError):
                create_method("new", "collage", root, dest)

    def test_changed_file_prevents_partial_install(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            stage, dest = root / "stage", root / "dest"
            stage.mkdir(); dest.mkdir()
            (stage / "a.txt").write_text("new")
            (stage / "z.txt").write_text("release")
            (dest / "z.txt").write_text("user")
            with self.assertRaises(FileExistsError):
                install(stage, dest)
            self.assertFalse((dest / "a.txt").exists())
            self.assertEqual((dest / "z.txt").read_text(), "user")

    def test_archive_rejects_traversal_and_links(self):
        for name, link in [("media/../../escape", False), ("media/link", True)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temp:
                root = Path(temp); archive = root / "bad.tar.gz"
                with tarfile.open(archive, "w:gz") as tar:
                    entry = tarfile.TarInfo(name)
                    if link:
                        entry.type = tarfile.SYMTYPE; entry.linkname = "/tmp/outside"
                        tar.addfile(entry)
                    else:
                        entry.size = 1; tar.addfile(entry, io.BytesIO(b"x"))
                with self.assertRaises(ValueError):
                    unpack(archive, root / "stage")


if __name__ == "__main__":
    unittest.main()
