const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const release = 'https://github.com/leoguolabs/codex-film-studio/releases/download/paper-lightbox-night-windows-v1/';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const url = new URL(location.href);
let zh = (url.searchParams.get('lang') || navigator.language).startsWith('zh');
const copy = (en, cn) => zh ? cn : en;
const scenes = [
  ['window', 'The landing light', '码头的灯'],
  ['nets', 'Through the nets', '穿过渔网'],
  ['buoy', 'The bell buoy', '敲响浮标'],
  ['bird', 'The brass wren', '机械鸟开口']
];
const program = {
  bell: ['In a fogbound harbour, Nell finds her way home by the sound of an iron bell.', '雾锁港口，内尔循着铁钟的声音，把船驶回家。', 'At 22.47 seconds the iron buoy rings. The score falls away just before contact.', '22.47 秒，浮标的铁钟敲响。钟锤碰到钟口前，配乐先退入静默。'],
  wren: ['On the last evening at Glebe Street station, a penny buys three notes. A bird outside adds a fourth.', '格利布街车站的最后一晚，一枚铜币换来三声鸟鸣。窗外的鹪鹩接上了第四声。', 'The three brass notes have space at 30–33 seconds. The wild bird answers at 40.18.', '30 到 33 秒给机械鸟的三声留出了空间。40.18 秒，窗外的真鸟回应。']
};
const hero = $('#overture'), glass = $('.glass'), canvas = $('#frames');
const ctx = canvas.getContext('2d');
const stops = all('[data-step]');
const strips = new Map();
const count = 32, columns = 4;
let scene = -1, frame = -1, motionRequest = 0, fixedScene = 0, nearHero = true;
function loadStrip(index) {
  if (!ctx || reduced.matches || !scenes[index] || strips.has(index)) return;
  const img = new Image();
  strips.set(index, img);
  img.onload = () => { if (scene === index) { frame = -1; queueDraw(); } };
  img.src = release + scenes[index][0] + '-frames.webp';
}
function draw() {
  motionRequest = 0;
  if (!nearHero) return;
  const travel = Math.max(1, hero.offsetHeight - $('.pin').offsetHeight);
  const p = reduced.matches ? fixedScene / scenes.length : Math.max(0, Math.min(.999999, -hero.getBoundingClientRect().top / travel));
  const index = Math.min(scenes.length - 1, Math.floor(p * scenes.length));
  const phase = p * scenes.length - index;
  const next = Math.round(phase * (count - 1));
  if (scene !== index) {
    scene = index;
    frame = -1;
    glass.classList.remove('ready');
    $('#still').src = 'media/' + scenes[index][0] + '-still.webp';
    $('#plate-title').textContent = scenes[index][zh ? 2 : 1];
    stops.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }
  loadStrip(index);
  if (phase > .55) loadStrip(index + 1);
  if (phase < .2) loadStrip(index - 1);
  if (frame !== next) {
    const strip = strips.get(index);
    if (!reduced.matches && strip?.complete && strip.naturalWidth) {
      const w = canvas.width, h = canvas.height;
      ctx.drawImage(strip, (next % columns) * w, Math.floor(next / columns) * h, w, h, 0, 0, w, h);
      glass.classList.add('ready');
    }
    frame = next;
  }
  $('.case').style.setProperty('--lean', reduced.matches ? '0deg' : (1.8 - 3.6 * p).toFixed(2) + 'deg');
  $('.scroll-rule i').style.width = (16 + p * 84) + '%';
}
function queueDraw() { if (!motionRequest) motionRequest = requestAnimationFrame(draw); }
addEventListener('scroll', queueDraw, {passive:true});
addEventListener('resize', queueDraw);
new IntersectionObserver(([entry]) => { nearHero = entry.isIntersecting; if (nearHero) queueDraw(); }).observe(hero);
reduced.addEventListener('change', () => { fixedScene = Math.max(0, scene); scene = -1; queueDraw(); updateTeaser(); });
stops.forEach((button, i) => button.addEventListener('click', () => {
  fixedScene = i;
  if (reduced.matches) return queueDraw();
  const travel = hero.offsetHeight - $('.pin').offsetHeight;
  scrollTo({top: scrollY + hero.getBoundingClientRect().top + (i + .10) / scenes.length * travel, behavior:'instant'});
  queueDraw();
}));

