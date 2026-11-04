# Crayon Hand SC

Locally hosted Chinese handwriting for the Crayon Picture Book showcase’s
titles, margin note, section headings and creative prompt. Latin lettering
continues to use Gaegu. The dry-pigment mask is a separate, fixed SVG texture;
the text stays selectable, searchable and accessible.

- Source: [Xiaolai v3.126](https://github.com/lxgw/kose-font/releases/tag/v3.126)
  by LXGW, derived from SetoFont by Nozomi Seto.
- Input: `Xiaolai-Regular.ttf`, 22,220,806 bytes.
- SHA-256: `e2f68daf0e72777a8cf58bc83de1b98634b251e537ddbfca24b0ae50d1802da2`.
- Licence: SIL Open Font License 1.1, retained in `OFL-Xiaolai.txt` and the font
  metadata. This subset is renamed Crayon Hand SC.
- Coverage: CJK characters and full-width punctuation in the showcase HTML,
  its translation module and the shared Agent prompt component. The generator
  checks every required glyph before writing the subset.

After changing Chinese copy, regenerate from the pinned complete upstream font:

```sh
uv tool run --from 'fonttools[woff]' python \
  scripts/subset_crayon_font.py /path/to/Xiaolai-Regular.ttf
```

Keep the upstream TTF outside the library. The WOFF2 subset, licence and fixed
grain mask are registered in `landing.assets` for the public Pages build.
