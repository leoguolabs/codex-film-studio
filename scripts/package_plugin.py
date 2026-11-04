#!/usr/bin/env python3
"""Build a self-contained Git marketplace tree and a deterministic submission ZIP."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SKILL = Path(".agents/skills/codex-film")
LIBRARY_FILES = {
    "DIRECTOR.md", "TECHNIQUE.md", "LICENSE", "MEDIA-LICENSE.md", "styles.json",
    "scripts/new_film.py", "scripts/fetch_demo.py", "scripts/fetch_source.py",
    "scripts/reproduction.py", "scripts/subset_whiteboard_font.py",
    "scripts/apply_midcentury_identity.py", "scripts/audit_identity_revision.py",
}


def build(out):
    out = Path(out).resolve()
    if out == ROOT or ROOT in out.parents or out.exists():
        raise ValueError("Choose a new output directory outside the checkout.")
    manifest = json.loads((ROOT / "packaging/plugin.json").read_text())
    name, version = manifest["name"], manifest["version"]
    market = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
    entry, = market["plugins"]
    if entry["name"] != name or entry["source"]["ref"] != f"plugin-v{version}":
        raise ValueError("Marketplace source must match the plugin name and version.")
    entry["source"] = {"source": "local", "path": f"./plugins/{name}"}
    catalog = json.loads((ROOT / "styles.json").read_text())
    style_ids = {s["id"] for s in catalog["styles"]}
    # Git is needed only by maintainers. Ship tracked production resources, never
    # local provider settings, credentials, node_modules or generated projects.
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent) as temp:
        stage = Path(temp) / "build"
        package = stage / "marketplace/plugins" / name
        skill = package / "skills/codex-film"
        studio = skill / "studio"

        def copy(src, dest):
            dest.parent.mkdir(parents=True, exist_ok=True)
            if src.is_symlink():
                raise ValueError(f"Plugin inputs must be regular files: {src}")
            shutil.copyfile(src, dest)

        for item in filter(None, tracked):
            path = Path(item)
            parts = path.parts
            if path.is_relative_to(SKILL):
                copy(ROOT / path, skill / path.relative_to(SKILL))
            elif (item in LIBRARY_FILES or parts[0] in {"runtime", "methods"}
                  or item.startswith(("scripts/frame_review/", "scripts/tts/"))
                  or (len(parts) >= 3 and parts[0] == "styles" and parts[1] in style_ids
                      and parts[2] not in {"showcase", "tests"})):
                copy(ROOT / path, studio / path)
        for required in [skill / "SKILL.md", skill / "studio.py", studio / "scripts/new_film.py",
                         *(studio / s["guide"] for s in catalog["styles"]),
                         *(studio / s["template"] for s in catalog["styles"])]:
            if not required.exists():
                raise ValueError(f"Missing tracked input: {required.relative_to(package)}")
        copy(ROOT / "LICENSE", package / "LICENSE")
        media_license = (ROOT / "MEDIA-LICENSE.md").read_text().replace(
            "](styles/", "](skills/codex-film/studio/styles/")
        (package / "MEDIA-LICENSE.md").write_text(media_license, encoding="utf-8")
        copy(ROOT / "catalog/brand/studio-logo.svg", package / "assets/studio-logo.svg")
        copy(ROOT / "packaging/plugin.json", package / "plugin.json")
        copy(ROOT / "docs/plugin.md", package / "README.md")
        copy(ROOT / "docs/plugin-privacy.md", package / "PRIVACY.md")
        # Older Codex clients read the compatibility manifest. Generate it from
        # the portable source so listing text, version and paths stay in sync.
        legacy = {k: v for k, v in manifest.items() if k not in {"$schema", "extensions"}}
        ext = manifest["extensions"]["com.openai"]
        legacy.update(skills="./skills/", interface=ext["interface"],
                      requires_local_executor=ext["requires_local_executor"],
                      extensions={"com.openai": {"publication": ext["publication"]}})
        def write_json(path, data):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        write_json(package / ".codex-plugin/plugin.json", legacy)
        write_json(stage / "marketplace/.agents/plugins/marketplace.json", market)
        with zipfile.ZipFile(stage / f"{name}-{version}.zip", "w") as archive:
            for path in sorted(package.rglob("*")):
                if path.is_file():
                    info = zipfile.ZipInfo(path.relative_to(package).as_posix())
                    info.create_system = 3
                    info.external_attr = 0o100644 << 16
                    archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
        stage.rename(out)
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    print(build(parser.parse_args().output))
