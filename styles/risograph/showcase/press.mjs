const $ = selector => document.querySelector(selector);
const all = selector => Array.from(document.querySelectorAll(selector));
const url = new URL(location.href);
let lang = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
let selected = url.searchParams.get('film') === 'bell' ? 'bell' : 'turn';
let stem = 'effects';
// Pin the artwork to the same immutable impression in both language editions.
const art = 'https://raw.githubusercontent.com/leoguolabs/codex-film-studio/2dd70da47ed5bea1f207b14adc436446aec64411/styles/risograph/showcase/';
const release = 'https://github.com/leoguolabs/codex-film-studio/releases/download/risograph-double-bill-v1/';
const movie = $('#movie'), audio = $('#audio'), soundFilm = $('#sound-film');
const text = pair => pair[lang === 'zh' ? 1 : 0];
const films = {
  turn: {
    title: 'One More Turn',
    story: ['With one ride left at the fair, a girl reaches out from her carousel horse. The brass ring will buy one more turn.', '游乐场快打烊了。女孩从旋转木马上探出身子，够到铜环的人，还能再坐一圈。'],
    chapters: [[0,'The ring goes up','挂上铜环'],[8,'Yellow finds the horse','黄墨落在木马上'],[19,'Within reach','伸手去够'],[29,'A change of hands','铜环换了主人'],[32,'Off the press','纸张出机']],
    effects: ['The latch clicks, a ring chimes and the rollers feed the final sheet.', '搭扣咔嗒合上，铜环轻响，滚筒把最后一张纸送出来。'],
    score: ['Plucked strings circle at 120 bpm. The band holds back while the next rider waits.', '拨弦以每分钟 120 拍兜着圈子。下一个孩子在等，乐队也跟着停了一下。']
  },
  bell: {
    title: 'Bell Hop',
    story: ['A sparrow checks into a quiet hotel. One tap on the desk bell sends the night clerk and his cap into the air.', '麻雀走进静悄悄的旅馆，轻按柜台上的铃。夜班猫惊得一跃而起，帽子也飞了。'],
    chapters: [[0,'At the desk','来到柜台'],[4.5,'Across the lobby','穿过大堂'],[12,'The first chime','第一声铃'],[17.75,'The tail replies','尾巴的回应'],[21.75,'A paper hotel','一间纸旅馆']],
    effects: ['Listen for the paper feed, the first chime and the second little answer from the desk.', '先是纸张送入的窸窣声。第一声铃过后，柜台上又传来一声回应。'],
    score: ['A brushed, plucked 108 bpm tune leaves a pocket of silence before each chime.', '拨弦和轻刷的鼓点每分钟走 108 拍，每次铃响前都让出了一点安静。']
  }
};
function updateUrl() {
  url.searchParams.set('lang',lang);
  if(selected==='bell') url.searchParams.set('film',selected);
  else url.searchParams.delete('film');
  url.hash=location.hash;
  history.replaceState(null,'',url);
}
function program() {
  const film=films[selected];
  $('#film-title').textContent=film.title;
  $('#synopsis').textContent=text(film.story);
  movie.setAttribute('aria-label',film.title);
  $('#mp4').href=release+selected+'.mp4';
  for(const button of all('[data-film]')) button.setAttribute('aria-pressed',String(button.dataset.film===selected));
  $('.chapters').setAttribute('aria-label',text(['Film chapters','影片章节']));
  $('.chapters').replaceChildren(...film.chapters.map(([at,en,zh])=>{
    const li=document.createElement('li'),button=document.createElement('button'),time=document.createElement('time');
    time.textContent='0:'+String(Math.floor(at)).padStart(2,'0');
    button.type='button'; button.append(time,document.createTextNode(text([en,zh])));
    button.addEventListener('click',()=>{
      movie.currentTime=at;
      movie.play().catch(()=>{});
    });
    li.append(button);return li;
  }));
}
function loadFilm() {
  movie.pause();
  movie.poster=art+selected+'.webp'; movie.src=release+selected+'.mp4';
  const track=document.createElement('track');
  track.kind='captions';track.label='English';track.srclang='en';track.src=selected+'.vtt';
  movie.replaceChildren(track);movie.load();program();
}
function soundCopy() {
  $('#sound-note').textContent=text(films[soundFilm.value][stem]);
  audio.setAttribute('aria-label',films[soundFilm.value].title+' · '+text(stem==='score'?['Score','配乐']:['Effects','拟音']));
  for(const button of all('[data-stem]')) button.setAttribute('aria-pressed',String(button.dataset.stem===stem));
}
function loadStem() {
  const playing=!audio.paused;audio.pause();audio.src=release+soundFilm.value+'-'+stem+'.m4a';soundCopy();
  if(playing) audio.play().catch(()=>{});
}
for(const b of all('[data-film]')) b.addEventListener('click',()=>{
  if(selected===b.dataset.film)return;selected=b.dataset.film;loadFilm();updateUrl();
});
for(const b of all('[data-stem]')) b.addEventListener('click',()=>{
  if(stem===b.dataset.stem)return;stem=b.dataset.stem;loadStem();
});
soundFilm.addEventListener('change',loadStem);
movie.addEventListener('play',()=>audio.pause());
audio.addEventListener('play',()=>movie.pause());

