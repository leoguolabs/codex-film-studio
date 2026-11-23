import {comparisonBeats} from './src/comparison.mjs'
import {messages, chineseSources, resolveLanguage} from './showcase-i18n.mjs?v=notebook-1'
import {mountMarkerJourney} from './marker-journey.mjs'

const $ = id => document.getElementById(id)
const main = $('film-player')
const edition = new URLSearchParams(location.search).get('edition') === 'long' ? 'long' : 'short'
const base = edition === 'long' ? 'editions/long/' : ''
const time = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
const read = async path => {
  const response = await fetch(path)
  if (!response.ok) throw new Error(path + ': ' + response.status)
  return response.json()
}

let storedLanguage
try { storedLanguage = localStorage.getItem('codex-film-language') } catch {}
let language = resolveLanguage(location.search, storedLanguage, navigator.language)
let beats = [], claims = []

// The preview is a short passage from the selected release. The same native player
// becomes the full film, so scrubbing, captions and downloads refer to one edition.
const excerptStart = edition === 'long' ? 17 : 5.2
const excerptEnd = excerptStart + 9.5
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
let fullFilm = false, inView = false, allowPreview = !reduced.matches, previewEnded = false

function labelPreview() {
  const key = previewEnded ? 'replayPreview' : main.paused ? 'resumePreview' : 'pausePreview'
  $('toggle-preview').textContent = messages[language][key]
}

function syncPreview() {
  if (fullFilm) return
  if (!allowPreview || !inView || document.hidden || previewEnded) {
    main.pause()
    return
  }
  if (main.readyState < HTMLMediaElement.HAVE_METADATA) return
  if (main.currentTime < excerptStart || main.currentTime >= excerptEnd) main.currentTime = excerptStart
  main.play().catch(error => {
    if (error.name !== 'AbortError' && !fullFilm) {
      allowPreview = false
      labelPreview()
    }
  })
}

function playFilm(start, focusPlayer = false) {
  if (!fullFilm) {
    fullFilm = true
    main.muted = false
    main.controls = true
    document.querySelector('.preview-controls').hidden = true
  }
  main.currentTime = start
  main.play().catch(() => {}) // Native controls remain available if playback needs another gesture.
  if (focusPlayer) main.focus({preventScroll: true})
  markChapter()
}

function markChapter() {
  const buttons = Array.from($('chapters').children)
  const current = fullFilm && buttons.filter(button => Number(button.dataset.start) <= main.currentTime).at(-1)
  for (const button of buttons) {
    if (button === current) button.setAttribute('aria-current', 'true')
    else button.removeAttribute('aria-current')
  }
}

