const $ = selector => document.querySelector(selector);
const many = selector => Array.from(document.querySelectorAll(selector));
const full = $('#film'), teaser = $('#teaser'), audio = $('#audio'), screen = $('.projection');
const params = new URL(location.href).searchParams;
const offline = window.fieldPreview;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let lang = (params.get('lang') || document.documentElement.lang).startsWith('en') ? 'en' : 'zh';
let filmId = params.get('film') === 'creek' ? 'creek' : 'pine';
let selectedSound = filmId, selectedTrack = 'score-original';
let films = [], sound, visible = false, pendingSeek = null;
const choose = (en,zh) => lang === 'en' ? en : zh;
const clock = seconds => String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');
const media = name => new URL('media/'+name,document.baseURI).href;
const fallbackRoot = 'https://github.com/leoguolabs/codex-film-studio/releases/download/colored-pencil-field-notes-v1/';
const defaults = {
  pine:{id:'pine',title:{en:'After the Rain',zh:'雨后的松果'},description:{en:'Follow the winged seed back to the forest floor.',zh:'一粒带翅的种子离开枝头，落回林地。'},duration:4028/24,chapters:[],transcript:[]},
  creek:{id:'creek',title:{en:'Where the Creek Goes',zh:'溪流去了哪里'},description:{en:'Follow a vanishing creek through limestone to its spring.',zh:'跟随溪流走进石灰岩，再到山脚的泉口找它。'},duration:180,chapters:[],transcript:[]}
};
function film(id) {return films.find(item=>item.id===id)||defaults[id];}
function filmURL(id){return offline?.movies?.[id] || film(id).file || fallbackRoot+id+'.mp4';}
function other(){return filmId==='pine'?'creek':'pine';}
function setQuery(changes){
  if(location.protocol==='file:')return;
  const u=new URL(location.href);
  for(const [key,value] of Object.entries(changes)){
    if(value===null)u.searchParams.delete(key);else u.searchParams.set(key,value);
  }
  history.replaceState(null,'',u);
}
function filmNotes(){
  const f=film(filmId);
  $('#film-title').textContent=f.title[lang];$('#other-title').textContent=film(other()).title[lang];
  $('#synopsis').textContent=f.description[lang];$('#runtime').textContent=clock(Math.round(f.duration))+' · EN';
  full.setAttribute('aria-label',f.title[lang]);
  $('#enter-film').setAttribute('aria-label',choose('Play ','播放全片 · ')+f.title[lang]);
  $('#transcript').textContent=f.transcript.join('\n\n');
  $('#chapters').replaceChildren(...f.chapters.map(chapter=>{
    const b=document.createElement('button'),t=document.createElement('time');
    b.type='button';t.textContent=clock(chapter.time);b.append(t,chapter[lang]);
    b.addEventListener('click',()=>{startFilm(chapter.time);$('.projection').scrollIntoView({block:'center'});});return b;
  }));
}
function soundNotes(){
  $('#sound-film').value=selectedSound;
  many('[data-track]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.track===selectedTrack)));
  const s=sound?.films[selectedSound];
  if(!s)return;
  $('#score-title').textContent=s.title;$('#music-prompt').textContent=s.prompt;
  $('#sound-edit').textContent=choose('Generated in Google Gemini · Original ','Google Gemini 生成 · 原曲 ')+clock(s.sourceIn)+'–'+clock(s.sourceOut)+choose(' · Used in the film ',' · 入片位置 ')+clock(s.filmIn)+'–'+clock(s.filmOut);
  audio.setAttribute('aria-label',s.title+' · '+$('[data-track="'+selectedTrack+'"]').textContent);
}
function language(){
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.title=choose('A seed on the wind · Field Notes','松籽乘风 · 山野手记');
  many('[data-en]').forEach(el=>{el.dataset.zh??=el.textContent;el.textContent=choose(el.dataset.en,el.dataset.zh);});
  $('#language').textContent=choose('中文','English');$('#language').lang=choose('zh-CN','en');
  many('.library').forEach(a=>{a.href='https://leoguolabs.github.io/codex-film-studio/?lang='+lang+'#library';});
  filmNotes();soundNotes();
}
function previewPlayback(){
  if(visible && !document.hidden && !screen.classList.contains('full') && !motion.matches){
    teaser.play().catch(()=>{ /* The poster and full-film button remain available. */ });
  }else teaser.pause();
}
function selectFilm(id){
  full.pause();teaser.pause();filmId=id;pendingSeek=null;
  screen.classList.remove('full');$('.film-error').hidden=true;
  full.src=filmURL(id);full.poster=media(id+'.webp');$('#direct').href=full.src;
  const captions=document.createElement('track');
  captions.kind='subtitles';captions.srclang='en';captions.label='English';captions.src=media(id+'.vtt');
  full.replaceChildren(captions);full.load();
  teaser.poster=media(id+'.webp');
  teaser.loop=true;
  teaser.muted=true;
  teaser.src=offline?.glimpses?.[id] || media(id+'-glimpse.mp4');
  teaser.load();filmNotes();previewPlayback();
}
function seekFull(){
  if(pendingSeek!==null && full.readyState>=1){full.currentTime=Math.min(pendingSeek,full.duration-.1);pendingSeek=null;}
}
function startFilm(at){
  screen.classList.add('full');teaser.pause();audio.pause();
  pendingSeek=at;seekFull();$('.film-error').hidden=true;
  full.play().catch(()=>{if(full.error)$('.film-error').hidden=false;});
}
full.addEventListener('loadedmetadata',seekFull);
full.addEventListener('error',()=>{$('.film-error').hidden=false;});
full.addEventListener('playing',()=>{audio.pause();$('.film-error').hidden=true;});
$('#enter-film').addEventListener('click',()=>startFilm(0));
$('.other-film').addEventListener('click',()=>{
  selectFilm(other());
  audio.pause();selectedSound=filmId;soundtrack();
  setQuery({film:filmId,t:null});
});
$('#language').addEventListener('click',()=>{lang=lang==='en'?'zh':'en';setQuery({lang});language();});
function soundtrack(){
  const resume=!audio.paused;
  audio.src=media(selectedSound+'-'+selectedTrack+'.m4a');audio.load();soundNotes();
  if(resume)audio.play().catch(()=>{});
}
$('#sound-film').addEventListener('change',e=>{selectedSound=e.target.value;soundtrack();});
many('[data-track]').forEach(b=>b.addEventListener('click',()=>{selectedTrack=b.dataset.track;soundtrack();}));
audio.addEventListener('playing',()=>full.pause());
new IntersectionObserver(entries=>{visible=entries[0].intersectionRatio>=.22;previewPlayback();},{threshold:.22}).observe(screen);
document.addEventListener('visibilitychange',previewPlayback);motion.addEventListener('change',previewPlayback);
document.documentElement.classList.add('has-screen');
selectFilm(filmId);language();
async function load(name){const r=await fetch(media(name));if(!r.ok)throw Error(name);return r.json();}
const data=await Promise.allSettled([offline?.films || load('films.json'),offline?.sound || load('sound.json')]);
if(data[0].status==='fulfilled'){films=data[0].value.films;filmNotes();}
const initialTime=Number(params.get('t'));
if(initialTime>0 && Number.isFinite(initialTime)){
  screen.classList.add('full');pendingSeek=initialTime;full.preload='metadata';full.load();teaser.pause();
}
if(data[1].status==='fulfilled'){
  sound=data[1].value;
  $('#credits').replaceChildren(...sound.recordings.map(r=>{
    const li=document.createElement('li'),a=document.createElement('a'),l=document.createElement('a');
    a.href=r.url;a.textContent=r.title;l.href=r.license_url;l.textContent=r.license;
    li.append(a,' · '+r.artist+' · ',l);return li;
  }));
  soundNotes();
}
if(selectedSound==='creek')soundtrack();
