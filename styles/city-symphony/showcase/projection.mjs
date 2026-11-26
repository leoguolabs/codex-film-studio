// Each half-open range is on the 30 fps timeline of the finished film.
const reels = {
  chongqing: {
    row: 0, ranges: [[231,292],[450,585],[587,621],[668,738],[1110,1169]],
    divisions: [27,59,94]
  },
  'san-francisco': {
    row: 1, ranges: [[226,282],[405,525],[528,566],[610,680],[1200,1247]],
    divisions: [30,60,90]
  },
  'new-york': {
    row: 2, ranges: [[254,299],[405,525],[529,562],[593,665],[960,1011]],
    divisions: [30,60,90]
  }
};
const release = 'https://github.com/leoguolabs/codex-film-studio/releases/download/city-symphony-screenings-v1/';
const fps = 30;
const clamp = n => Math.max(0, Math.min(1, n));
const mix = (a, b, t) => a + (b - a) * t;
function ramp(start, end, x) {
  const t = clamp((x - start) / (end - start));
  return t * t * (3 - 2 * t);
}

for (const reel of Object.values(reels)) {
  let length = 0;
  reel.ends = reel.ranges.map(([start, end]) => (length += end - start));
  reel.frames = length;
  const boundaries = [0,reel.ends[0],...reel.divisions.map(n=>reel.ends[0]+n),
    reel.ends[1],reel.ends[2],reel.ends[3],reel.ends[3]+9,reel.ends[4]];
  const samples = [11,8,8,8,8,7,13,1,8];
  reel.exposures = samples.flatMap((count, j) => Array.from({length:count}, (_, i) =>
    boundaries[j] + Math.floor((boundaries[j+1]-boundaries[j]-1)*i/Math.max(1,count-1))));
  const exposures = [4, 9, 3, 4, 4];
  reel.keys = reel.ends.flatMap((end, scene) => {
    const start = reel.ends[scene - 1] || 0;
    const group = Array.from({length: exposures[scene]}, (_, i) =>
      start + Math.floor((end - start - 1) * i / (exposures[scene] - 1)));
    if (scene === 4) group[1] = start + 9;
    return group;
  });
}
function cueFor(reel, index) {
  const scene = reel.ends.findIndex(end => index < end);
  const offset = index - (reel.ends[scene - 1] || 0);
  const source = reel.ranges[scene][0] + offset;
  if (scene === 1) {
    const divisions = reel.divisions.filter(frame => offset >= frame).length;
    return {source, scene: ['two','four','nine','sixteen'][divisions]};
  }
  if (scene === 4 && offset < 9) return {source, scene: 'black'};
  return {source, scene: ['street',null,'brake','archive','page'][scene]};
}
function closestKey(reel, index, keys) {
  const phase = cueFor(reel,index).scene;
  let closest = 0, distance = Infinity;
  keys.forEach((frame, i) => {
    const delta = Math.abs(frame - index);
    if (delta < distance && cueFor(reel,frame).scene === phase) {
      closest = i;
      distance = delta;
    }
  });
  return closest;
}

