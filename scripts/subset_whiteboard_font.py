#!/usr/bin/env python3
"""Build the whiteboard page's local handwriting font from a Xiaolai TTF.

Run with: uv tool run --from 'fonttools[woff]' python
scripts/subset_whiteboard_font.py /path/to/Xiaolai-Regular.ttf
"""
import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

STUDIO = Path(__file__).resolve().parents[1] / 'styles/whiteboard/studio'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_font', type=Path)
    args = parser.parse_args()
    # Include every translated page string so language/edition switching never
    # depends on an OS font. Latin glyphs are provided by Architects Daughter.
    text = (STUDIO / 'showcase-i18n.mjs').read_text(encoding='utf-8')
    codepoints = {ord(char) for char in text if ord(char) >= 0x3000}
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
    names = {1: 'Whiteboard Hand SC', 2: 'Regular',
             3: 'Whiteboard Hand SC Regular 1.0', 4: 'Whiteboard Hand SC Regular',
             6: 'WhiteboardHandSC-Regular', 16: 'Whiteboard Hand SC', 17: 'Regular'}
    for record in font['name'].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font.flavor = 'woff2'
    output = STUDIO / 'fonts/WhiteboardHandSC-Regular.woff2'
    font.save(output)
    print(f'{output}: {len(codepoints)} page glyphs, {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
