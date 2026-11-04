#!/usr/bin/env python3
"""Compatibility entrypoint; prefer scripts/new_film.py --style scifi-sitcom."""
import sys
from pathlib import Path

LIBRARY = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(LIBRARY / "scripts"))
from new_film import create as create_style, main


def create(name, output=None):
    return create_style(name, "scifi-sitcom", root=LIBRARY, output=output)


if __name__ == "__main__":
    sys.argv.extend(["--style", "scifi-sitcom"])
    main()
