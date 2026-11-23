const q = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const video = q('#film'), audio = q('#audio'), plate = q('#plate'), range = q('#loupe-x');
const query = new URL(location.href).searchParams;
const stored = (() => { try { return localStorage.getItem('film-studio-language'); } catch { return ''; } })();
let lang = (query.get('lang') || stored || navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
let films = [], sound, filmId = query.get('film') === 'pine' ? 'pine' : 'creek';
let soundId = filmId, track = 'score-original', specimen = 'creek', pendingTime = null;
const copy = (en, zh) => lang === 'zh' ? zh : en;
const media = name => new URL('media/' + name, document.baseURI).href;
const release = 'https://github.com/leoguolabs/codex-film-studio/releases/download/colored-pencil-field-notes-v1/';
const clock = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
const study = {
  creek:{at:25, title:['Grassy bank · 0:25','溪岸剖面 · 0:25'],note:['Along the bank, olive hatching follows the grass. Just below it, strokes of burnt umber run through the soil. Move the lens along their shared edge.','橄榄绿的排线贴着草皮铺开，下面的土层换成了深褐色斜线。沿着草皮和土层相接的边缘移动放大镜。']},
  pine:{at:54, title:['Cone section · 0:54','松果剖面 · 0:54'],note:['A cut through the cone exposes the pale central stem. Long pencil marks follow the grain outward along each woody scale.','松果剖开后，浅色中轴露了出来。顺着每枚鳞片往外看，铅笔的长线和木纹朝着同一个方向。']}
};
const scoreNotes = {
  creek:['A four-note phrase follows the water. Guitar and clarinet leave space for the close brook and the drops in the cave.','四个音跟着水走。吉他与单簧管留出空隙，近处的溪水和洞里的滴水便听得清楚。'],
  pine:['A three-note question on piano and viola returns as a winged seed leaves the cone. Rain, wind and the soft landing have their own track.','钢琴与中提琴提出三个音的问句，种翼离枝时再度响起。雨、松林风声与轻轻落地的声音另有一条声轨。']
};
function pair(text) { return text[lang === 'zh' ? 1 : 0]; }
function pressed(query, attr, value) {
  all(query).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === value)));
}
function remember(changes) {
  const url = new URL(location.href);
  for (const [k,v] of Object.entries(changes)) v == null ? url.searchParams.delete(k) : url.searchParams.set(k,v);
  history.replaceState(null,'',url);
}
function localize() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = copy('Field Notes · Colored-Pencil Science Illustration · Codex Film Studio','山野手记 · 彩铅科普插画 · Codex Film Studio');
  all('[data-zh]').forEach(el => {
    el.dataset.en ??= el.textContent;
    el.textContent = copy(el.dataset.en, el.dataset.zh);
  });
  all('[data-alt]').forEach(el => {el.dataset.enAlt ??= el.alt; el.alt = copy(el.dataset.enAlt,el.dataset.alt);});
  pressed('[data-lang]','lang',lang);
  q('#library').href = q('#all-foot').href = '../../../?lang='+lang+'#library';
  q('.studio-brand-lockup').href = '../../../?lang='+lang;
  drawFilmNotes(); drawStudy(); drawSoundNotes();
}
function drawFilmNotes() {
  const f = films.find(item => item.id === filmId);
  pressed('[data-film]','film',filmId);
  if (!f) return;
  video.setAttribute('aria-label',f.title[lang]);
  q('#synopsis').textContent = f.description[lang];
  q('#transcript').textContent = f.transcript.join('\n\n');
  q('#chapters').replaceChildren(...f.chapters.map(c => {
    const b = document.createElement('button'), t = document.createElement('time');
    b.type = 'button'; t.textContent = clock(c.time);
    b.append(t, c[lang]); b.addEventListener('click',() => jumpTo(filmId,c.time,true));
    return b;
  }));
}
function loadFilm(id) {
  const f=films.find(item=>item.id===id);
  filmId=id; video.pause(); q('#film-error').hidden=true;
  const url=f?.file || release+id+'.mp4';
  video.src=url; video.poster=media(f?.poster||id+'.webp'); q('#direct').href=url;
  const captions=document.createElement('track');
  captions.kind='subtitles'; captions.srclang='en'; captions.label='English'; captions.src=media(id+'.vtt');
  video.replaceChildren(captions); video.load(); drawFilmNotes();
}
function applySeek(){
  if(pendingTime===null || video.readyState<1 || !Number.isFinite(video.duration))return;
  video.currentTime=Math.min(pendingTime,video.duration-.05); pendingTime=null;
}
function jumpTo(id,time,play) {
  const change = id!==filmId || !video.currentSrc;
  if (change) loadFilm(id);
  pendingTime=time;
  if(video.readyState<1){video.preload='metadata';video.load();} else applySeek();
  remember({film:id,t:time||null});
  if(play) video.play().catch(()=>{if(video.error)q('#film-error').hidden=false;});
}
video.addEventListener('loadedmetadata',applySeek);
video.addEventListener('error',()=>{q('#film-error').hidden=false;});
video.addEventListener('playing',()=>{audio.pause();q('#film-error').hidden=true;});
all('[data-film]').forEach(b=>b.addEventListener('click',()=>jumpTo(b.dataset.film,0,true)));
all('[data-lang]').forEach(b=>b.addEventListener('click',()=>{
  lang=b.dataset.lang; try {localStorage.setItem('film-studio-language',lang);} catch {}
  remember({lang}); localize();
}));
function lensPosition() {
  const glass=q('#lens'), p=Number(range.value)/100, w=plate.clientWidth, h=plate.clientHeight, z=2.45;
  const radius=glass.offsetWidth/2;
  glass.style.left=(p*100)+'%';
  glass.style.backgroundSize=(w*z)+'px '+(h*z)+'px';
  glass.style.backgroundPosition=(radius-w*z*p)+'px '+(radius-h*z*.5)+'px';
}
function drawStudy() {
  const selected=study[specimen], img=q('#specimen');
  const file=specimen+'-detail.webp';
  if(img.getAttribute('src')!==file) img.src=file;
  img.alt=pair(selected.title); q('#lens').style.backgroundImage='url('+file+')';
  q('#study-note').textContent=pair(selected.note); q('#plate-note').textContent=pair(selected.title);
  q('#jump').href='?lang='+lang+'&film='+specimen+'&t='+selected.at+'#screening';
  pressed('[data-study]','study',specimen);lensPosition();
}
all('[data-study]').forEach(b=>b.addEventListener('click',()=>{specimen=b.dataset.study;range.value=57;drawStudy();}));
range.addEventListener('input',lensPosition);
function pointLens(e) {
  const r=plate.getBoundingClientRect();range.value=Math.max(+range.min,Math.min(+range.max,Math.round((e.clientX-r.left)/r.width*100)));
  lensPosition();
}
plate.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)pointLens(e);});plate.addEventListener('pointerdown',pointLens);
new ResizeObserver(lensPosition).observe(plate);
q('#jump').addEventListener('click',e=>{e.preventDefault();q('#screening').scrollIntoView();jumpTo(specimen,study[specimen].at,true);});
function drawSoundNotes() {
  q('#sound-film').value=soundId; pressed('[data-track]','track',track);
  q('#score-note').textContent=pair(scoreNotes[soundId]);
  const data=sound?.films[soundId];
  if(!data)return;
  q('#score-title').textContent=data.title;
  q('#prompt').textContent=data.prompt;
  q('#edits').textContent=copy('Original recording ','原始录音 ')+clock(data.sourceIn)+'–'+clock(data.sourceOut)+copy(' · Heard in the film ',' · 入片位置 ')+clock(data.filmIn)+'–'+clock(data.filmOut);
  audio.setAttribute('aria-label',data.title+' · '+q('[data-track="'+track+'"]').textContent);
}
function setSound() {
  const resume=!audio.paused;
  audio.pause();q('#audio-error').hidden=true;
  audio.src=media(soundId+'-'+track+'.m4a'); audio.load();drawSoundNotes();
  if(resume)audio.play().catch(()=>{if(audio.error)q('#audio-error').hidden=false;});
}
q('#sound-film').addEventListener('change',e=>{soundId=e.target.value;setSound();});
all('[data-track]').forEach(b=>b.addEventListener('click',()=>{track=b.dataset.track;setSound();}));
audio.addEventListener('playing',()=>{video.pause();q('#audio-error').hidden=true;});
audio.addEventListener('error',()=>{q('#audio-error').hidden=false;});
localize();
async function loadJSON(file){const r=await fetch(media(file));if(!r.ok)throw Error(file);return r.json();}
const results=await Promise.allSettled([loadJSON('films.json'),loadJSON('sound.json')]);
if(results[0].status==='fulfilled'){
  films=results[0].value.films;drawFilmNotes();
  const initial=Number(query.get('t'));
  if(filmId==='pine'||initial>0)jumpTo(filmId,Math.max(0,initial||0),false);
} else q('#film-error').hidden=false;
if(results[1].status==='fulfilled'){
  sound=results[1].value;
  q('#recordists').replaceChildren(...sound.recordings.map(r=>{
    const li=document.createElement('li'),source=document.createElement('a'),license=document.createElement('a');
    source.href=r.url;source.textContent=r.title;license.href=r.license_url;license.textContent=r.license;
    li.append(source,' · '+r.artist+' · ',license);return li;
  }));
  if(soundId!=='creek')setSound();else drawSoundNotes();
}
