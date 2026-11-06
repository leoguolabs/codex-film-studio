// Language and player state are independent: translating the page never restarts a film.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const params = new URLSearchParams(location.search);
const revision = new URL(import.meta.url).searchParams.get('v');
let lang = params.get('lang');
if (!['en','zh'].includes(lang)) {
  try { lang = localStorage.getItem('codex-film-language'); } catch {}
  if (!['en','zh'].includes(lang)) lang = 'en';
}
const tr = (en, zh) => lang === 'zh' ? zh : en;
const localized = value => typeof value === 'string' ? value : value?.[lang] ?? value?.en ?? '';
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
const video = $('#film');
let films = [], selected = -1, failed = false, pendingSeek = null;
function media(path) {
  const url = new URL(path, new URL('media/',location.href));
  if (url.origin !== location.origin && !url.href.startsWith('https://github.com/leoguolabs/codex-film-studio/releases/download/')) throw Error('Unapproved media URL');
  if (revision && url.origin === location.origin) url.searchParams.set('v',revision);
  return url.href;
}
function setLanguage(next) {
  lang = next; document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? '爆炸拆解 — Codex Film Studio' : 'Exploded Teardown — Codex Film Studio';
  $$('[data-en]').forEach(el => { el.innerHTML = el.dataset[lang]; });
  $$('[data-lang]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.lang === lang)));
  $$('[data-home]').forEach(a => { const u = new URL(a.href); u.searchParams.set('lang',lang); a.href = u.href; });
  try { localStorage.setItem('codex-film-language',lang); } catch {}
  const u = new URL(location.href); u.searchParams.set('lang',lang); history.replaceState(null,'',u);
  renderFilm(); playLabel(); renderError();
}
function chapterState() {
  const buttons = $$('#chapters button');
  const index = buttons.findLastIndex(b => Number(b.dataset.time) <= video.currentTime);
  buttons.forEach((b,i) => b.setAttribute('aria-current',String(i === index)));
}
function renderFilm() {
  if (selected < 0) return;
  const film = films[selected];
  $('#film-title').textContent = localized(film.title);
  $('#film-description').textContent = localized(film.description);
  $('#film-label').textContent = localized(film.label);
  $('#film-meta').textContent = `${clock(film.duration)} · ${film.width} × ${film.height} · ${film.fps} FPS`;
  video.setAttribute('aria-label',localized(film.title));
  $('#film-choices').replaceChildren(...films.map((f,i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.film = f.id;
    b.setAttribute('aria-pressed',String(i === selected));
    const n = document.createElement('span'); n.textContent = String(i + 1).padStart(2,'0');
    const text = document.createElement('span'), title = document.createElement('b'), detail = document.createElement('small');
    title.textContent = localized(f.title); detail.textContent = `${clock(f.duration)} / 1080P / ENGLISH`;
    text.append(title,detail); b.append(n,text);
    b.addEventListener('click',() => choose(i)); return b;
  }));
  $('#chapters').replaceChildren(...film.chapters.map(c => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.time = c.time;
    const time = document.createElement('small'); time.textContent = clock(c.time);
    b.append(time,document.createTextNode(localized(c.title)));
    b.addEventListener('click',() => {
      if (video.readyState >= 1) { video.currentTime = c.time; chapterState(); }
      else pendingSeek = c.time;
    }); return b;
  }));
  $('#transcript').replaceChildren(...film.transcript.map(line => { const p = document.createElement('p'); p.textContent = line; return p; }));
  $('#film-sources').href = media(film.sources); $('#film-credits').href = media(film.credits);
  chapterState();
}
function choose(index) {
  if (selected === index) return;
  selected = index; pendingSeek = null; const film = films[index];
  video.pause(); video.querySelectorAll('source,track').forEach(el => el.remove());
  video.src = media(film.file); video.poster = media(film.poster);
  for (const caption of film.captions) {
    const track = document.createElement('track'); track.kind = 'subtitles'; track.srclang = caption.language;
    track.label = caption.label; track.src = media(caption.file); video.append(track);
  }
  failed = false; $('#download').href = media(film.file); video.load();
  const url = new URL(location.href); url.searchParams.set('film',film.id); history.replaceState(null,'',url);
  renderFilm(); renderError();
}
function playLabel() { $('#film-play').textContent = video.paused ? tr('▶ Play film','▶ 播放影片') : tr('Ⅱ Pause film','Ⅱ 暂停影片'); }
function renderError() {
  $('#film-error').hidden = !failed;
  $('#film-error').textContent = tr('The film could not load. Retry playback or open Download MP4.','影片未能加载，请重试播放，或使用“下载 MP4”链接。');
}
$('#film-play').addEventListener('click',async () => {
  if (!video.paused) { video.pause(); return; }
  if (video.error) video.load();
  try { await video.play(); failed = false; } catch { failed = true; }
  renderError();
});
video.addEventListener('timeupdate',chapterState);
video.addEventListener('loadedmetadata',() => {
  if (pendingSeek !== null) { video.currentTime = pendingSeek; pendingSeek = null; }
});
video.addEventListener('play',() => { playLabel(); failed = false; renderError(); });
video.addEventListener('pause',playLabel); video.addEventListener('ended',playLabel);
video.addEventListener('error',() => { failed = true; renderError(); });
$$('[data-lang]').forEach(b => b.addEventListener('click',() => setLanguage(b.dataset.lang)));
// A reference playback never competes with the selected production's sound.
const reference = $('.original video');
reference.addEventListener('play',() => video.pause());
video.addEventListener('play',() => reference.pause());
$('.original').addEventListener('toggle',e => { if (!e.target.open) reference.pause(); });
setLanguage(lang);
try {
  const response = await fetch(media('films.json'));
  if (!response.ok) throw Error(`Programme HTTP ${response.status}`);
  const data = await response.json();
  if (!data.films?.length) throw Error('Empty film programme');
  films = data.films;
  choose(Math.max(0,films.findIndex(f => f.id === params.get('film'))));
  document.body.dataset.ready = 'true';
} catch(error) { failed = true; renderError(); console.error('Exploded Teardown programme:',error); }
