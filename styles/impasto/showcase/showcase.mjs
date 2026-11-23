const byId = id => document.getElementById(id);
const player = byId('player');
const media = new URL('./media/', location.href);
const url = new URL(location.href);
const copy = [...document.querySelectorAll('[data-zh]')].map(node => [node, node.textContent]);
const filmButtons = [...document.querySelectorAll('[data-film]')];
let films = [];
let selected;
let sound;
let language = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
let pendingSeek;

const words = (en, zh) => language === 'zh' ? zh : en;
const asset = file => new URL(file, media).href;
function clock(time) {
  return Math.floor(time / 60) + ':' + String(Math.floor(time % 60)).padStart(2, '0');
}
function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function pauseOthers(event) {
  const other = event.target;
  if (other.matches('video,audio')) {
    document.querySelectorAll('video,audio').forEach(node => { if (node !== other) node.pause(); });
  }
}
document.addEventListener('play', pauseOthers, true);
function seek(time) {
  const target = Math.max(0, Math.min(selected.duration - .05, time));
  if (player.readyState < 1) pendingSeek = target;
  else player.currentTime = target;
}
player.addEventListener('loadedmetadata', () => {
  if (pendingSeek !== undefined) {
    player.currentTime = pendingSeek;
    pendingSeek = undefined;
  }
});
function highlightFilm() {
  byId('film-title').textContent = selected.title[language];
  byId('synopsis').textContent = selected.synopsis[language];
  player.setAttribute('aria-label', selected.title[language]);
  byId('chapters').replaceChildren(...selected.chapters.map(chapter => {
    const button = element('button', clock(chapter.at) + ' · ' + chapter.label[language]);
    button.type = 'button';
    button.onclick = () => { seek(chapter.at); player.play().catch(() => {}); };
    return button;
  }));
}
function labelAudio() {
  const labels = [words('Gemini original','Gemini 原曲'),words('Edited score','成片配乐'),words('Foley & ambience','拟音与环境声')];
  [...byId('tracks').children].forEach((row, i) => {
    row.querySelector('span').textContent = labels[i];
    row.querySelector('small').textContent = (i ? words('Film','成片') : words('Source','原曲')) + ' ' + clock(sound.samples[i].start);
    row.querySelector('audio').setAttribute('aria-label', sound.title[language] + ' · ' + labels[i]);
  });
  byId('edits').replaceChildren(...sound.edits.map(([original, film]) => element('div', words('Gemini','原曲') + ' ' + original + ' → ' + words('film','成片') + ' ' + film)));
  byId('score-title').textContent = sound.title[language];
  byId('score-note').textContent = sound.score[language];
}
function selectSound(film) {
  if (sound === film) return;
  sound = film;
  byId('sound-film').value = film.id;
  byId('music-prompt').textContent = film.prompt;
  byId('tracks').replaceChildren(...film.samples.map(sample => {
    const row = document.createElement('div');
    row.className = 'track';
    const label = document.createElement('div');
    label.append(element('span',''),element('small',''));
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = asset(sample.file);
    row.append(label,audio);
    return row;
  }));
  labelAudio();
}
function updateLink(key, value) {
  const next = new URL(location.href);
  next.searchParams.set(key, value);
  if (key === 'film') next.searchParams.delete('t');
  history.replaceState(null, '', next);
}
function chooseFilm(film, time = 0) {
  if (film !== selected) {
    selected = film;
    player.pause();
    pendingSeek = undefined;
    player.poster = asset(film.poster);
    const source = asset(film.file);
    if ((player.currentSrc || player.querySelector('source')?.src) !== source) {
      player.replaceChildren();
      player.src = source;
      const track = document.createElement('track');
      Object.assign(track,{kind:'subtitles',src:asset(film.captions[0].file),srclang:'en',label:'English'});
      player.append(track);
      player.load();
    }
    byId('download').href = source;
    byId('transcript').replaceChildren(...film.transcript.map(line => element('p', line)));
    filmButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.film === film.id)));
    highlightFilm();
  }
  if (time > 0 || player.currentTime > 0) seek(time);
  selectSound(film);
}
function localize() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = words('Impasto Oil Painting','厚涂油画') + ' · Codex Film Studio';
  for (const [node, en] of copy) node.textContent = words(en, node.dataset.zh);
  byId('library').href = language === 'zh' ? '../../../zh/#library' : '../../../#library';
  document.querySelector('.brand').href = language === 'zh' ? '../../../zh/' : '../../../';
  document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  document.querySelectorAll('[data-shot]').forEach(link => {
    const dest = new URL(link.href);
    dest.searchParams.set('lang',language);
    link.href = dest;
  });
  if (selected) highlightFilm();
  if (sound) labelAudio();
}
document.querySelectorAll('[data-language]').forEach(button => {
  button.onclick = () => { language = button.dataset.language; updateLink('lang', language); localize(); };
});
localize();
try {
  const result = await fetch(asset('films.json'));
  if (!result.ok) throw new Error('Film manifest ' + result.status);
  films = (await result.json()).films;
  const find = id => films.find(film => film.id === id) || films[0];
  const initialTime = Number(url.searchParams.get('t'));
  chooseFilm(find(url.searchParams.get('film')), Number.isFinite(initialTime) ? initialTime : 0);
  filmButtons.forEach(button => {
    button.onclick = () => { updateLink('film', button.dataset.film); chooseFilm(find(button.dataset.film)); };
  });
  byId('sound-film').onchange = event => selectSound(find(event.target.value));
  document.querySelectorAll('[data-shot]').forEach(link => {
    link.onclick = event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.replaceState(null,'', link.href);
      chooseFilm(find(link.dataset.shot), Number(link.dataset.at));
      byId('screening').scrollIntoView();
      player.focus({preventScroll:true});
      player.play().catch(() => {});
    };
  });
} catch (error) {
  byId('chapters').textContent = words('Film details could not load. Reload to try again.','影片资料未加载，请刷新重试。');
  console.error(error);
}
