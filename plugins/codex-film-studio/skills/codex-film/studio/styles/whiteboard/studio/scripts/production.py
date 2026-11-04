"""Resolve edition-specific artifacts while sharing fonts, samples and reference."""
from dataclasses import dataclass
from pathlib import Path

STUDIO = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Production:
    name: str
    root: Path
    movie_name: str

    @property
    def video(self):
        return self.root/"media"/self.movie_name


def add_edition_argument(parser):
    parser.add_argument("--edition", choices=("short", "long"), default="short",
                        help="Keep each edition's media and review evidence separate.")


def production(name):
    if name == "short":
        return Production(name, STUDIO, "does-ai-help-you-learn-3min.mp4")
    if name == "long":
        return Production(name, STUDIO/"editions/long", "does-ai-help-you-learn-long.mp4")
    raise ValueError(f"Unknown edition: {name}")
