const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const media = name => new URL('media/' + name, document.baseURI).href;
const release = 'https://github.com/leoguolabs/codex-film-studio/releases/download/vermilion-papercut-screening-v1/';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const navigation = new URL(location.href);
const filmPlayer = $('#film');
const audioPlayer = $('#audio');
const studySection = $('#paper-motion');
const coverCanvas = $('#cover-frame');
const coverContext = coverCanvas.getContext('2d', { alpha: false });
const sheetCanvas = $('#motion-frame');
const context = sheetCanvas.getContext('2d', { alpha: false });
const spritemap = new Map();

const scenes = [
  { id:'cut', film:'wind', time:26.2, stop:.52, en:'Cut', zh:'剪口',
    about:{ en:'Scissors move along the edge. Each shard lets go as the blades meet.', zh:'剪刀沿纸边推进。每次合刃，才有一片纸屑松开。' } },
  { id:'fold', film:'wind', time:30.5, stop:.62, en:'Unfold', zh:'展开',
    about:{ en:'The fold opens into two matching tails. The tiny bridges hold the pattern together.', zh:'折痕张开，露出两条镜像的纸尾。纹样之间细小的纸桥，把它们连在一起。' } },
  { id:'light', film:'ferry', time:31, stop:.79, en:'Backlight', zh:'透光',
    about:{ en:'The sheet stays red. Candlelight only passes through the arrow and the small cutouts.', zh:'纸面仍是朱红。烛光只从箭头和细小的剪孔里穿过去。' } },
  { id:'turn', film:'wind', time:40.5, stop:.53, en:'Turn', zh:'翻页',
    about:{ en:'A diagonal fold carries away the indigo night to uncover an ivory morning.', zh:'一道斜折痕掀过靛蓝夜色，露出米纸色的早晨。' } },
];

const fallback = {
  wind:{
    id:'wind', title:{ en:'The Wind’s Two Tails', zh:'风的两条尾巴' },
    description:{ en:'Two swallows give Mina an idea for her kite.', zh:'米娜的纸鸢总往一边打转。两只并飞的燕子，让她想到了只剪一刀的办法。' },
    music:{ title:'Two Tails in the Air' },
  },
  ferry:{
    id:'ferry', title:{ en:'The Ferry Light', zh:'渡船灯' },
    description:{ en:'Nell cuts a lighted sign to guide a ferry through the fog.', zh:'渡船在雾里找不到岸。内尔剪出一只箭头，让烛光替她指路。' },
    music:{ title:'The Lantern Finds the Water' },
  },
};

let lang = navigation.searchParams.get('lang') === 'en' ? 'en' : 'zh';
let filmId = navigation.searchParams.get('film') === 'ferry' ? 'ferry' : 'wind';
let soundId = filmId;
let trackId = 'score';
let films = fallback;
let pendingSeek = null;
let spriteData;
let motionIndex = 0;
let chosenIndex = 0;
let scheduled = false;
let drawnKey = '';
let coverFrame = -1;

const say = (en,zh) => lang === 'en' ? en : zh;
const clock = t => String(Math.floor(t/60)).padStart(2,'0') + ':' + String(Math.floor(t%60)).padStart(2,'0');
const precise = t => clock(t) + '.' + String(Math.round(t*1000)%1000).padStart(3,'0');
const filmURL = id => films[id].file || release + id + '.mp4';

function updateAddress() {
  if (location.protocol === 'file:') return;
  const target = new URL(location.href);
  target.searchParams.set('lang',lang);
  if (filmId === 'wind') target.searchParams.delete('film');
  else target.searchParams.set('film',filmId);
  history.replaceState(null,'',target);
}

function openFilm(at) {
  const cap = filmPlayer.textTracks[0];
  if (cap?.mode === 'disabled') cap.mode = 'hidden';
  audioPlayer.pause();
  pendingSeek = at;
  seekFilm();
  const playback = filmPlayer.play();
  playback?.catch(() => {
    if (filmPlayer.error) $('.film-error').hidden = false;
  });
}

function seekFilm() {
  if (pendingSeek === null || filmPlayer.readyState < 1) return;
  filmPlayer.currentTime = Math.min(pendingSeek,filmPlayer.duration-.05);
  pendingSeek = null;
}

