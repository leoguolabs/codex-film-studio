const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const url = new URL(location.href);
const zh = (url.searchParams.get('lang') || 'en').startsWith('zh');
const say = (en, cn) => (zh ? cn : en);
document.documentElement.lang = zh ? 'zh-CN' : 'en';
document.title = say('Catch the light · Sketchnote', '接住一束光 · 视觉笔记') + ' · Codex Film Studio';
if (zh)
  all('[data-zh]').forEach((el) => {
    el.textContent = el.dataset.zh;
  });
all('[data-library]').forEach((a) => {
  a.href = '../../../?lang=' + (zh ? 'zh' : 'en') + '#library';
});
function updateLanguageLink() {
  const other = new URL(location.href);
  other.searchParams.set('lang', zh ? 'en' : 'zh');
  const link = $('#language');
  link.href = other.href;
  link.textContent = say('中文', 'English');
  link.lang = say('zh-CN', 'en');
}
updateLanguageLink();
window.addEventListener('hashchange', updateLanguageLink);

const views = [
  [
    'Fig. 1 · The dark box',
    '图一 · 暗箱',
    'Catch',
    '接住',
    'the light.',
    '一束光。',
    'A candle stands upright. Its image hangs upside down. Where did the flip happen?',
    '蜡烛立得好好的，纸上的火焰却倒过来了。它是在哪里翻过来的？',
    'a hole in a sheet of foil',
    '锡箔上的一个小孔',
  ],
  [
    'Fig. 2 · The aperture',
    '图二 · 针孔',
    'Through',
    '穿过',
    'the hole.',
    '针孔。',
    'The foil stops most of the light. One narrow bundle from the tip slips through, already heading down.',
    '锡箔挡住了大部分光。从火焰尖端射来的一小束光穿过针孔时，已经在往下走。',
    'one narrow bundle gets through',
    '只有一小束光穿过',
  ],
  [
    'Fig. 3 · The finished sheet',
    '图三 · 全页',
    'See it',
    '摊开',
    'whole.',
    '整张纸。',
    'The tip lands below the base. Pull back and the whole path fits on one sheet of dot paper.',
    '火焰尖端落在了底部的下方。镜头退远，整条光路就画在一张点阵纸上。',
    'one sheet, from flame to screen',
    '从火焰到纸屏，都在这一页',
  ],
];
const journey = $('#notebook'),
  canvas = $('#paper'),
  ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-height:560px) and (max-width:720px)');
const stillMode = () => reduced.matches || compact.matches;
const clamp = (n) => Math.min(1, Math.max(0, n));
function ease(x) {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
}
const interval = (p, a, b) => ease((p - a) / (b - a));
let progress = 0,
  selected = -1,
  queued = false;
