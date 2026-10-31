// Story-specific chapters and transcript are supplied by the pinned media Release.
const video = document.querySelector('video');
const revision = new URL(import.meta.url).searchParams.get('v');
const language = () => document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const localized = value => typeof value === 'string' ? value : value?.[language()] ?? value?.en ?? '';
let chapters = [];
function markChapter() {
  let active = -1;
  chapters.forEach((chapter,index) => { if(video.currentTime >= chapter.time) active = index; });
  document.querySelectorAll('[data-chapters] button').forEach((button,index) => button.setAttribute('aria-current',String(index === active)));
}
function renderChapters() {
  const nav = document.querySelector('[data-chapters]'); nav.replaceChildren();
  for(const chapter of chapters) {
    const button = document.createElement('button'); button.type = 'button';
    const time = document.createElement('b'); time.textContent = `${Math.floor(chapter.time/60)}:${String(Math.floor(chapter.time%60)).padStart(2,'0')}`;
    const label = document.createElement('span'); label.textContent = localized(chapter.label);
    button.append(time,label);
    button.addEventListener('click',() => {
      video.currentTime = chapter.time; markChapter();
      video.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
    nav.append(button);
  }
  markChapter();
}
function setLanguage(next) {
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  document.title = next === 'zh' ? '鲜彩科学动画 — Codex Film Studio' : 'Vivid Science — Codex Film Studio';
  document.querySelectorAll('[data-en]').forEach(node => node.textContent = next === 'zh' ? node.dataset.zh : node.dataset.en);
  document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.lang === next)));
  document.querySelectorAll('[data-home]').forEach(link => { const url = new URL(link.href); url.searchParams.set('lang',next); link.href = url.href; });
  const url = new URL(location.href); url.searchParams.set('lang',next); history.replaceState(null,'',url);
  try { localStorage.setItem('film-studio-language',next); } catch { /* Storage may be disabled. */ }
  renderChapters();
}
const requested = new URLSearchParams(location.search).get('lang');
let saved; try { saved = localStorage.getItem('film-studio-language'); } catch {}
setLanguage(['en','zh'].includes(requested) ? requested : saved === 'zh' ? 'zh' : 'en');
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click',() => setLanguage(button.dataset.lang)));
document.querySelectorAll('[data-scale]').forEach(button => button.addEventListener('click',() => {
  const phase = button.dataset.scale;
  document.querySelector('[data-scale-view]').dataset.scaleView = phase;
  document.querySelector('.scale-readout').textContent = phase === '1' ? '2.1×' : '1×';
  document.querySelectorAll('[data-scale]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
}));
video.addEventListener('timeupdate',markChapter);
const assetURL = path => { const url = new URL(path,location.href); if(revision) url.searchParams.set('v',revision); return url; };
const sharedPlayer = new URL('../../../catalog/film-screening.mjs',import.meta.url);
if(revision) sharedPlayer.searchParams.set('v',revision);
await import(sharedPlayer.href);
try {
  const response = await fetch(assetURL('media/films.json'));
  if(!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  const data = await response.json(); chapters = data.films?.[0]?.chapters ?? []; renderChapters();
  const transcript = await fetch(assetURL('media/transcript.json'));
  if(!transcript.ok) throw new Error(`Transcript HTTP ${transcript.status}`);
  for(const row of await transcript.json()) {
    const paragraph = document.createElement('p'); paragraph.textContent = row.text;
    document.querySelector('[data-transcript]').append(paragraph);
  }
} catch(error) {
  if(!chapters.length) document.querySelector('[data-chapters]').hidden = true;
  document.querySelector('.transcript').hidden = true;
  console.warn('Optional film details unavailable',error);
}