const player = $('#film'), teaser = $('#glimpse'), audio = $('#audio');
let films, filmKey = 'bell', soundKey = 'bell', track = 'original', inScreen = false;
let filmGeneration = 0;
function updateTeaser() {
  if (inScreen && !reduced.matches && player.hidden && !document.hidden) {
    if (!teaser.getAttribute('src')) teaser.src = release + filmKey + '-glimpse.mp4';
    teaser.play().catch(() => {});
  } else teaser.pause();
}
new IntersectionObserver(([entry]) => {
  inScreen = entry.isIntersecting; updateTeaser();
}, {threshold:.25}).observe($('.screen'));
document.addEventListener('visibilitychange', updateTeaser);
function title(key) {
  return films ? films[key][zh ? 'zh' : 'title'] : (key === 'bell' ? copy('The Bell in the Fog','雾里的钟声') : copy('The Penny Wren','一便士的鹪鹩'));
}
function renderNotes() {
  $('#synopsis').textContent = program[filmKey][zh ? 1 : 0];
  player.setAttribute('aria-label', title(filmKey));
  if (!films) return;
  $('#chapters').replaceChildren(...films[filmKey].chapters.map(([en, cn, s]) => {
    const btn = document.createElement('button');btn.type = 'button';
    const time = document.createElement('time');time.textContent = '0:' + String(Math.floor(s)).padStart(2, '0');
    btn.append(time, copy(en, cn));
    btn.addEventListener('click', () => startFilm(s));return btn;
  }));
  $('#lines').replaceChildren(...films[filmKey].voice.map(line => {
    const p = document.createElement('p');p.textContent = line;return p;
  }));
}
function selectFilm(key) {
  filmKey = key;filmGeneration++;
  player.pause();player.hidden = true;player.removeAttribute('src');player.replaceChildren();player.load();
  teaser.pause();teaser.removeAttribute('src');teaser.poster = player.poster = 'media/' + key + '-poster.webp';teaser.load();
  teaser.hidden = false;$('#play').hidden = false;
  all('[data-film]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.film === key)));
  $('#direct').href = release + key + '.mp4';
  renderNotes();updateTeaser();
}
function startFilm(at = 0) {
  audio.pause();teaser.pause();teaser.hidden = true;$('#play').hidden = true;player.hidden = false;
  if (!player.getAttribute('src')) {
    player.src = release + filmKey + '.mp4';
    const sub = document.createElement('track');
    sub.kind = 'subtitles';sub.srclang = 'en';sub.label = 'English';sub.src = 'media/' + filmKey + '.vtt';player.append(sub);
  }
  const generation = filmGeneration;
  const seek = () => { if (generation === filmGeneration) player.currentTime = at; };
  if (player.readyState >= 1) seek(); else player.addEventListener('loadedmetadata', seek, {once:true});
  player.play().catch(() => {});
}
$('#play').addEventListener('click', () => startFilm());
all('[data-film]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.film === filmKey) return;
  selectFilm(b.dataset.film);selectSound(filmKey, track);
}));
player.addEventListener('play', () => audio.pause());audio.addEventListener('play', () => player.pause());
function soundNotes() {
  if (!films) return;
  const item = films[soundKey];
  $('#song').textContent = item.score;
  audio.setAttribute('aria-label', item.score + ' · ' + $('.auditions [aria-pressed="true"]').textContent);
  $('#music-edit').textContent = copy('The 48-second edit begins ' + item.sourceStart + ' seconds into the Gemini recording. ', '片中连续取用 Gemini 原曲从 ' + item.sourceStart + ' 秒开始的 48 秒。') + program[soundKey][zh ? 3 : 2];
  $('#prompt').textContent = item.prompt;
}
function selectSound(key, value) {
  soundKey = key; track = value;$('#sound-film').value = key;
  all('[data-track]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.track === track)));
  audio.pause();audio.src = release + key + '-' + track + '.m4a';soundNotes();
}
$('#sound-film').addEventListener('change', e => selectSound(e.target.value, track));
all('[data-track]').forEach(b => b.addEventListener('click', () => { if (b.dataset.track !== track) selectSound(soundKey,b.dataset.track); }));
function localize() {
  document.documentElement.lang = zh ? 'zh-CN' : 'en';
  document.title = copy('Night Windows · Paper Lightbox','纸窗入夜 · 纸雕灯影') + ' · Codex Film Studio';
  all('[data-zh]').forEach(el => { el.dataset.en ??= el.textContent;el.textContent = zh ? el.dataset.zh : el.dataset.en; });
  stops.forEach((button, i) => button.setAttribute('aria-label', scenes[i][zh ? 2 : 1]));
  $('#plate-title').textContent = scenes[Math.max(scene,0)][zh ? 2 : 1];
  all('[data-library]').forEach(a => a.href = '../../../?lang=' + (zh ? 'zh' : 'en') + '#library');
  all('[hreflang]').forEach(a => {
    const target = new URL(location.href);target.searchParams.set('lang', a.hreflang);a.href = target;
    if (a.hreflang === (zh ? 'zh' : 'en')) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  renderNotes();soundNotes();
}
localize();selectFilm('bell');selectSound('bell','original');queueDraw();
fetch('media/films.json').then(r => { if (!r.ok) throw Error(r.status);return r.json(); }).then(data => {
  films = data;renderNotes();soundNotes();
}).catch(() => { $('.notes').hidden = true;$('.sleeve details').hidden = true; });
