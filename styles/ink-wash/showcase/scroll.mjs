const $ = (id) => document.getElementById(id);
const all = (selector) => Array.from(document.querySelectorAll(selector));
const requested = new URLSearchParams(location.search).get('lang');
const zh = requested
  ? requested.startsWith('zh')
  : navigator.language.startsWith('zh');
const tr = (chinese, english) => (zh ? chinese : english);
document.documentElement.lang = tr('zh-CN', 'en');
document.title =
  tr('一笔之间 · 宣纸写意水墨', 'Between Strokes · Xuan Ink Wash') +
  ' | Codex Film Studio';
if (!zh)
  all('[data-en]').forEach((node) => {
    node.textContent = node.dataset.en;
  });
const language = tr('zh', 'en');
all('[data-lang]').forEach((link) => {
  const url = new URL(location.href);
  url.searchParams.set('lang', link.dataset.lang);
  link.href = url;
  if (link.dataset.lang === language) link.setAttribute('aria-current', 'page');
});
$('catalog').href = zh ? '../../../zh/#library' : '../../../#library';
const films = {
  moon: {
    title: 'A Mouthful of Moon',
    number: 'I',
    first: 702,
    length: 46,
    synopsis: tr(
      '苍鹭盯着芦苇间的一轮月。它等了许久，终于向水里啄了一口。',
      'A heron watches a moon caught among the reeds. He waits, then takes a beakful of water.',
    ),
    score: 'Water Under the Bill',
    chapters: [
      [0, tr('芦间见月', 'Moon in the reeds')],
      [29.25, tr('喙尖破水', 'The beak breaks water')],
      [37.5, tr('月复圆', 'The moon returns')],
    ],
  },
  fox: {
    title: 'One More Persimmon',
    number: 'II',
    first: 502,
    length: 44,
    synopsis: tr(
      '雪地只剩一枚橙红色的柿子。一只狐狸向后坐了坐，把全身的力气借给了这一跃。',
      'One orange persimmon hangs above the snow. A fox folds her back legs and puts everything she has into one leap.',
    ),
    score: 'The Branch Gives',
    chapters: [
      [0, tr('枝头一柿', 'The last persimmon')],
      [20.92, tr('蹬雪跃起', 'Pushing off the snow')],
      [28.2, tr('早餐落地', 'Breakfast comes down')],
    ],
  },
};
const time = (value) =>
  Math.floor(value / 60) +
  ':' +
  String(Math.floor(value) % 60).padStart(2, '0');
function pressed(selector, match) {
  all(selector).forEach((button) =>
    button.setAttribute('aria-pressed', String(match(button))),
  );
}

const journey = $('top'),
  leaf = journey.querySelector('.leaf'),
  art = $('art'),
  ctx = art.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sheets = new Map();
