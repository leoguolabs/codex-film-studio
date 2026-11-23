import {clamp, curve, marker, mix, paintStroke, pointAt, poly, smooth} from './src/board.mjs'

// All coordinates belong to the printed spread. The camera moves the page and its ink together.
const width = 960, height = 640
const color = '#b94c2d'
const trail = {color, width: 4.3, wobble: .7}
const fold = {color, width: 5.0, wobble: .7}
const strokes = [
  {start: 0, end: .20, ink: curve([[488,448], [567,480], [687,452], [697,376]], trail)},
  {start: .20, end: .35, ink: curve([[697,376], [710,298], [586,287], [606,344]], trail)},
  {start: .35, end: .50, ink: curve([[606,344], [635,407], [720,281], [744,226]], trail)},
  {start: .55, end: .77, ink: poly([[682,153], [871,89], [812,215], [773,187], [748,210], [735,175], [682,153]], fold)},
  {start: .80, end: .91, ink: poly([[735,175], [863,95], [773,187], [748,210]], {...fold, width: 3.2})},
]
const rest = [838, 452]

function draw(ctx, progress) {
  // The pale fold lines are the trace of a previous drawing on the whiteboard.
  for (const {ink} of strokes.slice(3)) paintStroke(ctx, {...ink, color: '#5a6474', width: 2.6, alpha: .18})
  let previous = strokes[0].ink.points[0], previousEnd = 0
  let tip = rest, lift = 0
  for (const {start, end, ink} of strokes) {
    if (progress < start) {
      const travel = (progress - previousEnd) / (start - previousEnd)
      tip = previous.map((v, i) => mix(v, ink.points[0][i], smooth(travel)))
      lift = 18 * Math.sin(Math.PI * travel)
      break
    }
    const written = clamp((progress - start) / (end - start))
    paintStroke(ctx, ink, written)
    if (written < 1) {
      tip = pointAt(ink, written)
      break
    }
    previous = ink.points.at(-1)
    previousEnd = end
  }
  if (progress >= previousEnd && previousEnd === strokes.at(-1).end) {
    const travel = clamp((progress - previousEnd) / (1 - previousEnd))
    tip = previous.map((v, i) => mix(v, rest[i], smooth(travel)))
    lift = 23 * Math.sin(Math.PI * travel)
  }
  const angle = mix(.73, -1.19, smooth((330 - tip[1]) / 180))
  // Keep the film renderer's white barrel, chisel tip and cast shadow.
  marker(ctx, tip[0], tip[1] - lift * .32, color, {scale: .55, angle, lift})
  return tip
}

export function mountMarkerJourney() {
  const cover = document.querySelector('.journey'), stage = cover.querySelector('.board-stage')
  const paper = cover.querySelector('.art-paper'), canvas = document.getElementById('drawing-ink')
  const ctx = canvas.getContext('2d'), screen = document.getElementById('screen')
  if (!ctx) return
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const header = document.querySelector('.masthead')
  let startY = 0, travel = 1, painted = -1, pending = 0, automatic = 0
  cover.classList.add('has-ink')

  function paint() {
    pending = 0
    const progress = motion.matches ? 1 : clamp((window.scrollY - startY) / travel)
    if (progress === painted) return
    painted = progress
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const tip = draw(ctx, mix(.073, 1, progress))
    const close = Math.sin(Math.PI * progress)
    const x = (500 - tip[0]) * close * .017, y = (445 - tip[1]) * close * .012
    paper.style.transform = 'translate(' + x + '%, ' + y + '%) scale(' + (1 + .14 * close) + ')'
  }
  function requestPaint() {
    if (!pending) pending = requestAnimationFrame(paint)
  }
  function measure() {
    cover.style.setProperty('--head-height', header.offsetHeight + 'px')
    const ratio = Math.min(devicePixelRatio || 1, 2)
    const pixels = Math.max(1, Math.round(canvas.clientWidth * ratio))
    if (pixels !== canvas.width || canvas.height !== Math.round(pixels * height / width)) {
      canvas.width = pixels
      canvas.height = Math.round(pixels * height / width)
    }
    startY = window.scrollY + cover.getBoundingClientRect().top
    travel = Math.max(1, cover.offsetHeight - stage.offsetHeight)
    painted = -1
    requestPaint()
  }
  function cancelRide() {
    cancelAnimationFrame(automatic)
    automatic = 0
  }
  function arrive() {
    if (location.hash !== '#screen') history.pushState(null, '', '#screen')
    screen.scrollIntoView({behavior: 'instant', block: 'start'})
    screen.focus({preventScroll: true})
  }
  function ride(event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    cancelRide()
    const from = window.scrollY, to = from + screen.getBoundingClientRect().top
    if (motion.matches || to - from < 5) {
      arrive()
      return
    }
    // Give the pen its own time on the board, then carry the completed drawing up to the screen.
    const endOfDrawing = Math.max(from, Math.min(to, startY + travel))
    const drawMs = 2850 * clamp((endOfDrawing - from) / (startY + travel))
    const revealMs = Math.max(320, 950 * clamp((to - endOfDrawing) / stage.offsetHeight))
    let elapsed = 0, previousFrame
    function frame(now) {
      // A late frame should hold the pen briefly, never jump over a fold.
      if (previousFrame !== undefined) elapsed += Math.min(now - previousFrame, 64)
      previousFrame = now
      if (elapsed >= drawMs + revealMs) {
        automatic = 0
        arrive()
        return
      }
      const y = elapsed < drawMs
        ? mix(from, endOfDrawing, smooth(elapsed / drawMs))
        : mix(endOfDrawing, to, smooth((elapsed - drawMs) / revealMs))
      window.scrollTo({top: y, behavior: 'instant'})
      paint()
      automatic = requestAnimationFrame(frame)
    }
    automatic = requestAnimationFrame(frame)
  }
  for (const link of document.querySelectorAll('[data-draw-to-screen]')) link.addEventListener('click', ride)
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(type, cancelRide, {passive: true})
  }
  window.addEventListener('scroll', requestPaint, {passive: true})
  window.addEventListener('pagehide', cancelRide)
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelRide() })
  motion.addEventListener('change', () => { cancelRide(); measure() })
  const resize = new ResizeObserver(measure)
  for (const element of [header, cover, stage, canvas]) resize.observe(element)
  measure()
}