function renderChapters() {
  const ids = edition === 'short'
    ? ['hook', 'study', 'counter', 'practice', 'closing']
    : ['hook', 'turkey', 'delay', 'guidance', 'example', 'closing']
  const container = $('chapters')
  container.replaceChildren()
  for (const id of ids) {
    const beat = beats.find(item => item.id === id)
    if (!beat) continue
    const button = document.createElement('button'), stamp = document.createElement('small')
    button.type = 'button'
    button.dataset.start = beat.start
    stamp.textContent = time(beat.start)
    button.append(stamp, document.createTextNode(messages[language].chapters[id]))
    button.onclick = () => {
      playFilm(beat.start)
      main.scrollIntoView({block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth'})
    }
    container.append(button)
  }
  markChapter()
}

function renderSources() {
  const container = $('source-list'), seen = new Set()
  container.replaceChildren()
  for (const claim of claims) {
    if (seen.has(claim.source)) continue
    seen.add(claim.source)
    const item = document.createElement('article'), id = document.createElement('b')
    const body = document.createElement('div'), link = document.createElement('a'), kind = document.createElement('p')
    const translated = language === 'zh' ? chineseSources[claim.id] : null
    item.className = 'source'
    id.textContent = claim.id
    link.href = claim.source
    link.textContent = (translated?.[0] || claim.claim) + ' ↗'
    kind.textContent = translated?.[1] || claim.type
    body.append(link, kind)
    item.append(id, body)
    container.append(item)
  }
}

function applyLanguage() {
  const copy = messages[language]
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  document.title = copy.title
  document.querySelector('meta[name="description"]').content = copy.description
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = copy[element.dataset.i18n]
  }
  // The translated markup is fixed, repository-owned copy.
  for (const element of document.querySelectorAll('[data-i18n-html]')) {
    element.innerHTML = copy[element.dataset.i18nHtml]
  }
  for (const element of document.querySelectorAll('[data-i18n-aria]')) {
    element.setAttribute('aria-label', copy[element.dataset.i18nAria])
  }
  for (const button of document.querySelectorAll('[data-language]')) {
    button.setAttribute('aria-pressed', String(button.dataset.language === language))
  }
  for (const choice of document.querySelectorAll('[data-edition]')) {
    const url = new URL(location.href)
    url.searchParams.set('edition', choice.dataset.edition)
    url.searchParams.set('lang', language)
    url.hash = 'screen'
    choice.href = url.href
    if (choice.dataset.edition === edition) choice.setAttribute('aria-current', 'page')
    else choice.removeAttribute('aria-current')
  }
  labelPreview()
  renderChapters()
  renderSources()
}

for (const button of document.querySelectorAll('[data-language]')) {
  button.onclick = () => {
    language = button.dataset.language
    const url = new URL(location.href)
    url.searchParams.set('lang', language)
    history.replaceState(null, '', url)
    try { localStorage.setItem('codex-film-language', language) } catch {}
    applyLanguage()
  }
}
if (edition === 'long') {
  const video = base + 'media/does-ai-help-you-learn-long.mp4'
  main.poster = base + 'media/poster.jpg'
  main.querySelector('source').src = video
  main.querySelector('track').src = base + 'media/captions.vtt'
  main.load()
  $('download-film').href = video
  $('film-duration').textContent = '12:00'
}

main.controls = false
main.muted = true
document.querySelector('.preview-controls').hidden = false
$('play-film').addEventListener('click', () => playFilm(0, true))
$('toggle-preview').addEventListener('click', () => {
  allowPreview = main.paused
  previewEnded = false
  if (allowPreview && !inView) main.scrollIntoView({block: 'nearest', behavior: 'instant'})
  syncPreview()
})
function prepareExcerpt() {
  if (fullFilm || reduced.matches || main.readyState < HTMLMediaElement.HAVE_METADATA) return
  // Park on the first frame while the pen is drawing, so the screening does not
  // flash the release poster just before the excerpt starts.
  main.currentTime = excerptStart
  syncPreview()
}
main.addEventListener('loadedmetadata', prepareExcerpt)
prepareExcerpt()
main.addEventListener('play', labelPreview)
main.addEventListener('pause', labelPreview)
main.addEventListener('timeupdate', () => {
  if (fullFilm) markChapter()
  else if (!previewEnded && main.currentTime >= excerptEnd) {
    previewEnded = true
    main.pause()
    labelPreview()
  }
})
new IntersectionObserver(([entry]) => {
  inView = entry.intersectionRatio >= .35
  syncPreview()
}, {threshold: [0, .35]}).observe(main)
document.addEventListener('visibilitychange', syncPreview)
reduced.addEventListener('change', () => {
  allowPreview = !reduced.matches
  syncPreview()
})

applyLanguage()
mountMarkerJourney()
await Promise.allSettled([
  Promise.all([read(base + 'media/timeline.json'), read(base + 'content/comparison.json')]).then(([loaded, definitions]) => {
    beats = comparisonBeats(loaded, definitions)
    $('film-duration').textContent = time(loaded.duration)
    renderChapters()
  }),
  read(base + 'content/sources.json').then(loaded => {
    claims = loaded.claims
    renderSources()
  }),
])