function updateFilmNotes() {
  const film = films[filmId];
  $('#film-title').textContent = film.title[lang];
  $('#synopsis').textContent = film.description[lang];
  filmPlayer.setAttribute('aria-label',film.title[lang]);
  $('#direct').href = filmURL(filmId);
  all('[data-film]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.film === filmId)));
  $('#chapters').replaceChildren(...(film.chapters || []).map(chapter => {
    const button = document.createElement('button');
    const time = document.createElement('time');
    time.textContent = clock(chapter.time);
    button.type = 'button';
    button.append(time,chapter[lang]);
    button.addEventListener('click',() => openFilm(chapter.time));
    return button;
  }));
  $('#transcript').replaceChildren(...(film.transcript || []).map(line => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line.text;
    return paragraph;
  }));
}

function selectFilm(id) {
  const switching = filmId !== id || filmPlayer.getAttribute('src') !== filmURL(id);
  filmId = id;
  if (switching) {
    filmPlayer.pause();
    pendingSeek = null;
    filmPlayer.poster = media(id + '-poster.webp');
    filmPlayer.src = filmURL(id);
    filmPlayer.querySelector('track').src = media(id + '.vtt');
    $('.film-error').hidden = true;
  }
  updateFilmNotes();
}

function updateSoundNotes() {
  const score = films[soundId].music;
  $('#sound-film').value = soundId;
  $('#score-title').textContent = score.title;
  $('#sound-edit').textContent = score.sourceIn === undefined ? '' : say(
    'Google Gemini · Source ' + precise(score.sourceIn) + '–' + precise(score.sourceOut) + ' · Accent at ' + precise(score.anchor) + ' in the film.',
    'Google Gemini · 取用原曲 ' + precise(score.sourceIn) + '–' + precise(score.sourceOut) + ' · 对齐成片 ' + precise(score.anchor) + ' 的动作。',
  );
  $('#music-prompt').textContent = score.prompt || '';
  all('[data-track]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.track === trackId)));
  audioPlayer.setAttribute('aria-label',score.title + ' · ' + $('[data-track="' + trackId + '"]').textContent);
}

function selectTrack() {
  const next = release + soundId + '-' + trackId + '.m4a';
  if (audioPlayer.getAttribute('src') !== next) {
    audioPlayer.pause();
    audioPlayer.src = next;
  }
  updateSoundNotes();
}

function updateSceneText() {
  const scene = scenes[motionIndex];
  $('#study-title').textContent = scene[lang];
  $('#study-copy').textContent = scene.about[lang];
  all('[data-study]').forEach(button => {
    button.setAttribute('aria-pressed',String(button.dataset.study === scene.id));
  });
}

function setLanguage() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = say('Paper Holds Light · Vermilion Paper Cut','纸里有光 · 朱红窗花剪纸');
  all('[data-en]').forEach(element => {
    element.dataset.zh ??= element.textContent;
    element.textContent = say(element.dataset.en,element.dataset.zh);
  });
  all('[data-alt-en]').forEach(element => {
    element.dataset.altZh ??= element.alt;
    element.alt = say(element.dataset.altEn,element.dataset.altZh);
  });
  $('#language').textContent = say('中文','English');
  $('#language').lang = say('zh-CN','en');
  all('.to-library,.imprint').forEach(link => {
    link.href = new URL('../../../?lang=' + lang + '#library',document.baseURI).href;
  });
  updateFilmNotes();
  updateSoundNotes();
  updateSceneText();
}

function sprite(file) {
  if (spritemap.has(file)) return spritemap.get(file);
  const image = new Image();
  const item = { image, ready:false };
  spritemap.set(file,item);
  image.addEventListener('load',() => {
    item.ready = true;
    schedule();
  });
  image.src = new URL(file,media('')).href;
  return item;
}

function drawCell(target,record,index) {
  const { width,height,columns,framesPerPanel } = spriteData;
  const sheet = sprite(record.panels[Math.floor(index/framesPerPanel)]);
  if (!sheet.ready) return false;
  const slot = index%framesPerPanel;
  const x = (slot%columns)*width;
  const y = Math.floor(slot/columns)*height;
  target.drawImage(sheet.image,x,y,width,height,0,0,width,height);
  return true;
}

function paint(study,index) {
  const key = study.id + ':' + index;
  if (drawnKey === key) return;
  const record = spriteData.studies[study.id];
  if (!drawCell(context,record,index)) {
    drawnKey = '';
    sheetCanvas.classList.remove('visible');
    return;
  }
  sheetCanvas.dataset.frame = key;
  sheetCanvas.classList.add('visible');
  drawnKey = key;
}