const journey=$('.journey'), pinned=$('.pinned'), press=$('.press');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const phaseNames=[['The finished sheet','成品印张'],['Blue impression','第一版 · 蓝墨'],['Yellow over blue','第二版 · 黄墨'],['Fluorescent pink','第三版 · 荧光粉'],['All three in register','三色套齐']];
const proofNames=['BLUE','BLUE','BLUE + YELLOW','BLUE + YELLOW + PINK','BLUE + YELLOW + PINK'];
const clamp=n=>Math.max(0,Math.min(1,n));
const ramp=(p,from,to)=>clamp((p-from)/(to-from));
const ease=n=>n*n*(3-2*n);
let queued=false,prevPhase=-1,start=0,travel=1;
let printPlate=null,lastImpression=-1;
async function preparePress() {
  if(reduced.matches)return;
  const canvas=$('.live-print'),density=new Image();
  density.crossOrigin='anonymous';
  density.src=art+'separations.webp';
  try {
    const [{makeRiso}]=await Promise.all([import('../starter/engine/riso.js'),density.decode()]);
    const print=makeRiso(canvas,canvas.width,canvas.height);
    // Feed the original density map to the film compositor. The two sweeps are
    // physical positions in the print, so reversing the wheel unwinds the run.
    printPlate=(yellow,pink)=>{
      const edge=n=>-70+(canvas.width+160)*n;
      const kick=n=>Math.sin(n*Math.PI*3)*Math.exp(-6*n)*7;
      print(density,{gate:[1,Number(yellow>0),Number(pink>0)],sweep:[1e5,edge(yellow),edge(pink)],
        off:[[0,0],[2.2+kick(yellow),-1.5],[-3-kick(pink),1.5]],rot:[0,.0004,-.0004],
        sheet:5,seed:16,period:5.25,grain:.70});
    };
    canvas.addEventListener('webglcontextlost',()=>{printPlate=null;canvas.hidden=true});
    drawPrint();canvas.hidden=false;
  } catch { canvas.hidden=true; }
}
function drawPrint() {
  queued=false;
  const p=reduced.matches?0:clamp((scrollY-start)/travel);
  const lift=ease(ramp(p,0,.24)),yellow=ease(ramp(p,.29,.58)),pink=ease(ramp(p,.61,.9));
  const settle=ease(ramp(p,.90,1));
  if(printPlate && p!==lastImpression) { printPlate(yellow,pink);lastImpression=p; }
  press.style.setProperty('--liftX',(-13*lift)+'%');press.style.setProperty('--liftY',(-55*lift)+'%');
  press.style.setProperty('--roll',(-3-11*lift)+'deg');press.style.setProperty('--topOpacity',1-ease(ramp(p,.065,.22)));
  press.style.setProperty('--unprintedY',(100-100*yellow)+'%');press.style.setProperty('--unprintedP',(100-100*pink)+'%');
  press.style.setProperty('--tilt',(-1.1*yellow+.7*pink-1.5*settle)+'deg');
  journey.style.setProperty('--feed',Math.max(.9,p*100)+'%');
  const phase=p<.12?0:p<.30?1:p<.61?2:p<.91?3:4;
  if(phase!==prevPhase) {
    $('.phase').textContent=text(phaseNames[phase]);
    $('.proof-label').textContent=proofNames[phase];
    prevPhase=phase;
  }
}
function requestPaint(){if(!queued){queued=true;requestAnimationFrame(drawPrint)}}
function measure(){start=journey.getBoundingClientRect().top+scrollY;travel=Math.max(1,journey.offsetHeight-pinned.offsetHeight);requestPaint()}
window.addEventListener('scroll',requestPaint,{passive:true});
window.addEventListener('resize',measure);
reduced.addEventListener('change',measure);
new ResizeObserver(measure).observe(journey);
const labels=all('[data-zh]').map(el=>[el,el.textContent,el.dataset.zh]);
function localize() {
  document.documentElement.lang=lang;
  document.title=text(['Midway Press · Risograph Print','游艺印社 · 孔版套色印刷'])+' | Codex Film Studio';
  for(const [el,en,zh] of labels)el.textContent=text([en,zh]);
  $('.base').alt=text(['The rider, horse and Ferris wheel printed in blue ink',$('.base').dataset.altZh]);
  const other=lang==='en'?'zh':'en',link=$('.language'),dest=new URL(location.href);
  dest.searchParams.set('lang',other);link.href=dest;link.lang=other;link.textContent=other==='zh'?'中文':'EN';
  for(const a of all('.library'))a.href='../../../?lang='+lang+'#library';
  $('.press').setAttribute('aria-label',text(['Interactive carousel print','互动木马版画']));
  $('.programme').setAttribute('aria-label',text(['Choose a film','选择影片']));
  soundCopy();program();prevPhase=-1;measure();
}
$('.language').addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();lang=lang==='en'?'zh':'en';updateUrl();localize();
});
loadFilm();loadStem();localize();preparePress();
