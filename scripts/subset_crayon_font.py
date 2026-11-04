#!/usr/bin/env python3
"""Subset the pinned Xiaolai font for the Crayon Picture Book showcase.

uv tool run --from 'fonttools[woff]' python scripts/subset_crayon_font.py /path/to/Xiaolai-Regular.ttf
"""
import argparse
import hashlib
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'styles/crayon-book/showcase'
SOURCE_SHA256 = 'e2f68daf0e72777a8cf58bc83de1b98634b251e537ddbfca24b0ae50d1802da2'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_font', type=Path)
    args = parser.parse_args()
    if hashlib.sha256(args.source_font.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError('Expected the complete Xiaolai v3.126 release font')
    # Include both static and translated strings, including shared Agent prompts.
    sources = [PAGE / 'index.html', PAGE / 'showcase.mjs', ROOT / 'catalog/agent-start.mjs']
    codepoints = {ord(char) for source in sources for char in source.read_text()
                  if ord(char) >= 0x2e80}
    font = TTFont(args.source_font, recalcTimestamp=False)
    missing = codepoints - font.getBestCmap().keys()
    if missing:
        raise ValueError('Missing page glyphs: ' + ''.join(chr(n) for n in sorted(missing)))
    options = subset.Options()
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    names = {1: 'Crayon Hand SC', 2: 'Regular', 3: 'Crayon Hand SC Regular 1.0',
             4: 'Crayon Hand SC Regular', 6: 'CrayonHandSC-Regular',
             16: 'Crayon Hand SC', 17: 'Regular'}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font.flavor = 'woff2'
    output = PAGE / 'fonts/CrayonHandSC-Regular.woff2'
    output.parent.mkdir(exist_ok=True)
    font.save(output)
    print(f'{output}: {len(codepoints)} CJK glyphs, {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
