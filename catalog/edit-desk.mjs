// Use the same publicly released frame sheets as the individual screening rooms.
const lightboxRelease = 'https://github.com/leoguolabs/codex-film-studio/releases/download/paper-lightbox-night-windows-v1/';
const paperRelease = 'https://github.com/leoguolabs/codex-film-studio/releases/download/vermilion-papercut-screening-v1/';
const sources = {
  'paper-lantern': { sheets: [lightboxRelease + 'window-frames.webp'], columns: 4, rows: 8, count: 32 },
  'papercut-red': { sheets: [paperRelease + 'paper-fold-frames.webp'], columns: 5, rows: 6, count: 30 },
  'ink-wash': {
    sheets: Array.from({length: 7}, (_, index) => 'styles/ink-wash/showcase/media/moon-ink-' + index + '.webp'),
    columns: 2, rows: 3, count: 42,
  },
};

const desk = document.querySelector('.edit-desk');
const hero = desk.closest('.desk-hero');
const monitor = desk.querySelector('.desk-monitor');
const still = monitor.querySelector('.desk-still');
const canvas = monitor.querySelector('canvas');
const context = canvas.getContext('2d');
const timecode = desk.querySelector('.desk-timecode');
const duration = desk.querySelector('.desk-duration');
const rail = desk.querySelector('.desk-rail');
const scrub = rail.querySelector('.desk-scrub');
const play = desk.querySelector('.desk-play');
const playLabel = play.querySelector('[data-desk-start]');
const pauseLabel = play.querySelector('[data-desk-stop]');
const previous = desk.querySelector('[data-cut="-1"]');
const next = desk.querySelector('[data-cut="1"]');
const notes = [...desk.querySelectorAll('[data-note]')];
const segments = [...rail.querySelectorAll('[data-segment]')];
const shots = [...desk.querySelectorAll('[data-shot]')].map(button => ({
  id: button.dataset.shot,
  button,
  poster: button.querySelector('img').src,
  ...sources[button.dataset.shot],
}));
const root = new URL(document.documentElement.dataset.siteRoot ?? '../', import.meta.url);
const revision = new URL(import.meta.url).searchParams.get('v');
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const fps = 24;
const clipFrames = fps * 3;
const sequenceEnd = shots.length * clipFrames;
const sheets = new Map();
let position = 0, active = -1, lastPainted = -1, request = 0;
let playbackStart = null, manualAt = null, userChoseFrame = false;
let scrollStart = 0, scrollTravel = 200, heroBottom = 0;

function format(frame) {
  const seconds = Math.floor(frame / fps);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60, frame % fps]
    .map(part => String(part).padStart(2, '0')).join(':');
}

function loadSheet(shot, index) {
  const path = shot.sheets[index];
  if (!path) return null;
  if (!sheets.has(path)) {
    const image = new Image();
    image.decoding = 'async';
    image.onload = drawShot;
    const url = new URL(path, root);
    if (revision && url.origin === root.origin) url.searchParams.set('v', revision);
    sheets.set(path, image);
    image.src = url.href;
  }
  return sheets.get(path);
}

function drawShot() {
  if (!context || active < 0 || (!motion.matches && !userChoseFrame)) return;
  const shot = shots[active];
  const relative = position - active * clipFrames;
  const sample = Math.min(shot.count - 1, Math.floor(relative * shot.count / clipFrames));
  if (sample === lastPainted) return;
  const cells = shot.columns * shot.rows;
  const sheetIndex = Math.floor(sample / cells);
  const cell = sample % cells;
  const sheet = loadSheet(shot, sheetIndex);
  if (!sheet?.complete || !sheet.naturalWidth) {
    if (lastPainted < 0) monitor.dataset.picture = 'still';
    return;
  }
  // Warm just the adjacent sheet before a cut or sheet boundary becomes visible.
  if (cell >= cells - 2) loadSheet(shot, sheetIndex + 1);
  if (relative >= clipFrames * 0.62 && shots[active + 1]) loadSheet(shots[active + 1], 0);
  const width = sheet.naturalWidth / shot.columns;
  const height = sheet.naturalHeight / shot.rows;
  const scale = Math.min(canvas.width / width, canvas.height / height);
  const targetWidth = width * scale;
  const targetHeight = height * scale;
  context.fillStyle = '#090d11';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sheet, (cell % shot.columns) * width, Math.floor(cell / shot.columns) * height, width, height,
    (canvas.width - targetWidth) / 2, (canvas.height - targetHeight) / 2, targetWidth, targetHeight);
  lastPainted = sample;
  monitor.dataset.picture = 'frames';
  monitor.dataset.sample = String(sample);
}

