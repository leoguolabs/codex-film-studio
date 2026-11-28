const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const url = new URL(location.href);
const zh = (url.searchParams.get('lang') || navigator.language).toLowerCase().startsWith('zh');
const pick = (en, cn) => zh ? cn : en;
document.documentElement.lang = pick('en', 'zh-CN');
document.title = pick('Anatomy of a Voice · Line Cutaway', '声音的剖面 · 线稿剖面');
if (zh) {
  all('[data-zh]').forEach(el => el.textContent = el.dataset.zh);
  all('[data-zh-aria]').forEach(el => el.setAttribute('aria-label', el.dataset.zhAria));
}
url.searchParams.set('lang', pick('zh','en'));
$('.lang').href = url.href;
$('.lang').textContent = pick('中文','EN');
$('.lang').lang = pick('zh-CN','en');
$('.library').href = '../../../?lang=' + pick('en','zh') + '#library';
const clock = t => Math.floor(t/60) + ':' + String(Math.floor(t%60)).padStart(2,'0');
const journey = $('.journey'), folio = $('.folio');
const plate = $('#plate'), ink = plate.getContext('2d'), leader = $('#leader').getContext('2d');
const stops = all('[data-stop]');
const frames = 112, tile = 736, batch = 8;
const sheets = new Map();
let frame = 0, shown = -1, pinFrame = -1, anchors = [], scheduled = false, lastPhase = -1;
const observations = [
  $('.deck').textContent,
  pick('Lift away the grille. Tucked under the diaphragm, a copper winding moves with every syllable.','网罩升起。振膜下面藏着一圈铜线，每说一个音节，它都跟着动。'),
  pick('Look into the gap. As the wire moves through the magnetic field, a voltage appears across its ends.','再靠近一点。铜线在细窄的磁隙中往返，两端便产生电压。')
];

function requestSheet(group) {
  if (group < 0 || group >= frames/batch || sheets.has(group)) return;
  const img = new Image();
  sheets.set(group,img);
  img.onload = () => {
    if (Math.floor(frame/batch) === group) paint();
  };
  img.onerror = () => sheets.delete(group);
  img.src = 'media/plate-' + String(group).padStart(2,'0') + '.webp';
}
function drawLeader(index) {
  leader.clearRect(0,0,tile,tile);
  if (!anchors[index]) return;
  const [x,y] = anchors[index].map(v => v*tile);
  const phase = index < 29 ? 0 : index < 78 ? 1 : 2;
  const labels = [pick('Woven grille','编织网罩'),pick('Copper winding','铜线圈'),pick('Magnetic gap','磁隙')];
  // Place the text on the outer arc; keep the first end on the projected mesh.
  const right = phase !== 2, exit = right ? 619 : 108;
  const ty = clamp(y + [-128,108,86][phase],55,650);
  leader.strokeStyle='#a3482c';leader.fillStyle='#a3482c';leader.lineWidth=1.2;
  leader.beginPath();leader.moveTo(x,y);leader.lineTo(exit,ty);leader.lineTo(right ? 700 : 33,ty);leader.stroke();
  leader.beginPath();leader.arc(x,y,3.1,0,2*Math.PI);leader.fill();
  leader.fillStyle='#663c2f';leader.font=(innerWidth<=720 ? '23px ' : zh ? '19px ' : '16px ')+'PlateMono, monospace';
  leader.textAlign=right?'right':'left';leader.fillText(labels[phase],right ? 701 : 33,ty-8);
}
function paint() {
  const group = Math.floor(frame/batch);
  const img = sheets.get(group);
  if (img?.complete && img.naturalWidth && shown !== frame) {
    const j = frame % batch;
    ink.drawImage(img,(j%4)*tile,Math.floor(j/4)*tile,tile,tile,0,0,tile,tile);
    shown = frame;
  }
  // Keep the callout fixed to the last visible picture while a sheet loads.
  const visible = Math.max(0,shown);
  if (anchors.length && pinFrame !== visible) {
    drawLeader(visible);pinFrame = visible;
  }
  const active = visible < 29 ? 0 : visible < 78 ? 1 : 2;
  if (lastPhase!==active) { $('.deck').textContent=observations[active]; lastPhase=active; }
  stops.forEach((b,i) => i === active ? b.setAttribute('aria-current','step') : b.removeAttribute('aria-current'));
  plate.dataset.frame = String(visible);
}
function scrollDrawing() {
  scheduled = false;
  const rect=journey.getBoundingClientRect();
  const length=Math.max(1, journey.offsetHeight-folio.offsetHeight);
  const fraction=motion.matches?0:clamp(-rect.top/length,0,1);
  const next=Math.round(fraction*(frames-1)), dir=next>=frame?1:-1;
  frame=next;const group=Math.floor(frame/batch);
  for (const key of sheets.keys()) if(Math.abs(key-group)>2) sheets.delete(key);
  requestSheet(group);
  if (!motion.matches) {
    requestSheet(group+dir);
    requestSheet(group-dir);
  }
  folio.style.setProperty('--turn', (fraction*95).toFixed(1)+'deg');
  paint();
}
function scheduleDrawing() {
  if (!scheduled) {scheduled=true;requestAnimationFrame(scrollDrawing);}
}
addEventListener('scroll',scheduleDrawing,{passive:true});
addEventListener('resize',scheduleDrawing);motion.addEventListener('change',scheduleDrawing);
stops.forEach(button => button.addEventListener('click',() => {
  const top=journey.getBoundingClientRect().top+scrollY+Number(button.dataset.stop)*(journey.offsetHeight-folio.offsetHeight);
  window.scrollTo({top,behavior:motion.matches?'instant':'smooth'});
}));
fetch('anchors.json').then(r=>r.json()).then(data=>{anchors=data;drawLeader(Math.max(0,shown));}).catch(()=>{});
document.fonts.ready.then(()=>drawLeader(Math.max(0,shown)));
scrollDrawing();