let position = -1;
function loadSheet(film, index) {
  const key = film + '-' + index;
  if (!sheets.has(key)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = 'media/' + film + '-ink-' + index + '.webp';
    sheets.set(key, image);
    image.onload = () => paintFrame(position);
  }
  return sheets.get(key);
}
function paintFrame(number) {
  if (number < 0) return;
  const film = number < 42 ? 'moon' : 'fox',
    frame = number % 42;
  const chunk = Math.floor(frame / 6);
  const sheet = loadSheet(film, chunk);
  if (sheet.complete && sheet.naturalWidth) {
    const tile = frame % 6;
    ctx.drawImage(
      sheet,
      (tile % 2) * 832,
      Math.floor(tile / 2) * 468,
      832,
      468,
      0,
      0,
      832,
      468,
    );
    art.classList.add('ready');
    art.dataset.frame = String(films[film].first + frame);
    art.dataset.film = film;
  }
}
function showFrame(value) {
  const number = Math.max(0, Math.min(83, Math.round(value)));
  if (position === number) return;
  position = number;
  const film = number < 42 ? 'moon' : 'fox',
    frame = number % 42,
    info = films[film];
  $('scrub').value = number;
  $('scrub').setAttribute(
    'aria-valuetext',
    info.title + ' · ' + (info.first + frame),
  );
  $('framecode').textContent =
    'F. ' + String(info.first + frame).padStart(4, '0');
  $('phase').textContent =
    frame < 10
      ? tr('蓄势', 'Gather')
      : frame < 21
        ? film === 'moon'
          ? tr('落喙', 'Strike')
          : tr('起跃', 'Spring')
        : tr('收锋', 'Release');
  $('plate').textContent = info.number;
  $('legend').textContent = info.title;
  $('poem').textContent =
    film === 'moon'
      ? tr('一喙破月，一跃惊雪。', 'One beak breaks the moon.')
      : tr('枝头一柿，雪上一跃。', 'One leap disturbs the snow.');
  pressed(
    '[data-jump]',
    (b) => Number(b.dataset.jump) === (film === 'moon' ? 0 : 42),
  );
  paintFrame(number);
  const j = Math.floor(frame / 6);
  if (j < 6) loadSheet(film, j + 1);
  if (j > 0) loadSheet(film, j - 1);
  if (j === 6 && film === 'moon') loadSheet('fox', 0);
}
let scheduled = false;
function followScroll() {
  scheduled = false;
  if (reduced.matches) return;
  const range = journey.offsetHeight - leaf.offsetHeight;
  if (range > 0) showFrame((-journey.getBoundingClientRect().top / range) * 83);
}
function schedule() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(followScroll);
  }
}
function jump(value) {
  showFrame(value);
  if (!reduced.matches) {
    const start = scrollY + journey.getBoundingClientRect().top;
    window.scrollTo({
      top: start + (value / 83) * (journey.offsetHeight - leaf.offsetHeight),
      behavior: 'instant',
    });
  }
}
$('scrub').addEventListener('input', (e) => jump(Number(e.target.value)));
$('scrub').setAttribute(
  'aria-label',
  tr('逐帧展卷', 'Unroll the brushwork frame by frame'),
);
art.setAttribute(
  'aria-label',
  tr(
    '苍鹭落喙与狐狸跃起的逐帧水墨画',
    'Sequential ink drawings of the heron striking and the fox leaping',
  ),
);
all('[data-jump]').forEach(
  (b) => (b.onclick = () => jump(Number(b.dataset.jump))),
);
function motionMode() {
  $('wheelHint').textContent = reduced.matches
    ? tr('拖动看画', 'Scrub the ink')
    : tr('滚动展卷', 'Scroll to unroll');
  schedule();
}
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
reduced.addEventListener('change', motionMode);
showFrame(0);
motionMode();

const video = $('film'),
  audio = $('audio');
let filmId = 'moon',
  soundId = 'moon',
  layer = 'score',
  listeningData = null,
  filmData = null;
