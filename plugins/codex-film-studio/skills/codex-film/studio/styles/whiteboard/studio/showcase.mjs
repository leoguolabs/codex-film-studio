import {comparisonBeats} from './src/comparison.mjs'
import {messages, chineseSources, resolveLanguage} from './showcase-i18n.mjs?v=edition-options-v1'

const $ = id => document.getElementById(id)
const main = $('film-player')
const read = async path => {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path}: ${response.status}`)
  return response.json()
}
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
let storedLanguage
try { storedLanguage = localStorage.getItem('codex-film-language') } catch {}
let language = resolveLanguage(location.search, storedLanguage, navigator.language)
const edition = new URLSearchParams(location.search).get('edition') === 'long' ? 'long' : 'short'
const base = edition === 'long' ? 'editions/long/' : ''
let timeline, beats = [], claims = []

function renderChapters() {
  const ids = edition === 'short'
    ? ['hook', 'study', 'counter', 'practice', 'closing']
    : ['hook', 'turkey', 'delay', 'guidance', 'example', 'closing']
  const container = $('chapters')
  container.replaceChildren()
  container.style.setProperty('--chapter-count', ids.length)
  for (const id of ids) {
    const beat = beats.find(item => item.id === id)
    if (!beat) continue
    const button = document.createElement('button'), stamp = document.createElement('small')
    button.type = 'button'
    stamp.textContent = time(beat.start)
    button.append(stamp, document.createTextNode(messages[language].chapters[id]))
    button.onclick = () => {
      main.currentTime = beat.start
      main.play().catch(() => {})
      $('screen').scrollIntoView({behavior: 'smooth'})
    }
    container.append(button)
  }
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
  // Only fixed, repository-owned heading markup is used here.
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
    choice.href = url.href
    if (choice.dataset.edition === edition) choice.setAttribute('aria-current', 'page')
    else choice.removeAttribute('aria-current')
  }
  $('film-duration').textContent = timeline ? `${time(timeline.duration)} ${copy.durationUnit}` : copy.sampleFilm
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
applyLanguage()

if (edition === 'long') {
  const video = `${base}media/does-ai-help-you-learn-long.mp4`
  main.poster = `${base}media/poster.jpg`
  main.querySelector('source').src = video
  main.querySelector('track').src = `${base}media/captions.vtt`
  main.load()
  $('download-film').href = video
}
// Load independent page data together; language controls never wait for media.
const timelineData = read(`${base}media/timeline.json`)
await Promise.allSettled([
  Promise.all([timelineData, read(`${base}content/comparison.json`)]).then(([loaded, definitions]) => {
    timeline = loaded
    beats = comparisonBeats(timeline, definitions)
    applyLanguage()
  }),
  read(`${base}content/sources.json`).then(loaded => {
    claims = loaded.claims
    renderSources()
  }),
])