const film=$('#film'), glimpse=$('#glimpse'), audio=$('#audio'), play=$('#play');
const release='https://github.com/leoguolabs/codex-film-studio/releases/download/line-cutaway-signal-v1/';
const reelButtons=all('[data-film]'), trackButtons=all('[data-track]');
const synopsis={
  coil:pick('A microphone has no battery. Under the grille, a curl of wire turns the pressure of a voice into an electrical signal.','这支麦克风里没有电池。网罩下，一圈铜线随振膜移动，把说话时的气压变化变成电信号。'),
  valve:pick('Two openings look alike. Inside, a steel ball lifts two millimetres to let air through, then closes against a narrow rim.','从外面看，两个管口几乎一样。里面的钢球抬起两毫米，空气便能流过；回流时，钢球贴紧阀座。')
};
let films=[], selected, listening, stem='score', entered=false, onScreen=false;
function showPreview(){
  if (!entered && onScreen && !motion.matches && !document.hidden) glimpse.play().catch(()=>{});
  else glimpse.pause();
}
new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;showPreview();},{threshold:.25}).observe($('.screen'));
motion.addEventListener('change',showPreview);document.addEventListener('visibilitychange',showPreview);
function startFilm(time) {
  entered=true;glimpse.pause();glimpse.hidden=true;play.hidden=true;film.hidden=false;audio.pause();
  if (!film.getAttribute('src')) {film.src=selected.file;film.load();}
  if (time!==undefined) film.currentTime=time;
  const attempt=film.play();attempt?.catch(e=>{if(e.name!=='AbortError')$('#status').textContent=pick('Use the player controls or open the MP4 below.','可用播放器控件继续，或打开下方的 MP4。');});
}
play.addEventListener('click',()=>selected && startFilm(0));
film.addEventListener('playing',()=>{$('#status').textContent='';audio.pause();});
film.addEventListener('error',()=>{if(film.getAttribute('src'))$('#status').textContent=pick('The film could not be loaded. Open the MP4 below.','影片载入失败，可打开下方的 MP4。');});
function timedButton(row,text){
  const btn=document.createElement('button');btn.type='button';
  const stamp=document.createElement('time');stamp.textContent=clock(row);
  btn.append(stamp,document.createTextNode(text));btn.addEventListener('click',()=>startFilm(row));return btn;
}
function chooseFilm(id) {
  selected=films.find(row=>row.id===id) || films[0];
  film.pause();film.removeAttribute('src');film.replaceChildren();film.load();
  entered=false;play.hidden=false;glimpse.hidden=false;film.hidden=true;$('#status').textContent='';
  const key=selected.id,name=zh?selected.title_zh:selected.title;
  film.poster=glimpse.poster='media/'+key+'.jpg';glimpse.src='media/'+key+'-glimpse.mp4';
  const cc=document.createElement('track');cc.kind='captions';cc.srclang='en';cc.label='English';cc.src='media/'+key+'.vtt';film.append(cc);
  $('#film-title').textContent=name;film.setAttribute('aria-label',name);$('#direct').href=selected.file;
  $('#synopsis').textContent=synopsis[key];$('#runtime').textContent=clock(Math.round(selected.seconds))+'  ·  1080p  ·  EN';
  $('#chapters').replaceChildren(...selected.chapters.map(([s,en,cn])=>timedButton(s,pick(en,cn))));
  $('#transcript').replaceChildren(...selected.cues.map(c=>timedButton(c.time,c.text)));
  reelButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.film===key)));
  $('#sound-film').value=key;chooseSound(key,'score');showPreview();
}
const wave=$('.wave').getContext('2d');
function drawWave(){
  if(!listening)return;
  const samples=listening.waves[stem], played=audio.duration?audio.currentTime/audio.duration:0;
  wave.clearRect(0,0,850,100);
  samples.forEach((value,i)=>{
    const h=Math.max(2,value*91);wave.fillStyle=i/samples.length<played?'#a44228':'#655f51';
    wave.fillRect(i*850/samples.length,50-h/2,3.8,h);
  });
}
function chooseSound(id,track){
  listening=films.find(row=>row.id===id);stem=track;audio.pause();
  audio.src=release+id+'-'+stem+'.m4a';audio.setAttribute('aria-label',(zh?listening.title_zh:listening.title)+' · '+trackButtons.find(b=>b.dataset.track===stem).textContent);
  trackButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.track===stem)));drawWave();
}
audio.addEventListener('timeupdate',drawWave);audio.addEventListener('play',()=>film.pause());
reelButtons.forEach(b=>b.addEventListener('click',()=>{if(films.length && selected?.id!==b.dataset.film)chooseFilm(b.dataset.film);}));
$('#sound-film').addEventListener('change',e=>chooseSound(e.target.value,stem));
trackButtons.forEach(b=>b.addEventListener('click',()=>{if(listening && stem!==b.dataset.track)chooseSound(listening.id,b.dataset.track);}));
fetch('media/films.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(data=>{
  films=data.films;chooseFilm(new URLSearchParams(location.search).get('film'));
}).catch(()=>{$('#status').textContent=pick('Open the MP4 to watch the film.','可打开 MP4 观看影片。');play.hidden=true;});
