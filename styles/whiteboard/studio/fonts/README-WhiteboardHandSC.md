# Whiteboard Hand SC

Chinese pen handwriting for the showcase page's blue title, margin question
and creation prompt. English lettering continues to use Architects Daughter.
The font is hosted with the page; no external font service is required.

- Source: [Xiaolai v3.126](https://github.com/lxgw/kose-font/releases/tag/v3.126)
  by LXGW, derived from SetoFont by Nozomi Seto.
- Input: `Xiaolai-Regular.ttf`, 22,220,806 bytes.
- Input SHA-256: `e2f68daf0e72777a8cf58bc83de1b98634b251e537ddbfca24b0ae50d1802da2`.
- License: SIL Open Font License 1.1, retained in `OFL-Xiaolai.txt` and the
  font's metadata. The subset is renamed Whiteboard Hand SC.
- Coverage: all CJK characters and full-width punctuation in
  `showcase-i18n.mjs`, including both film editions. Latin characters use
  Architects Daughter first in the CSS font stack.

After changing Chinese page copy, regenerate from the pinned upstream TTF:

```sh
uv tool run --from 'fonttools[woff]' python \
  scripts/subset_whiteboard_font.py /path/to/Xiaolai-Regular.ttf
```

Run from the repository root. The script checks source coverage, preserves
copyright/license metadata and writes `WhiteboardHandSC-Regular.woff2`.
Keep the full upstream font outside this library.
