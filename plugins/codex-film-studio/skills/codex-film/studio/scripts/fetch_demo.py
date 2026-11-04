#!/usr/bin/env python3
"""Download pinned demo inputs and MP4s without overwriting changed local files."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def unpack(archive, stage):
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar.getmembers():
            p = PurePosixPath(member.name)
            if (p.is_absolute() or ".." in p.parts or not p.parts
                    or p.parts[0] != "media" or not member.isfile()):
                raise ValueError(f"Unsupported archive entry: {member.name}")
            target = stage.joinpath(*p.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(member) as source, target.open("wb") as out:
                shutil.copyfileobj(source, out)


def install(stage, destination):
    files = sorted(p for p in stage.rglob("*") if p.is_file())
    for source in files:
        target = destination / source.relative_to(stage)
        # Check all conflicts before copying any file.
        if target.exists() and (not target.is_file() or sha(target) != sha(source)):
            raise FileExistsError(f"Changed file preserved: {target}. Use a fresh working copy.")
        if destination.resolve() not in target.resolve().parents:
            raise ValueError(f"Destination escapes through a symlink: {target}")
    for source in files:
        target = destination / source.relative_to(stage)
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copy2(source, target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--edition", choices=["short", "long", "all"], default="short")
    parser.add_argument("--target", type=Path, default=ROOT / "styles/whiteboard/studio")
    parser.add_argument("--asset-dir", type=Path, help="Use already downloaded Release files.")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "styles/whiteboard/demo-assets.json").read_text())
    editions = ["short", "long"] if args.edition == "all" else [args.edition]
    for edition in editions:
        entry = manifest["editions"][edition]
        target = args.target.resolve() / ("editions/long" if edition == "long" else "")
        with tempfile.TemporaryDirectory(prefix="codex-film-demo-") as temporary:
            temp = Path(temporary)
            stage = temp / "stage"
            stage.mkdir()
            for kind in ["inputs", "video"]:
                asset = entry[kind]
                downloaded = temp / asset["name"]
                if args.asset_dir:
                    shutil.copy2(args.asset_dir / asset["name"], downloaded)
                else:
                    print(f"Downloading {asset['name']}…", flush=True)
                    request = urllib.request.Request(asset["url"], headers={"User-Agent": "codex-film-studio"})
                    with urllib.request.urlopen(request, timeout=120) as response, downloaded.open("wb") as out:
                        shutil.copyfileobj(response, out)
                if downloaded.stat().st_size != asset["bytes"] or sha(downloaded) != asset["sha256"]:
                    raise ValueError(f"Release checksum mismatch: {asset['name']}")
                if kind == "inputs":
                    unpack(downloaded, stage)
                else:
                    (stage / "media").mkdir(exist_ok=True)
                    shutil.copy2(downloaded, stage / "media" / asset["name"])
            target.mkdir(parents=True, exist_ok=True)
            install(stage, target)
        print(f"Verified {edition} demo installed in {target}")


if __name__ == "__main__":
    main()