function renderCover(sectionTop) {
  if (!coverContext || reduce.matches || sectionTop <= 0) return;
  $('.cover-art').style.setProperty('--lift', -Math.min(26,scrollY*.074) + 'px');
  if (scrollY < 3) {
    coverCanvas.classList.remove('visible');
    coverFrame = -1;
    return;
  }
  const turn = spriteData.studies.turn;
  const progress = Math.min(1,scrollY/($('#cover').offsetHeight*.63));
  const index = Math.round(14 + (turn.count-15)*progress);
  if (coverFrame !== index && drawCell(coverContext,turn,index)) {
    coverFrame = index;
    coverCanvas.dataset.frame = String(index);
    coverCanvas.classList.add('visible');
  }
}

function renderMotion() {
  scheduled = false;
  if (!spriteData) return;
  const rect = studySection.getBoundingClientRect();
  const range = Math.max(1,rect.height - $('.motion-sticky').offsetHeight);
  const progress = reduce.matches ?
    (chosenIndex+scenes[chosenIndex].stop)/scenes.length :
    Math.max(0,Math.min(.999999,-rect.top/range));
  const position = progress*scenes.length;
  const index = Math.floor(position);
  const study = scenes[index];
  const change = index !== motionIndex || !studySection.dataset.study;
  if (change) {
    motionIndex = index;
    studySection.dataset.study = study.id;
    $('#motion-poster').src = media(spriteData.studies[study.id].poster);
    sheetCanvas.classList.remove('visible');
    updateSceneText();
  }
  const frameCount = spriteData.studies[study.id].count;
  paint(study, Math.min(frameCount-1,Math.floor((position-index)*frameCount)));
  $('.seam span').style.transform = 'scaleX(' + progress + ')';
  renderCover(rect.top);
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(renderMotion);
}

all('[data-study]').forEach((button,index) => {
  button.addEventListener('click',() => {
    chosenIndex = index;
    if (!spriteData) {
      motionIndex = index;
      $('#motion-poster').src = media(scenes[index].id + '-start.webp');
      updateSceneText();
      return;
    }
    if (reduce.matches) { schedule(); return; }
    const rect = studySection.getBoundingClientRect();
    const range = rect.height - $('.motion-sticky').offsetHeight;
    window.scrollTo({
      top:scrollY+rect.top+range*(index+scenes[index].stop)/scenes.length,
      behavior:'smooth',
    });
  });
});
$('#scene-jump').addEventListener('click',event => {
  const scene = scenes[motionIndex];
  event.preventDefault();
  selectFilm(scene.film);
  updateAddress();
  $('#screening').scrollIntoView({ behavior:reduce.matches ? 'instant' : 'smooth' });
  $('#screening').focus({ preventScroll:true });
  openFilm(scene.time);
});
$('#language').addEventListener('click',() => {
  lang = say('zh','en');
  setLanguage();
  updateAddress();
});
all('[data-film]').forEach(button => button.addEventListener('click',() => {
  selectFilm(button.dataset.film);
  updateAddress();
}));
$('#sound-film').addEventListener('change',event => {
  soundId = event.target.value;
  selectTrack();
});
all('[data-track]').forEach(button => button.addEventListener('click',() => {
  trackId = button.dataset.track;
  selectTrack();
}));
filmPlayer.addEventListener('loadedmetadata',seekFilm);
filmPlayer.addEventListener('playing',() => {
  audioPlayer.pause();
  $('.film-error').hidden = true;
});
filmPlayer.addEventListener('error',() => { $('.film-error').hidden = false; });
audioPlayer.addEventListener('play',() => filmPlayer.pause());
window.addEventListener('scroll',schedule,{ passive:true });
window.addEventListener('resize',schedule,{ passive:true });
reduce.addEventListener('change',schedule);

selectFilm(filmId);
selectTrack();
setLanguage();

async function load(name) {
  const response = await fetch(media(name));
  if (!response.ok) throw Error(name + ' (' + response.status + ')');
  return response.json();
}

const results = await Promise.allSettled([load('films.json'), load('motion.json')]);
if (results[0].status === 'fulfilled') {
  films = Object.fromEntries(results[0].value.films.map(film => [film.id,film]));
  updateFilmNotes();
  updateSoundNotes();
}
if (results[1].status === 'fulfilled' && context) {
  spriteData = results[1].value;
  document.documentElement.classList.add('motion-ready');
  for (const scene of scenes) spriteData.studies[scene.id].panels.forEach(sprite);
  schedule();
}
