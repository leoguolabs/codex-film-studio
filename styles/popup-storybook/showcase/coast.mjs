import {mountBook} from './book.mjs';

const $ = id => document.getElementById(id);
const language = new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en';
const zh = language === 'zh';
const say = (english,chinese) => zh ? chinese : english;
document.documentElement.lang = zh ? 'zh-CN' : 'en';
if (zh) {
  for (const node of document.querySelectorAll('[data-zh]')) node.textContent = node.dataset.zh;
  for (const node of document.querySelectorAll('[data-zh-aria]')) node.setAttribute('aria-label',node.dataset.zhAria);
  document.title = '纸上海岸 · 纸艺立体书 · Codex Film Studio';
}
for (const link of document.querySelectorAll('a.library')) link.href = '../../../?lang='+language+'#library';
for (const link of document.querySelectorAll('.lang a')) {
  const url = new URL(location.href);
  const target = link.hreflang;
  url.searchParams.set('lang',target);
  link.href = url;
  if (target === language) link.setAttribute('aria-current','true');
}

const films = {
  letter:{
    title:['The Last Blue Letter','最后一封蓝信'],
    slug:'the-last-blue-letter',
    summary:['On her ninth birthday, Nell takes a train and a ferry to deliver one last letter to her father at the lighthouse.','Nell 在九岁生日那天搭火车、换渡船，把最后一封信送到父亲守着的灯塔。'],
    chapters:[[4,'From town','离开小镇'],[17.4,'The coast train','海岸列车'],[24.1,'The crossing','乘船渡海'],[30.8,'The lighthouse','抵达灯塔']],
  },
  button:{
    title:['The Button Ferry','纽扣渡船'],
    slug:'the-button-ferry',
    summary:['To Pip the tailor, the puddle is a sleeve wide. To a stranded beetle, it is the sea. Pip fetches his biggest button.','在裁缝鼠 Pip 眼里，那摊水只有袖口那么宽。对困在对岸的甲虫来说，却是整片海。Pip 找出了他最大的那颗纽扣。'],
    chapters:[[4.85,'The tailor','裁缝铺'],[15.05,'The puddle','来到水边'],[25.9,'All aboard','甲虫登船'],[34,'Home for supper','回家吃饭']],
  },
};
const plates = [['Lighthouse Point','灯塔岬'],['The button crossing','纽扣渡口'],['The letter arrives','蓝信抵达']];
const stops = [...document.querySelectorAll('[data-stop]')];
const journey = $('book'), pin = journey.querySelector('.pin');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let paint, lastProgress = -1, pageNumber = -1, pending = false, previousTime = 0, shown;
function renderScroll(now = performance.now()) {
  pending = false;
  const runway = Math.max(1,journey.offsetHeight-pin.offsetHeight);
  const p = Math.max(0,Math.min(1,-journey.getBoundingClientRect().top/runway));
  const dt = Math.max(.001, Math.min(.05,(now-previousTime)/1000));
  previousTime=now;
  const onBook=scrollY < journey.offsetHeight;
  if (shown===undefined || reduce.matches || !onBook) shown=p;
  const distance=p-shown;
  const advance=Math.min(Math.abs(distance),.64*dt,Math.abs(distance)*(1-Math.exp(-dt*14)));
  shown=Math.abs(distance)<.0003?p:shown+Math.sign(distance)*advance;
  const chapter = Math.min(2,Math.floor(shown*2+.48));
  if (chapter !== pageNumber) {
    pageNumber = chapter;
    $('plate-name').textContent = say(...plates[chapter]);
    $('plate-no').textContent = ['I','II','III'][chapter];
    stops.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===chapter)));
  }
  pin.style.setProperty('--progress',.025+.975*shown);
  const position = reduce.matches ? chapter/2 : shown;
  if (paint && position !== lastProgress) {paint(position);lastProgress=position;}
  if (shown!==p) queueScroll();
}
function queueScroll(){if(!pending){pending=true;requestAnimationFrame(renderScroll);}}
for(const type of ['scroll','resize','pageshow'])window.addEventListener(type,queueScroll,{passive:true});
reduce.addEventListener('change',queueScroll);
renderScroll();
mountBook($('paper')).then(draw=>{
  paint=draw;renderScroll();journey.querySelector('.atlas').classList.add('ready');
}).catch(()=>{ /* The illustrated cover remains available if a browser cannot decode the cutouts. */ });
stops.forEach((button,i)=>button.addEventListener('click',()=>{
  const start=window.scrollY+journey.getBoundingClientRect().top;
  window.scrollTo({top:start+i*(journey.offsetHeight-pin.offsetHeight)/2,behavior:'instant'});
}));

