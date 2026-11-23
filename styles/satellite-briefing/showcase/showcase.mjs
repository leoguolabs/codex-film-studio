const $ = selector => document.querySelector(selector)
const player = $('#film-player')
const chapters = [...document.querySelectorAll('[data-seek]')]
const languageButtons = [...document.querySelectorAll('[data-language]')]
const translations = [...document.querySelectorAll('[data-zh]')].map(element => ({element, en:element.textContent, zh:element.dataset.zh}))
const labels = [...document.querySelectorAll('[data-zh-label]')].map(element => ({element, en:element.ariaLabel, zh:element.dataset.zhLabel}))
const descriptions = [...document.querySelectorAll('[data-zh-alt]')].map(element => ({element, en:element.alt, zh:element.dataset.zhAlt}))
const text = {
  en:{ title:'Satellite Briefing · Singapore — Codex Film Studio', error:'The film could not be loaded. Use the MP4 link below.', copied:'Prompt copied.', copyError:'Select the prompt text to copy it.', paused:'Use the video’s Play control to continue.', pause:'Pause preview', resume:'Resume muted preview' },
  zh:{ title:'卫星简报 · 新加坡 — Codex Film Studio', error:'影片暂时无法加载，可使用下方的 MP4 链接。', copied:'提示词已复制。', copyError:'请选择提示词文字复制。', paused:'请使用播放器的播放按钮继续。', pause:'暂停预览', resume:'继续静音预览' }
}
let language = 'en', filmStatus = '', copyStatus = ''
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const previewActions = $('.preview-actions')
const pauseButton = $('#pause-preview')
let preview = false, fullFilm = false, inView = false, held = false
function status() {
  $('#film-error').hidden = !filmStatus
  $('#film-error').textContent = text[language][filmStatus] || ''
  $('#copy-status').textContent = text[language][copyStatus] || ''
  pauseButton.ariaLabel = text[language][held ? 'resume' : 'pause']
  pauseButton.textContent = held ? '▶' : 'Ⅱ'
}
function setLanguage(next, persist=false) {
  language = next === 'zh' ? 'zh' : 'en'
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  document.title = text[language].title
  translations.forEach(row => { row.element.textContent = row[language] })
  labels.forEach(row => { row.element.ariaLabel = row[language] })
  descriptions.forEach(row => { row.element.alt = row[language] })
  languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)))
  status()
  if (persist) {
    try { localStorage.setItem('codex-film-language', language) } catch {}
    const url = new URL(location.href)
    url.searchParams.set('lang', language)
    history.replaceState(null, '', url)
  }
}
let savedLanguage
try { savedLanguage = localStorage.getItem('codex-film-language') } catch {}
setLanguage(new URLSearchParams(location.search).get('lang') || savedLanguage || 'en')
languageButtons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language, true)))

const requestedSource = new URLSearchParams(location.search).get('src')
const customSource = requestedSource && /^media\/[\w.-]+\.mp4$/.test(requestedSource)
if (customSource) {
  player.src = `/_projects/satellite-film/${requestedSource}`
  $('#download-film').href = player.src
}
function updateChapter() {
  const current = chapters.findLast(button => player.currentTime >= Number(button.dataset.seek) - .05) || chapters[0]
  chapters.forEach(button => {
    if (button === current) button.setAttribute('aria-current','true')
    else button.removeAttribute('aria-current')
  })
}
// One media element serves the silent excerpt and the full film. Switching to
// a chapter reuses its download and keeps the user's gesture for audio playback.
function leavePreview() {
  preview = false
  previewActions.hidden = true
  player.controls = true
  player.muted = false
}
async function playFilm(time) {
  fullFilm = true
  leavePreview()
  player.currentTime = time
  updateChapter()
  try { await player.play() } catch { filmStatus = player.error ? 'error' : 'paused'; status() }
}
const excerptStart = 17.5, excerptEnd = 25.5
function syncPreview() {
  if (fullFilm) return
  if (motion.matches || customSource) {
    if (preview) { player.pause(); leavePreview(); player.currentTime = 0 }
    return
  }
  if (!inView || document.hidden || held) { if (preview) player.pause(); return }
  if (!preview) {
    preview = true
    player.controls = false
    player.muted = true
    previewActions.hidden = false
    player.currentTime = excerptStart
  }
  player.play().catch(error => {
    if (error.name === 'AbortError' || !preview) return
    held = true
    status()
  })
}
player.addEventListener('timeupdate', () => {
  if (preview && player.currentTime >= excerptEnd) player.currentTime = excerptStart
  updateChapter()
})
player.addEventListener('play', () => { if (!preview) fullFilm = true })
player.addEventListener('playing', () => { filmStatus = ''; status() })
function mediaError() { filmStatus = 'error'; status() }
player.addEventListener('error', mediaError)
player.querySelector('source')?.addEventListener('error', mediaError)
$('#play-film').addEventListener('click', () => { playFilm(0); player.focus() })
pauseButton.addEventListener('click', () => { held = !held; status(); syncPreview() })
chapters.forEach(button => button.addEventListener('click', () => {
  playFilm(Number(button.dataset.seek))
  $('#screen').scrollIntoView({behavior:motion.matches ? 'instant' : 'smooth', block:'nearest'})
}))
new IntersectionObserver(([entry]) => {
  inView = entry.intersectionRatio >= .35
  syncPreview()
}, {threshold:[0,.35]}).observe(player)
motion.addEventListener('change', syncPreview)
document.addEventListener('visibilitychange', syncPreview)
$('#colour-scan').addEventListener('input', event => {
  $('#scan-map').style.setProperty('--split', `${event.target.value}%`)
})
$('#copy-prompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#prompt').textContent.trim()); copyStatus = 'copied' } catch { copyStatus = 'copyError' }
  status()
})