function labelPlayhead() {
  const name = shots[active].button.textContent.trim();
  scrub.setAttribute('aria-valuetext', format(position) + ' · ' + name);
}

function render(frame) {
  const value = Math.min(sequenceEnd, Math.max(0, Math.round(frame)));
  if (value === position && active !== -1) return drawShot();
  position = value;
  const index = Math.min(shots.length - 1, Math.floor(position / clipFrames));
  if (index !== active) {
    active = index;
    const shot = shots[active];
    lastPainted = -1;
    monitor.dataset.picture = 'still';
    monitor.dataset.shot = shot.id;
    delete monitor.dataset.sample;
    still.src = shot.poster;
    shots.forEach((item, i) => item.button.setAttribute('aria-pressed', String(i === active)));
    for (const note of notes) note.hidden = note.dataset.note !== shot.id;
    for (const segment of segments) segment.toggleAttribute('data-current', segment.dataset.segment === shot.id);
  }
  timecode.textContent = format(position);
  rail.style.setProperty('--playhead', (100 * position / sequenceEnd) + '%');
  scrub.value = position;
  previous.disabled = position === 0;
  next.disabled = position === sequenceEnd;
  labelPlayhead();
  drawShot();
}

function setPlayback(start) {
  playbackStart = start;
  const playing = start !== null;
  play.dataset.playing = String(playing);
  playLabel.hidden = playing;
  pauseLabel.hidden = !playing;
}

function seek(frame) {
  manualAt = window.scrollY;
  userChoseFrame = true;
  setPlayback(null);
  render(frame);
}

function togglePlayback() {
  if (playbackStart !== null) return seek(position);
  seek(position === sequenceEnd ? 0 : position);
  setPlayback(performance.now() - position * 1000 / fps);
  schedule();
}

function update(timestamp) {
  request = 0;
  const scroll = window.scrollY;
  if (manualAt !== null && Math.abs(scroll - manualAt) > 24) {
    manualAt = null;
    if (playbackStart !== null) setPlayback(null);
  }
  if (playbackStart !== null) {
    render((timestamp - playbackStart) * fps / 1000);
    if (position < sequenceEnd) schedule();
    else setPlayback(null);
    return;
  }
  if (!motion.matches || manualAt !== null || scroll > heroBottom || desk.querySelector('.desk-note a:focus-visible')) return;
  render((scroll - scrollStart) * sequenceEnd / scrollTravel);
}

function schedule() {
  if (!request) request = requestAnimationFrame(update);
}

function measure() {
  const offset = monitor.getBoundingClientRect();
  scrollStart = Math.max(0, offset.top + window.scrollY - innerHeight * 0.62);
  scrollTravel = Math.max(176, Math.min(315, offset.height * 1.12));
  heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
  schedule();
}

function motionHint() {
  desk.querySelector('[data-desk-scroll]').hidden = !motion.matches;
  desk.querySelector('[data-desk-manual]').hidden = motion.matches;
}

for (const [index, shot] of shots.entries()) {
  shot.button.disabled = false;
  shot.button.addEventListener('click', () => seek(index * clipFrames));
}
scrub.max = sequenceEnd;
scrub.disabled = false;
scrub.addEventListener('input', () => seek(Number(scrub.value)));
previous.addEventListener('click', () => seek((Math.ceil(position / clipFrames) - 1) * clipFrames));
next.addEventListener('click', () => seek((Math.floor(position / clipFrames) + 1) * clipFrames));
play.disabled = false;
play.addEventListener('click', togglePlayback);
scrub.addEventListener('keydown', event => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  if (!event.repeat) togglePlayback();
});
new MutationObserver(labelPlayhead).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playbackStart !== null) setPlayback(null);
});
motion.addEventListener('change', () => {
  motionHint();
  seek(position);
});
window.addEventListener('scroll', schedule, {passive: true});
window.addEventListener('resize', measure);
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
duration.textContent = format(sequenceEnd);
motionHint();
render(0);
measure();