const activeSound = () => soundId + '-' + layer;
function seekFilm(seconds) {
  audio.pause();
  video.currentTime = seconds;
  video.play().catch(() => {});
}
function setProgram(key) {
  const info = films[key];
  const captionMode = video.textTracks[0]?.mode;
  if (filmId !== key) {
    video.pause();
    video.src = 'media/' + key + '.mp4';
    video.poster = 'media/' + key + '-poster.webp';
    const track = document.createElement('track');
    Object.assign(track, {
      kind: 'captions',
      label: 'English',
      srclang: 'en',
      src: 'media/' + key + '.vtt',
      default: captionMode === 'showing',
    });
    video.replaceChildren(track);
    video.load();
  }
  filmId = key;
  video.setAttribute('aria-label', info.title);
  $('programNo').textContent = 'FILM ' + info.number + ' · 00:' + info.length;
  $('filmTitle').textContent = info.title;
  $('synopsis').textContent = info.synopsis;
  pressed('[data-film]', (b) => b.dataset.film === key);
  $('chapters').replaceChildren(
    ...info.chapters.map(([seconds, title]) => {
      const button = document.createElement('button'),
        stamp = document.createElement('time');
      stamp.textContent = time(seconds);
      button.append(stamp, document.createTextNode(title));
      button.onclick = () => seekFilm(seconds);
      return button;
    }),
  );
  const cues = filmData?.films.find((f) => f.id === key)?.cues || [];
  $('transcript').replaceChildren(
    ...cues.map((cue) => {
      const button = document.createElement('button');
      button.lang = 'en';
      button.textContent = cue.text;
      button.onclick = () => seekFilm(cue.start);
      return button;
    }),
  );
}
function waveform() {
  const c = $('wave'),
    pen = c.getContext('2d'),
    a = listeningData?.waveforms[activeSound()];
  if (!a) return;
  const portion = audio.duration ? audio.currentTime / audio.duration : 0;
  const step = c.width / a.length;
  pen.clearRect(0, 0, c.width, c.height);
  pen.fillStyle = '#a2977e';
  pen.fillRect(0, c.height / 2, c.width, 1);
  a.forEach((v, i) => {
    const height = Math.max(2, v * 0.86);
    pen.fillStyle = i / a.length < portion ? '#923d30' : '#645e4e';
    pen.fillRect(
      i * step,
      (c.height - height) / 2,
      Math.max(1, step * 0.53),
      height,
    );
  });
  $('listenSeek').value = portion * 100;
}
function setSound(key, type) {
  audio.pause();
  soundId = key;
  layer = type;
  audio.src =
    'media/' + activeSound() + (layer === 'original' ? '.mp3' : '.m4a');
  audio.load();
  $('scoreTitle').textContent =
    layer === 'foley'
      ? key === 'moon'
        ? tr('喙下的水', 'Water at the beak')
        : tr('爪下的雪', 'Snow underfoot')
      : films[key].score;
  pressed('[data-soundfilm]', (b) => b.dataset.soundfilm === key);
  pressed('[data-layer]', (b) => b.dataset.layer === type);
  waveform();
}
all('[data-film]').forEach(
  (b) =>
    (b.onclick = () => {
      setProgram(b.dataset.film);
      setSound(b.dataset.film, layer);
    }),
);
all('[data-soundfilm]').forEach(
  (b) => (b.onclick = () => setSound(b.dataset.soundfilm, layer)),
);
all('[data-layer]').forEach(
  (b) => (b.onclick = () => setSound(soundId, b.dataset.layer)),
);
video.onplay = () => audio.pause();
audio.onplay = () => video.pause();
audio.ontimeupdate = waveform;
audio.onloadedmetadata = waveform;
$('listenSeek').setAttribute(
  'aria-label',
  tr('音轨位置', 'Position in the listening track'),
);
$('listenSeek').oninput = (e) => {
  if (Number.isFinite(audio.duration))
    audio.currentTime = (audio.duration * Number(e.target.value)) / 100;
};
setProgram('moon');
fetch('media/films.json')
  .then((r) => r.json())
  .then((data) => {
    filmData = data;
    setProgram(filmId);
  });
fetch('listening.json')
  .then((r) => r.json())
  .then((data) => {
    listeningData = data;
    waveform();
    for (const [url, name] of Object.entries(data.credits)) {
      const row = document.createElement('li'),
        link = document.createElement('a');
      link.href = url;
      link.textContent = name + ' ↗';
      row.append(link);
      $('credits').append(row);
    }
  });

const framePlay = $('framePlay');
framePlay.title = tr('从这一帧放映', 'Play from this frame');
framePlay.setAttribute('aria-label', framePlay.title);
framePlay.onclick = () => {
  const key = position < 42 ? 'moon' : 'fox';
  const seconds = (films[key].first + (position % 42)) / 24;
  setProgram(key);
  setSound(key, layer);
  $('screening').scrollIntoView();
  seekFilm(seconds);
};
