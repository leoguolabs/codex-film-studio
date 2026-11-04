#!/usr/bin/env python3
"""Apply the original Offset Frames mark to a retained Canvas production.

This edits local drawing sources only. It neither renders media nor alters
the Git index, narration, audio, timelines, factual logos or national flags.
"""
import argparse
from pathlib import Path
import shutil

LIBRARY = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', type=Path, required=True)
    args = parser.parse_args()
    root = args.project.resolve()
    primitive = root / 'src/print.mjs'
    text = primitive.read_text()
    if "export function star(c,x,y,r," not in text:
        raise ValueError('Expected Canvas print primitives were not found')
    shutil.copy2(LIBRARY / 'styles/midcentury-cartoon/identity/studio-mark.mjs',
                 root / 'src/studio-mark.mjs')
    if "from './studio-mark.mjs'" not in text:
        text = "import { frameMark } from './studio-mark.mjs'\nexport { frameMark }\n" + text
    text = text.replace('star(c,x-w/2+27,y+1,12,P.coral,8)',
                        'frameMark(c,x-w/2+27,y+1,12,P.coral)')
    text = text.replace('star(c,(1920-w)/2+31,984,16,P.coral,8,t*.08)',
                        'frameMark(c,(1920-w)/2+31,984,16,P.coral)')
    text = text.replace('star(c,(1920+w)/2-31,984,16,P.coral,8,-t*.08)',
                        'frameMark(c,(1920+w)/2-31,984,16,P.coral)')
    primitive.write_text(text)
    scenes = [root / 'src/film.mjs', root / 'editions/long/src/film.mjs']
    for file in scenes:
        if not file.exists():
            continue
        text = file.read_text()
        text = text.replace('star(c,0,0,130,color,16)',
                            'rect(c,-130,-100,260,200,color,24,{w:3.5,seed:18})')
        text = text.replace(',star,', ',frameMark,').replace('star(c,', 'frameMark(c,')
        file.write_text(text)
    print('Updated print ornaments and scene accents; factual symbols unchanged.')


if __name__ == '__main__':
    main()