const player=$('film'), audio=$('audio');
const release='https://github.com/leoguolabs/codex-film-studio/releases/download/paper-coast-storybook-v1/';
let chapterStart=null;
player.addEventListener('loadedmetadata',()=>{if(chapterStart!==null){player.currentTime=chapterStart;chapterStart=null;}});
let current, currentStem='score';
function refreshAudio() {
  const key=$('sound-film').value;
  audio.pause();audio.src=release+key+'-'+currentStem+'.m4a';
  audio.setAttribute('aria-label',say(...films[key].title)+' · '+(currentStem==='score'?say('Film score','配乐'):say('Paper Foley','纸张拟音')));
  for (const btn of document.querySelectorAll('[data-stem]'))btn.setAttribute('aria-pressed',String(currentStem===btn.dataset.stem));
}
function chooseFilm(key) {
  if (key===current) return;
  const info=films[key], first=!current;current=key;
  if(!first){
    player.pause();
    player.poster='media/'+key+'-poster.webp';
    chapterStart=null;player.querySelector('source').src=release+key+'-web.mp4';
    player.querySelector('track').src='media/'+key+'.vtt';
    player.load();
  }
  player.setAttribute('aria-label',say(...info.title));
  $('synopsis').textContent=say(...info.summary);
  $('master').href=release+info.slug+'.mp4';
  for(const btn of document.querySelectorAll('[data-film]'))btn.setAttribute('aria-pressed',String(key===btn.dataset.film));
  $('chapters').replaceChildren(...info.chapters.map(([time,en,cn])=>{
    const btn=document.createElement('button');btn.type='button';
    const stamp=document.createElement('span');stamp.textContent='0:'+String(Math.floor(time)).padStart(2,'0');
    btn.append(stamp,say(en,cn));btn.addEventListener('click',()=>{if(player.readyState>=1)player.currentTime=time;else chapterStart=time;player.play().catch(()=>{});});
    return btn;
  }));
  $('transcript').textContent='';
  fetch('media/'+key+'-transcript.txt').then(r=>{if(!r.ok)throw new Error();return r.text();})
    .then(contents=>{if(current===key)$('transcript').textContent=contents.trim();})
    .catch(()=>{if(current!==key)return;const a=document.createElement('a');a.href='media/'+key+'.vtt';a.textContent=say('English caption file','英文字幕文件');$('transcript').append(a);});
  $('sound-film').value=key;refreshAudio();
  for(const link of document.querySelectorAll('.lang a')){
    const url=new URL(link.href);url.searchParams.set('film',key);link.href=url;
  }
}
document.querySelectorAll('[data-film]').forEach(btn=>btn.addEventListener('click',()=>chooseFilm(btn.dataset.film)));
document.querySelectorAll('[data-stem]').forEach(btn=>btn.addEventListener('click',()=>{currentStem=btn.dataset.stem;refreshAudio();}));
$('sound-film').addEventListener('change',refreshAudio);
player.addEventListener('play',()=>audio.pause());audio.addEventListener('play',()=>player.pause());
chooseFilm(new URLSearchParams(location.search).get('film')==='button'?'button':'letter');