const art = {};
for (const [name, src] of Object.entries({
  box: 'dark-box.webp',
  foil: 'foil.webp',
  poster: 'media/pinhole-poster.webp',
})) {
  const image = new Image();
  art[name] = image;
  image.onload = schedule;
  image.src = src;
}
function place(image, x, y, width, opacity = 1) {
  if (!image.complete || !image.naturalWidth || opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.drawImage(image, x, y, width, (width * image.height) / image.width);
  ctx.restore();
}
function letter(p) {
  const n = p < 0.34 ? 0 : p < 0.74 ? 1 : 2;
  if (selected === n) return;
  selected = n;
  const row = views[n];
  ['#folio', '#headline-a', '#headline-b', '#lede', '#art-note'].forEach((id, i) => {
    $(id).textContent = row[i * 2 + Number(zh)];
  });
  canvas.setAttribute('aria-label', row[6 + Number(zh)]);
  all('[data-stop]').forEach((b, i) => {
    b.setAttribute('aria-label', views[i][Number(zh)]);
    b.setAttribute('aria-pressed', String(i === n));
  });
}
function marginMarks(alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#726a5c';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(58, 372);
  ctx.quadraticCurveTo(76, 316, 173, 310);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(159, 305);
  ctx.lineTo(174, 310);
  ctx.lineTo(162, 319);
  ctx.stroke();
  ctx.font = '24px Patrick, serif';
  ctx.fillStyle = '#655b4c';
  ctx.rotate(-0.06);
  ctx.fillText('f. 01', 48, 397);
  ctx.restore();
}
function draw() {
  queued = false;
  if (!stillMode()) {
    const top = journey.getBoundingClientRect().top;
    progress = clamp(-top / Math.max(1, journey.offsetHeight - $('.sticky').offsetHeight));
  }
  letter(progress);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(rect.width * dpr),
    h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const scale = innerWidth <= 720 ? Math.min(w / 740, h / 545) : Math.min(w / 900, h / 600);
  ctx.setTransform(scale, 0, 0, scale, (w - 900 * scale) / 2, (h - 600 * scale) / 2);
  const p = progress,
    zoom = interval(p, 0.015, 0.52),
    open = interval(p, 0.2, 0.52),
    pull = interval(p, 0.62, 0.97);
  const x = 475,
    y = 293;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-0.088 + 0.088 * zoom) * (1 - pull));
  const bw = 625 * (1 + 1.36 * zoom);
  place(art.box, -bw * 0.458, -bw * 0.401, bw, 1 - open);
  ctx.restore();
  marginMarks(1 - interval(p, 0.01, 0.21));
  if (open > 0 && pull < 1) {
    ctx.save();
    ctx.translate(x, y);
    const size = 100 + 603 * open - 220 * pull;
    // Expanding circular mask follows the actual finder collar into the film's cutaway.
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.51, 0, Math.PI * 2);
    ctx.clip();
    place(art.foil, -size * 0.5, -size * 0.4, size, open * (1 - pull));
    const travel = interval(p, 0.34, 0.605);
    if (travel > 0 && pull < 0.9) {
      // Trace the straight lower ray printed on the foil, from its source through the slit.
      const ax = -0.208 * size,
        ay = -0.077 * size,
        dx = 0.412 * size,
        dy = 0.134 * size;
      ctx.globalAlpha = open * (1 - pull);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + dx * travel, ay + dy * travel);
      ctx.lineWidth = Math.max(1.5, size * 0.007);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#fff3aa';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ax + dx * travel, ay + dy * travel, Math.max(2, size * 0.009), 0, Math.PI * 2);
      ctx.fillStyle = '#fffbe0';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#6f4623';
      ctx.stroke();
    }
    ctx.restore();
  }
  if (pull > 0 && art.poster.naturalWidth) {
    const width = 1580 - 748 * pull,
      height = (width * art.poster.height) / art.poster.width;
    const left = x - width * (0.35 + 0.15 * pull),
      top = y - height * (0.44 + 0.06 * pull);
    ctx.save();
    ctx.globalAlpha = pull;
    ctx.translate(left + width / 2, top + height / 2);
    ctx.rotate(((1.4 - pull * 3.3) * Math.PI) / 180);
    ctx.shadowColor = '#59432245';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#fffdf4';
    ctx.fillRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10);
    ctx.shadowColor = 'transparent';
    place(art.poster, -width / 2, -height / 2, width);
    ctx.restore();
  }
  $('.drawing').dataset.view = String(selected + 1);
}
function schedule() {
  if (!queued) {
    queued = true;
    requestAnimationFrame(draw);
  }
}
window.addEventListener('scroll', schedule, { passive: true });
new ResizeObserver(schedule).observe(canvas);
for (const media of [reduced, compact]) media.addEventListener('change', schedule);
document.fonts.ready.then(schedule);
all('[data-stop]').forEach((button, index) =>
  button.addEventListener('click', () => {
    const target = [0, 0.53, 1][index];
    if (stillMode()) {
      progress = target;
      schedule();
      return;
    }
    const start = journey.getBoundingClientRect().top + scrollY;
    window.scrollTo({
      top: start + target * (journey.offsetHeight - $('.sticky').offsetHeight),
      behavior: 'instant',
    });
  }),
);
schedule();

