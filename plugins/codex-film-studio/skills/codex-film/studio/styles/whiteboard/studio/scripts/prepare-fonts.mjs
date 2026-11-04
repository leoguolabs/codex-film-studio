import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {svgPathProperties} from 'svg-path-properties'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
await mkdir(path.join(root, 'fonts'), {recursive: true})
const source = path.join(root, 'fonts/EMSTech.svg')
const xml = await readFile(source, 'utf8')
const attrs = text => Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(x => [x[1], x[2]]))
const unescape = s => s.replace(/&#x([0-9a-f]+);/gi, (_, v) => String.fromCodePoint(parseInt(v,16)))
  .replace(/&#(\d+);/g, (_, v) => String.fromCodePoint(+v))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
const font = {source: 'hersheytext@2.0.0/svg_fonts/EMSTech.svg', glyphs: {}}
const face = attrs(xml.match(/<font-face\b([^>]*)/)?.[1] || '')
font.unitsPerEm = +(face['units-per-em'] || 1000)
font.ascent = +face.ascent
font.descent = +face.descent
font.capHeight = +(face['cap-height'] || 700)
const defaultAdvance = +(attrs(xml.match(/<font\b([^>]*)/)?.[1] || '')['horiz-adv-x'] || 600)
for (const match of xml.matchAll(/<glyph\b([^>]*?)(?:\/>|>)/gs)) {
  const a = attrs(match[1])
  if (!a.unicode) continue
  const strokes = []
  // Each move command denotes a pen lift; preserve order.
  for (const stroke of (a.d || '').match(/[Mm][^Mm]*/g) || []) {
    const properties = new svgPathProperties(stroke)
    const length = properties.getTotalLength()
    const n = Math.max(2, Math.ceil(length / 5))
    strokes.push(Array.from({length: n + 1}, (_, i) => {
      const p = properties.getPointAtLength(length * i / n)
      return [Math.round(p.x * 100)/100, Math.round(p.y * 100)/100]
    }))
  }
  font.glyphs[unescape(a.unicode)] = {advance: +(a['horiz-adv-x'] || defaultAdvance), strokes}
}
await writeFile(path.join(root, 'fonts/ems-tech.json'), JSON.stringify(font))
console.log(`${Object.keys(font.glyphs).length} glyphs; units=${font.unitsPerEm}; cap=${font.capHeight}; ascent=${font.ascent}`)
