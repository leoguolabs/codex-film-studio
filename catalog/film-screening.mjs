// A finished-film player. Story-specific metadata stays in the media bundle.
const section = document.querySelector('[data-film-screening]');
const player = section.querySelector('video');
const title = section.querySelector('[data-film-title]');
const meta = section.querySelector('[data-film-meta]');
const choices = section.querySelector('[data-film-choices]');
const status = section.querySelector('[data-film-status]');
const download = section.querySelector('[data-film-download]');
const revision = new URL(import.meta.url).searchParams.get('v');
const manifestURL = new URL(section.dataset.filmScreening, location.href);
if (revision) manifestURL.searchParams.set('v', revision);
const mediaRoot = new URL('./', manifestURL);
let films = [], selected = 0, failed = false;
const language = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const localized = value => typeof value === 'string' ? value : value?.[language()] ?? value?.en ?? '';
const copy = (en, zh) => language() === 'zh' ? zh : en;
function asset(path) {
  const url = new URL(path, mediaRoot);
  if (!url.href.startsWith(mediaRoot.href)) throw new Error('Film asset outside media bundle');
  if (revision) url.searchParams.set('v', revision);
  return url.href;
}
function renderLanguage() {
  section.querySelectorAll('[data-film-en]').forEach(node => {
    node.textContent = language() === 'zh' ? node.dataset.filmZh : node.dataset.filmEn;
  });
  const film = films[selected];
  if (film) {
    title.textContent = localized(film.title);
    player.setAttribute('aria-label', localized(film.title));
    const minutes = Math.floor(film.duration / 60);
    const seconds = String(Math.floor(film.duration % 60)).padStart(2, '0');
    meta.textContent = `${minutes}:${seconds} · ${film.width} × ${film.height} · ${film.fps} FPS`;
    [...choices.children].forEach((button, index) => {
      button.textContent = localized(films[index].title);
      button.setAttribute('aria-pressed', String(index === selected));
    });
  }
  status.hidden = !failed;
  status.textContent = failed ? copy('The film could not load. Retry playback or open the MP4 below.', '影片未能加载，请重试播放或打开下方 MP4。') : '';
}
function choose(index) {
  selected = index;
  const film = films[index];
  player.pause();
  player.querySelectorAll('track, source').forEach(node => node.remove());
  player.src = asset(film.file);
  player.poster = asset(film.poster);
  player.style.aspectRatio = `${film.width} / ${film.height}`;
  for (const captions of film.captions ?? []) {
    const track = document.createElement('track');
    track.kind = 'subtitles'; track.src = asset(captions.file);
    track.srclang = captions.language; track.label = captions.label;
    player.append(track);
  }
  download.href = asset(film.file);
  failed = false;
  renderLanguage();
  player.load();
}
section.querySelector('[data-film-play]').addEventListener('click', async () => {
  if (player.error) player.load();
  try { await player.play(); failed = false; } catch { failed = true; }
  renderLanguage();
});
player.addEventListener('error', () => { failed = true; renderLanguage(); });
player.addEventListener('playing', () => { failed = false; renderLanguage(); });
// Other pages own their language switch. A language change never resets playback.
new MutationObserver(renderLanguage).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
renderLanguage();
try {
  const response = await fetch(manifestURL);
  if (!response.ok) throw new Error(`Film manifest HTTP ${response.status}`);
  const manifest = await response.json();
  if (!manifest.films?.length) throw new Error('No finished films in bundle');
  films = manifest.films;
  films.forEach((film, index) => {
    const button = document.createElement('button'); button.type = 'button';
    button.addEventListener('click', () => { if (selected !== index) choose(index); });
    choices.append(button);
  });
  choices.hidden = films.length < 2;
  choose(0);
  section.dataset.ready = 'true';
} catch (error) {
  // The native player and direct MP4 remain usable if metadata cannot load.
  failed = true; renderLanguage(); console.error(error);
}
