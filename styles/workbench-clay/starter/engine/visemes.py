"""Map timed IPA tokens to held clay replacement mouths on a shared exposure clock."""
from dataclasses import dataclass
import math


@dataclass(frozen=True)
class Mouth:
    jaw: float = .20
    round: float = .0
    spread: float = .0
    seal: float = .0
    bite: float = .0


CLOSED = Mouth(0, .10, .12, 1)
BITE = Mouth(.14, 0, .16, 0, .84)
ROUND = Mouth(.54, .81)
SMALL_ROUND = Mouth(.27, .95)
WIDE = Mouth(.70, 0, .61)
TALL = Mouth(.94, .10, .07)
MID = Mouth(.44, .11, .11)
NARROW = Mouth(.27, 0, .24)


def shape(symbol):
    if symbol in "bmp": return CLOSED
    if symbol in "fv": return BITE
    if symbol in "uwʊ": return SMALL_ROUND
    if symbol in "oɔɒ": return ROUND
    if symbol in "iɪeɛj": return WIDE
    if symbol in "aɑæʌ": return TALL
    if symbol in "əɜɚʒʃθð": return MID
    if symbol.isalpha(): return NARROW
    return None


class SpeechMouths:
    def __init__(self, lines, exposures_per_second=12.5):
        self.poses = {}
        self.rate = exposures_per_second
        for line in lines:
            tokens = line["phonemes"]
            # Stress markers borrow the shape of their following vowel.
            following = None
            events = []
            for symbol, start, end in reversed(tokens):
                part = following if symbol in "ˈˌː" else shape(symbol)
                if part:
                    events.append((start, end, part))
                following = part
            actor = line["actor"]
            for start, end, part in reversed(events):
                for frame in range(math.ceil(start*self.rate), math.ceil(end*self.rate)):
                    self.poses[actor, frame] = part
            # A lip stop shorter than one exposure still gets a complete closure.
            for start, end, part in events:
                if part is CLOSED or part is BITE:
                    middle = round((start+end)*.5*self.rate)
                    self.poses[actor, middle] = part

    def at(self, actor, seconds):
        return self.poses.get((actor, round(seconds*self.rate)))
