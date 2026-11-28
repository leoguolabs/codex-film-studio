"""Entry point for a single RGB frame of the authored book (bottom row first)."""
import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BOOK = json.loads((ROOT/'content/book.json').read_text())
DURATION = BOOK['duration']

@lru_cache(maxsize=2)
def _stage(width, height):
    from engine.book import Book
    if not BOOK['stages']:
        raise ValueError('Author at least one printed stage first.')
    return Book(ROOT, BOOK, width, height)

def frame(seconds, width=1920, height=1080):
    return _stage(width, height).frame(seconds)
