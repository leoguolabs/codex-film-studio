#!/usr/bin/env python3
"""Import one supplied WAV per narration ID, preserving exact bytes and hashes."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import wave
from production import production, add_edition_argument


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    add_edition_argument(parser)
    args = parser.parse_args()
    root = production(args.edition).root
    narration = json.loads((root / "content/narration.json").read_text())
    planned = []
    for row in narration:
        source = args.directory / f"{row['id']}.wav"
        with wave.open(str(source), "rb") as wav:
            if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getcomptype() != "NONE":
                raise ValueError(f"{source.name}: expected mono 16-bit PCM WAV.")
            if wav.getnframes() == 0:
                raise ValueError(f"Empty WAV: {source.name}")
            duration = wav.getnframes() / wav.getframerate()
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        relative = f"media/audio/{row['id']}-import-{digest[:12]}.wav"
        planned.append((source, root / relative, {
            **row, "path": relative, "duration": duration,
            "audio_sha256": digest,
            "source_sha256": hashlib.sha256(row["text"].encode()).hexdigest(),
            "voice": "user-supplied", "speed": 1.0,
        }))
    directory = root / "media/audio"
    directory.mkdir(parents=True, exist_ok=True)
    manifest = directory / "manifest.json"
    if manifest.exists():
        old = manifest.read_bytes()
        backup = directory / f"manifest-{hashlib.sha256(old).hexdigest()[:12]}.json"
        if not backup.exists():
            backup.write_bytes(old)
    for source, target, row in planned:
        if not target.exists():
            shutil.copy2(source, target)
    temporary = directory / "manifest.importing"
    temporary.write_text(json.dumps([row for _, _, row in planned], indent=2) + "\n")
    temporary.replace(manifest)
    print(f"Imported {len(planned)} WAVs. Run scripts/transcribe.py before a final build.")


if __name__ == "__main__":
    main()