export function mountProjection({section, city, posterURL, onCue}) {
  const canvas = section.querySelector('canvas');
  const context = canvas.getContext('2d');
  const poster = section.querySelector('#overture-poster');
  const intro = section.querySelector('.intro');
  const follow = section.querySelector('#follow');
  const pause = section.querySelector('#pause-guide');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = city, reel = reels[city], video = null;
  let progress = 0, target = 0, width = 0, height = 0, visible = false;
  let raf = 0, guide = 0, previousTick = 0, previousCue = '', decoded = -1, requested = -1;
  const atlas = new Image();
  let strips = [];
  const exposure = document.createElement('canvas');
  exposure.width = 960; exposure.height = 540;
  const exposureContext = exposure.getContext('2d');
  function invalidate() {
    if (context && visible && !raf) raf = requestAnimationFrame(tick);
  }
  atlas.onload = invalidate;
  poster.addEventListener('load', invalidate);
  if (context && !reduced.matches) atlas.src = new URL('contact-print.avif', import.meta.url);

  function filmFrame() {
    return Math.round(clamp((progress - .12) / .88) * (reel.frames - 1));
  }
  function seek(frame) {
    if (!video) {
      const element = document.createElement('video');
      video = element;
      element.muted = true;
      element.playsInline = true;
      element.preload = 'auto';
      const settle = () => {
        if (video !== element || element.seeking || element.readyState < 2) return;
        exposureContext.drawImage(element, 0, 0, exposure.width, exposure.height);
        decoded = Math.max(0, Math.floor(element.currentTime * fps));
        invalidate();
      };
      element.addEventListener('loadeddata', settle);
      element.addEventListener('seeked', settle);
      element.addEventListener('error', invalidate);
      element.src = release + selected + '-scroll-v1.mp4';
    }
    if (frame===null || video.error || video.readyState < 2 || video.seeking || requested === frame) return;
    requested = frame;
    video.currentTime = (frame + .5) / fps;
  }
  function loadStrip(part) {
    if (strips[part]) return;
    const image = new Image();
    image.decoding = 'async';
    strips[part] = image;
    image.onload = () => {
      if (strips[part] !== image) return;
      if (part===0) loadStrip(1);
      invalidate();
    };
    image.src = release + selected + '-exposures-' + (part+1) + '-v1.webp';
  }
  function drawExposure(key, x, y, w, h) {
    const part = Math.floor(key/36), image = strips[part];
    if (!image?.complete || !image.naturalWidth) return false;
    const slot = key % 36, tw = image.naturalWidth/6, th=image.naturalHeight/6;
    context.drawImage(image,slot%6*tw,Math.floor(slot/6)*th,tw,th,x,y,w,h);
    return true;
  }
  function publishCue(scene, reelIndex, mode) {
    const frame = reelIndex===null ? null : cueFor(reel,reelIndex).source;
    const identity = [selected,scene,frame].join('/');
    if (identity !== previousCue) {
      onCue(scene,frame);
      previousCue=identity;
    }
    canvas.dataset.phase=scene;
    canvas.dataset.sourceFrame=frame===null?'':String(frame);
    canvas.dataset.exposure=mode;
  }
  function drawPrint(key, x, y, w, h) {
    if (!atlas.complete || !atlas.naturalWidth) return false;
    const tw = atlas.naturalWidth / 8, th = atlas.naturalHeight / 9;
    context.drawImage(atlas, key % 8 * tw, (reel.row * 3 + Math.floor(key / 8)) * th,
                      tw, th, x, y, w, h);
    return true;
  }
  function paint() {
    if (!context || !width || !height) return;
    const still = progress < .125 || reduced.matches;
    const retreat = reduced.matches ? 0 : ramp(.015, .165, progress);
    const open = reduced.matches ? 0 : ramp(.075, .19, progress);
    const frame = filmFrame();
    const scene = cueFor(reel,frame).scene;
    if (visible && !reduced.matches) {
      loadStrip(0);
      seek(still ? null : frame);
    }
    section.style.setProperty('--intro-opacity', String(1 - retreat));
    section.style.setProperty('--retreat', String(retreat));
    section.style.setProperty('--ink-level', String(1 - open));
    section.style.setProperty('--signature', String(.82 * (1 - open)));
    section.style.setProperty('--hand', (progress * 300 - 45) + 'deg');
    section.style.setProperty('--played', String(.012 + .988 * progress));
    intro.classList.toggle('covered', retreat >= .99);
    intro.inert = retreat >= .99;
    context.clearRect(0, 0, width, height);
    if (open <= 0) {
      publishCue('opening',null,'poster');
      return;
    }
    context.fillStyle = 'rgba(9,13,14,' + open + ')';
    context.fillRect(0, 0, width, height);
    // Open a landscape aperture even on a portrait phone. The whole encoded frame stays in view.
    const coverWidth = Math.max(width, height * 16 / 9);
    const printWidth = Math.min(width * (width < 680 ? .987 : .94), height * .96 * 16 / 9);
    const w = mix(coverWidth, printWidth, open), h = w * 9 / 16;
    const x = (width - w) / 2, y = (height - h) / 2;
    const key = closestKey(reel,frame,reel.keys);
    const fullKey = closestKey(reel,frame,reel.exposures);
    if (!reduced.matches) loadStrip(Math.floor(fullKey/36));
    if (y > 70) {
      const margin = Math.min(14, y * .12);
      context.save();
      context.globalAlpha = .31 * open;
      drawPrint(Math.max(0, key - 1), x, y - h - margin, w, h);
      drawPrint(Math.min(23, key + 1), x, y + h + margin, w, h);
      context.restore();
    }
    context.save();
    context.globalAlpha = open;
    // Reversible contact sheets bridge decoder seeks. They use real exposures from the same cut.
    let shown = null, mode = 'poster';
    if (decoded >= 0 && Math.abs(decoded - frame) <= 4 && cueFor(reel,decoded).scene === scene) {
      context.drawImage(exposure,x,y,w,h);
      shown = decoded; mode = 'film';
    } else if (scene === 'black') {
      context.fillStyle='#000'; context.fillRect(x,y,w,h);
      shown = frame; mode = 'black';
    } else if (drawExposure(fullKey,x,y,w,h)) {
      shown = reel.exposures[fullKey]; mode = 'strip';
    } else {
      // Keep the pocket-sized print at contact-sheet scale while the larger exposures load.
      const smallW = Math.min(w,width*.42,260), smallH = smallW*9/16;
      const cy = (height-smallH)/2, cx=(width-smallW)/2;
      if (drawPrint(key,cx,cy,smallW,smallH)) {
        context.globalAlpha = .44*open;
        drawPrint(Math.max(0,key-1),cx-smallW-8,cy,smallW,smallH);
        drawPrint(Math.min(23,key+1),cx+smallW+8,cy,smallW,smallH);
        shown = reel.keys[key]; mode = 'contact';
      } else if (poster.complete && poster.naturalWidth) {
        context.drawImage(poster,x,y,w,h);
      }
    }
    if (still || shown===null) publishCue('opening',null,mode);
    else publishCue(cueFor(reel,shown).scene,shown,mode);
    context.restore();
  }
  function tick(now) {
    raf = 0;
    const elapsed = previousTick ? Math.min(220, now - previousTick) : 16;
    previousTick = now;
    progress += (target - progress) * (1 - Math.exp(-elapsed / 88));
    if (Math.abs(target - progress) < .00025) progress = target;
    paint();
    if (progress !== target) invalidate();
  }
  function readPosition() {
    const box = section.getBoundingClientRect();
    visible = box.bottom > 0 && box.top < innerHeight;
    target = reduced.matches ? 0 : clamp(-box.top / Math.max(1, box.height - section.querySelector('.pin').offsetHeight));
    if (visible) invalidate();
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    const ratio = Math.min(2, window.devicePixelRatio || 1, 2304 / Math.max(1, width));
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    readPosition();
    if (visible) paint();
  }
  function stopGuide() {
    if (guide) cancelAnimationFrame(guide);
    guide = 0;
    follow.setAttribute('aria-pressed', 'false');
    pause.hidden = true;
  }
  function playGuide() {
    if (guide) { stopGuide(); return; }
    const start = window.scrollY;
    const end = start + document.querySelector('#screening').getBoundingClientRect().top;
    const duration = Math.max(1800, 12300 * clamp((end - start) / section.offsetHeight));
    const begin = performance.now();
    follow.setAttribute('aria-pressed', 'true');
    pause.hidden = false;
    function advance(now) {
      const t = clamp((now - begin) / duration);
      window.scrollTo(0, mix(start, end, ramp(0, 1, t)));
      if (t < 1) guide = requestAnimationFrame(advance);
      else stopGuide();
    }
    guide = requestAnimationFrame(advance);
  }
  function selectCity(id) {
    if (!reels[id]) return;
    stopGuide();
    if (selected !== id) strips = [];
    if (video && selected !== id) {
      const old = video; video = null;
      old.removeAttribute('src'); old.load();
      decoded = -1; requested = -1;
    }
    selected = id; reel = reels[id]; poster.src = posterURL(id);
    previousCue = '';
    paint();
  }
  if (context) section.classList.add('has-projector');
  else follow.hidden = true;
  window.addEventListener('scroll', readPosition, {passive:true});
  for (const event of ['wheel','touchstart','pointerdown','keydown']) {
    window.addEventListener(event, e => {
      if (!follow.contains(e.target) && !pause.contains(e.target)) stopGuide();
    }, {passive:true});
  }
  follow.addEventListener('click', playGuide);
  pause.addEventListener('click', stopGuide);
  reduced.addEventListener('change', () => {
    stopGuide();
    if (!reduced.matches && !atlas.getAttribute('src')) atlas.src = new URL('contact-print.avif', import.meta.url);
    if (reduced.matches) progress = 0;
    resize();
  });
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize(); selectCity(city);
  return {selectCity, stopGuide};
}
