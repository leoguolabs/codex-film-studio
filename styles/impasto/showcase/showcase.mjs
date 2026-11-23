const byId = id => document.getElementById(id);
const player = byId('player');
const media = new URL('./media/', location.href);
const url = new URL(location.href);
const copy = [...document.querySelectorAll('[data-zh]')].map(node => [node, node.textContent]);
const illustrations = [...document.querySelectorAll('[data-zh-alt]')].map(node => [node, node.alt]);
const filmButtons = [...document.querySelectorAll('[data-film]')];
let films = [];
let selected;
let sound;
let language = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
let pendingSeek;
let waveforms = {};

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
    const button = document.createElement('button');
    button.append(element('time',clock(chapter.at)), element('span',chapter.label[language]));
    button.type = 'button';
    button.onclick = () => { seek(chapter.at); player.play().catch(() => {}); };
    return button;
  }));
}
function labelAudio() {
  const labels = [words('Gemini original','Gemini 原曲'),words('Edited score','成片配乐'),words('Foley & ambience','拟音与环境声')];
  [...byId('tracks').children].forEach((row, i) => {
    const title = sound.title[language] + ' · ' + labels[i];
    row.querySelector('strong').textContent = labels[i];
    row.querySelector('button').setAttribute('aria-label', words('Play or pause ', '播放或暂停') + title);
    const seekbar = row.querySelector('input');
    if (seekbar) seekbar.setAttribute('aria-label', words('Seek ', '跳转试听位置：') + title);
    row.querySelector('small').textContent = (i ? words('Film','成片') : words('Source','原曲')) + ' ' + clock(sound.samples[i].start);
    row.querySelector('audio').setAttribute('aria-label', sound.title[language] + ' · ' + labels[i]);
  });
  byId('edits').replaceChildren(...sound.edits.map(([original, film]) => element('div', words('Gemini','原曲') + ' ' + original + ' → ' + words('film','成片') + ' ' + film)));
  byId('score-note').textContent = sound.score[language];
}
function soundTrack(sample) {
  const row = element('div', '');
  row.className = 'track';
  const audio = document.createElement('audio');
  audio.src = asset(sample.file);
  audio.preload = 'metadata';
  const label = element('div', '');
  label.append(element('strong', ''), element('small', ''));
  const toggle = element('button', '');
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  const wave = element('div', '');
  wave.className = 'wave';
  const peaks = waveforms[sample.file] || [];
  const bars = peaks.map(height => {
    const bar = document.createElement('i');
    bar.setAttribute('aria-hidden', 'true');
    bar.style.setProperty('--h', Math.max(6, height) + '%');
    return bar;
  });
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0'; slider.max = '18'; slider.step = '.1'; slider.value = '0';
  const time = element('time','0:18');
  wave.append(...bars, slider);
  row.append(toggle, label, wave, time, audio);
  function progress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 18;
    slider.max = String(duration);
    slider.value = String(audio.currentTime);
    slider.setAttribute('aria-valuetext', clock(audio.currentTime) + ' / ' + clock(duration));
    time.textContent = clock(Math.ceil(Math.max(0, duration-audio.currentTime)));
    bars.forEach((bar,index) => bar.classList.toggle('played', index < audio.currentTime/duration*bars.length));
  }
  toggle.onclick = () => {
    if (!audio.paused) { audio.pause(); return; }
    audio.play().catch(() => {
      audio.controls = true;
      row.classList.add('native-track');
    });
  };
  slider.oninput = () => { if (audio.readyState) audio.currentTime = Number(slider.value); };
  audio.onplay = () => toggle.setAttribute('aria-pressed','true');
  audio.onpause = () => toggle.setAttribute('aria-pressed','false');
  audio.ontimeupdate = progress;
  audio.onloadedmetadata = progress;
  return row;
}
function selectSound(film) {
  if (sound === film) return;
  byId('tracks').querySelectorAll('audio').forEach(audio => audio.pause());
  sound = film;
  byId('sound-film').value = film.id;
  byId('music-prompt').textContent = film.prompt;
  byId('tracks').replaceChildren(...film.samples.map(soundTrack));
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
  for (const [node, en] of illustrations) node.alt = words(en, node.dataset.zhAlt);
  byId('library').href = language === 'zh' ? '../../../zh/#library' : '../../../#library';
  document.querySelector('.brand').href = language === 'zh' ? '../../../zh/' : '../../../';
  document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  document.querySelectorAll('[data-shot]').forEach(link => {
    const dest = new URL(link.href);
    dest.searchParams.set('lang',language);
    link.href = dest;
  });
  document.querySelector('.pigment').setAttribute('aria-label',
    words('Four palette-knife pigments under movable light', '随侧光改变明暗的四块画刀颜料'));
  updateLight();
  if (selected) highlightFilm();
  if (sound) labelAudio();
}
document.querySelectorAll('[data-language]').forEach(button => {
  button.onclick = () => { language = button.dataset.language; updateLink('lang', language); localize(); };
});
function updateLight() {
  const step = Number(byId('light').value);
  document.querySelector('.pigment').style.backgroundPosition =
    (step%4)*100/3 + '% ' + Math.floor(step/4)*50 + '%';
  const degrees = -82.5 + step*15;
  const direction = degrees < 0 ? words('left ', '左侧 ') : words('right ', '右侧 ');
  const value = Math.abs(degrees) + '°';
  byId('angle').value = (degrees < 0 ? '−' : '+') + value;
  byId('light').setAttribute('aria-valuetext', direction + value);
}
byId('light').oninput = updateLight;
byId('watch').addEventListener('click', () => { player.play().catch(() => {}); });
localize();
try {
  const result = await fetch(asset('films.json'));
  if (!result.ok) throw new Error('Film manifest ' + result.status);
  films = (await result.json()).films;
  try {
    const peaks = await fetch(new URL('waves.json', import.meta.url));
    if (peaks.ok) waveforms = await peaks.json();
  } catch { /* Audio playback can still use the time slider. */ }
  const find = id => films.find(film => film.id === id) || films[0];
  const initialTime = Number(url.searchParams.get('t'));
  chooseFilm(find(url.searchParams.get('film')), Number.isFinite(initialTime) ? initialTime : 0);
  filmButtons.forEach(button => {
    button.onclick = () => {
      updateLink('film', button.dataset.film);
      if (selected.id !== button.dataset.film) chooseFilm(find(button.dataset.film));
      byId('projection').scrollIntoView();
    };
  });
  byId('sound-film').onchange = event => selectSound(find(event.target.value));
  document.querySelectorAll('[data-shot]').forEach(link => {
    link.onclick = event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.replaceState(null,'', link.href);
      chooseFilm(find(link.dataset.shot), Number(link.dataset.at));
      byId('projection').scrollIntoView();
      player.focus({preventScroll:true});
      player.play().catch(() => {});
    };
  });
} catch (error) {
  byId('chapters').textContent = words('Film details could not load. Reload to try again.','影片资料未加载，请刷新重试。');
  console.error(error);
}
