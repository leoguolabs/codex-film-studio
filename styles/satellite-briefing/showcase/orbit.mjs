// Orthographic plates share a centre at 1.35° N, 103.82° E. Span is measured
// in Earth radii, so coastlines stay registered as higher-resolution plates appear.
const atlas = [
  { span:2.012, file:'atlas-earth.webp' },
  { span:.68, file:'atlas-straits.webp' },
  { span:.12, file:'atlas-region.webp' },
  { span:.024, file:'atlas-island.webp' },
]
const clamp = value => Math.max(0, Math.min(1, value))
function smooth(start, end, value) {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

function startOrbit() {
  const stage = document.querySelector('.stage')
  const passage = stage.parentElement
  const projection = stage.querySelector('.projection')
  const cover = stage.querySelector('.earth-plate')
  const earthTarget = stage.querySelector('.earth-target')
  const film = document.querySelector('#film')
  const copy = stage.querySelector('.hero-copy')
  const craft = stage.querySelector('.craft')
  const orbit = stage.querySelector('.orbit-art')
  const fix = stage.querySelector('.locator')
  const straits = stage.querySelector('.straits')
  const arrival = stage.querySelector('.island')
  const shade = stage.querySelector('.map-shade')
  const bar = stage.querySelector('.ground-scale')
  const scaleLabel = bar.querySelector('b'), scaleRule = bar.querySelector('i')
  const needle = stage.querySelector('.ruler i')
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let width, height, radius, centreX, centreY, top, travel, previousProgress
  let flight = null, frame = 0
  const header = document.querySelector('.masthead')
  const plates = atlas.map(({span, file}) => {
    const image = new Image()
    image.alt = ''
    image.decoding = 'async'
    image.addEventListener('load', () => { previousProgress = undefined; schedule() })
    image.src = new URL(file, import.meta.url)
    projection.append(image)
    return { image, span }
  })

  function resize() {
    stage.style.setProperty('--head-height', header.offsetHeight + 'px')
    width = stage.clientWidth
    height = stage.clientHeight
    previousProgress = undefined
    const style = getComputedStyle(cover)
    radius = parseFloat(style.width) / atlas[0].span
    centreX = parseFloat(style.left)
    centreY = parseFloat(style.top)
    top = passage.getBoundingClientRect().top + scrollY
    travel = Math.max(1, passage.offsetHeight - height)
    schedule()
  }
  function draw() {
    const p = motion.matches ? 0 : clamp((scrollY - top) / travel)
    if (p === previousProgress) return
    previousProgress = p
    const centre = smooth(.04, .46, p)
    const x = centreX + (width / 2 - centreX) * centre
    const y = centreY + (height / 2 - centreY) * centre
    const scale = radius * Math.pow(Math.max(width / .013, height / .011) / radius, smooth(.04, 1, p))
    // Keep the circular link on the visible globe as the camera moves. Once
    // it covers the stage, a viewport diagonal already reaches every corner.
    const hitScale = Math.min(scale, Math.hypot(width, height)) / radius
    earthTarget.style.transform = `translate(-50%,-50%) translate(${x-centreX}px,${y-centreY}px) scale(${hitScale})`
    // Composite the small source textures directly. Once a finer plate fills
    // the viewport it replaces the much larger, fully hidden layer behind it.
    let covered = false
    for (let i = plates.length - 1; i >= 0; i--) {
      const { image, span } = plates[i]
      const side = scale * span
      const coverage = side / (2 * Math.max(x, width-x, y, height-y))
      // The two NASA insets share a colour treatment and have feathered
      // edges. Introduce the Sentinel colour plate across the whole frame.
      let blend = 1
      if (i === plates.length - 1) blend = smooth(1.01, 1.48, coverage)
      else if (i > 0) blend = smooth(.19, .55, coverage)
      const visible = !covered && blend > 0 && image.naturalWidth > 0
      image.style.visibility = visible ? 'visible' : 'hidden'
      if (!visible) continue
      image.style.opacity = blend
      image.style.transform = `translate3d(${x}px,${y}px,0) scale(${side / 1024})`
      covered = blend === 1 && coverage > 1.28
    }
    // The schematic and the first photograph use the same orthographic view.
    // Crossfade them while the mark for Singapore stays on the same ground.
    const photoAlpha = cover.complete && !cover.naturalWidth ? 1 : smooth(.035, .245, p)
    projection.style.opacity = photoAlpha
    const showDiagram = photoAlpha < 1 || !covered
    cover.style.visibility = showDiagram ? 'visible' : 'hidden'
    if (showDiagram) cover.style.transform = earthTarget.style.transform
    const opening = 1 - smooth(.01, .22, p)
    copy.style.opacity = opening
    copy.inert = opening < .05
    orbit.style.opacity = 1 - smooth(0, .22, p)
    const pass = smooth(0, .44, p)
    craft.style.transform = `translate(-50%,-50%) translate(${width*.38*pass}px,${-height*.43*pass}px) rotate(${16*pass}deg) scale(${1+pass*.36})`
    craft.style.opacity = 1 - smooth(.20,.42,p)
    craft.inert = p > .40
    fix.style.transform = `translate(${x-centreX}px,${y-centreY}px)`
    fix.style.opacity = 1 - smooth(.16,.38,p)
    shade.style.opacity = smooth(.18,.46,p)
    straits.style.opacity = smooth(.35,.48,p) * (1 - smooth(.65,.76,p))
    arrival.style.opacity = smooth(.76,.92,p)
    bar.style.opacity = smooth(.29,.44,p)
    // Project a round great-circle distance symmetrically about the centre.
    const maxKm = 2 * 6371 * Math.asin(Math.min(1, 45 / scale))
    const unit = 10 ** Math.floor(Math.log10(maxKm))
    const km = [5, 2, 1].find(step => step * unit <= maxKm) * unit
    scaleRule.style.width = (2 * scale * Math.sin(km / (2 * 6371))) + 'px'
    scaleLabel.textContent = km + ' km'
    needle.style.left = (p * 98) + '%'
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render) }
  function render(now) {
    frame = 0
    if (flight) {
      const target = top + passage.offsetHeight
      if (flight.last !== null) flight.elapsed += Math.min(55, now - flight.last)
      flight.last = now
      const progress = clamp(flight.elapsed / flight.duration)
      scrollTo({top:flight.start + (target - flight.start) * smooth(0, 1, progress), behavior:'instant'})
      if (progress < 1) schedule()
      else {
        flight = null
        film.focus({preventScroll:true})
        if (location.hash !== '#film') history.pushState(null, '', '#film')
      }
    }
    draw()
  }
  for (const link of stage.querySelectorAll('[data-descent]')) {
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || motion.matches) return
      event.preventDefault()
      if (flight) return
      flight = {start:scrollY, elapsed:0, last:null, duration:3700}
      schedule()
    })
  }
  const stop = () => { flight = null }
  for (const name of ['wheel','touchstart','pointerdown','popstate','pagehide']) window.addEventListener(name, stop, {passive:true})
  window.addEventListener('keydown', event => {
    if (['Escape','Tab',' ','ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key)) stop()
  })
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })
  document.documentElement.classList.add('flight-ready')
  const layout = new ResizeObserver(resize)
  layout.observe(header)
  layout.observe(stage)
  window.addEventListener('scroll', schedule, {passive:true})
  motion.addEventListener('change', () => { stop(); resize() })
  window.addEventListener('pageshow', resize)
  resize()
}

startOrbit()