const desc = {
  pinhole: [
    'A single point of candlelight travels through a cardboard camera. Follow it all the way to the paper screen.',
    '追着烛火尖上的一个亮点，穿过纸板暗箱，看它落在纸屏的什么地方。',
  ],
  popcorn: [
    'A hard gold fleck hides in a fold of popcorn. Trace it back to the coat that once held the whole kernel together.',
    '爆米花的褶皱里藏着一小片金色硬壳。从这条线索倒回去，看它怎样裹住整粒玉米。',
  ],
};
const release = 'https://github.com/leoguolabs/codex-film-studio/releases/download/sketchnote-screenings-v1/';
const movie = $('#movie'),
  audio = $('#audition');
let filmId = url.searchParams.get('film') === 'popcorn' ? 'popcorn' : 'pinhole',
  stem = 'pen';
let filmData = {};
const clock = (t) => '00:' + String(Math.floor(t)).padStart(2, '0');
function sound() {
  const id = $('#sound-film').value;
  audio.pause();
  audio.src = release + id + '-' + stem + '.m4a';
  audio.setAttribute(
    'aria-label',
    (filmData[id]?.title[Number(zh)] || id) + ' · ' + $('[data-stem="' + stem + '"]').textContent,
  );
  all('[data-stem]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stem === stem)));
}
function setMovie(id, writeURL = false) {
  filmId = id;
  if (movie.getAttribute('src') !== release + id + '.mp4') {
    movie.pause();
    movie.src = release + id + '.mp4';
    movie.poster = 'media/' + id + '-poster.webp';
    const track = document.createElement('track');
    Object.assign(track, {
      kind: 'subtitles',
      srclang: 'en',
      label: 'English',
      src: 'media/' + id + '.vtt',
    });
    movie.replaceChildren(track);
    movie.load();
  }
  const info = filmData[id],
    names = {
      pinhole: say('The Upside-Down Flame', '倒过来的火焰'),
      popcorn: say('Inside a Popcorn Kernel', '爆米花的里面'),
    };
  all('[data-film]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.film === id)));
  $('#film-title').textContent = names[id];
  movie.setAttribute('aria-label', names[id]);
  $('#synopsis').textContent = desc[id][Number(zh)];
  $('#duration').textContent = (id === 'pinhole' ? '00:46' : '00:53') + ' · EN';
  $('#chapters').replaceChildren(
    ...(info?.chapters || []).map(([t, en, cn]) => {
      const b = document.createElement('button'),
        stamp = document.createElement('time');
      stamp.textContent = clock(t);
      b.append(stamp, say(en, cn));
      b.addEventListener('click', () => playAt(t));
      return b;
    }),
  );
  $('#transcript').textContent = (info?.lines || []).join('\n\n');
  if (writeURL) {
    const next = new URL(location.href);
    next.searchParams.set('film', id);
    history.replaceState(null, '', next);
    updateLanguageLink();
  }
}
function playAt(t) {
  movie.currentTime = t;
  movie.play().catch(() => {
    /* Native controls remain available when autoplay is disabled. */
  });
}
all('[data-film]').forEach((b) =>
  b.addEventListener('click', () => {
    setMovie(b.dataset.film, true);
    $('#sound-film').value = filmId;
    sound();
  }),
);
all('[data-detail]').forEach((b) =>
  b.addEventListener('click', () => {
    setMovie(b.dataset.detail, true);
    $('#sound-film').value = filmId;
    sound();
    location.hash = 'screening';
    movie.scrollIntoView({ block: 'center' });
    playAt(Number(b.dataset.time));
  }),
);
all('[data-stem]').forEach((b) =>
  b.addEventListener('click', () => {
    stem = b.dataset.stem;
    sound();
    audio.play().catch(() => {});
  }),
);
$('#sound-film').addEventListener('change', sound);
movie.addEventListener('play', () => audio.pause());
audio.addEventListener('play', () => movie.pause());
$('#sound-film').value = filmId;
setMovie(filmId);
sound();
fetch('media/films.json')
  .then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  })
  .then((data) => {
    filmData = data;
    setMovie(filmId);
  })
  .catch(() => {
    $('#chapters').hidden = true;
    $('#transcript').closest('details').hidden = true;
  });
