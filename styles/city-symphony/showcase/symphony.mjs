import {mountProjection} from './projection.mjs';

const select = id => document.getElementById(id);
const plateRoot = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) ? 'plates/' : 'https://raw.githubusercontent.com/leoguolabs/codex-film-studio/479d3c92382f27f9e1fdeb1cab412a5e31c1b3e9/styles/city-symphony/showcase/plates/';
const plate = (city, suffix = '') => plateRoot + city + suffix + '.webp';
document.querySelectorAll('[data-film] img').forEach(img => { img.src = plate(img.closest('button').dataset.film); });
const params = new URLSearchParams(location.search);
let language = params.get('lang') === 'zh' || (!params.has('lang') && navigator.language.startsWith('zh')) ? 'zh' : 'en';
const titles = [...document.querySelectorAll('[data-zh]')].map(node => [node,node.textContent]);
const translate = pair => pair[language==='zh'?1:0];
const films = {
  'chongqing':{
    name:['Chongqing','重庆'], synopsis:['At Liziba, a train disappears into a block of flats. Down by the Jialing, another street begins several floors below.','在李子坝，列车钻进一栋居民楼。走到嘉陵江边抬头看，刚才那条街已经高出好几层。'],
    cuts:[[7.5,'Train into the building','列车穿楼'],[15,'Windows multiply','街景分屏'],[37.3,'The river map','旧地图']],
    archive:['Chaotianmen, 1941 / Chongqing stairways today','1941 年的朝天门码头 / 今天的重庆街梯'],
    note:['On the left, workers climb the stone steps at Chaotianmen in 1941. On the right, pedestrians climb a present-day city stairway. The slope carries the eye from one image to the other.','左边，1941 年的工人走上朝天门码头的石阶。右边，今天的行人正爬一段街梯。两个年代的人沿着相近的坡度往上走。'],
    sound:['Listen across the cut from the lit riverbank to a map. The pulse carries through the darkness, then makes room for one voice.','从灯火通明的江岸听到旧地图展开。黑场中节拍还在，直到人声将要响起，乐声才轻轻退后。'],
    lineCredit:['Original closing line, spoken in English','原创片尾独白 · 英语朗读']
  },
  'san-francisco':{
    name:['San Francisco','旧金山'], synopsis:['A cable car crests a hill. A ride filmed in 1906 flickers beside a modern one, before the film turns to the Golden Gate and a page of Bret Harte.','缆车翻过山脊。1906 年的乘车影像在今天的车窗旁闪动，接着镜头转向金门大桥，最后落在布雷特·哈特的一页诗上。'],
    cuts:[[7.5,'The cable-car crest','缆车越过山脊'],[20,'Two cable-car rides','两个年代的缆车'],[40.3,'The poem page','诗集书页']],
    archive:['Market Street, 1906 / a modern cable-car ride','1906 年的市场街 / 今日缆车沿途'],
    note:['The Miles Brothers filmed Market Street from a moving cable car in 1906. Beside it, a modern camera looks ahead from a San Francisco cable car. Watch how the rails hold both pictures together.','1906 年，迈尔斯兄弟从行驶的缆车上拍下市场街。并排的现代镜头从旧金山的一辆缆车向前望去。两幅画面里的轨道，把相隔百年的视线引向远处。'],
    sound:['Listen from the bridge lights into the printed poem. The same music sinks beneath the first syllable and returns after the reading.','从桥灯一直听到诗页。还是刚才那段音乐，它在第一个音节前慢慢压低，读完才重新浮起。'],
    lineCredit:['Bret Harte, “San Francisco, From the Sea” · 1871 edition','布雷特·哈特《从海上看旧金山》· 1871 年版']
  },
  'new-york':{
    name:['New York Harbor','纽约港'],synopsis:['The orange Staten Island Ferry casts off from Whitehall. A gull hangs over the wake while a harbor chart holds the whole crossing on one page.','橙色的斯塔滕岛渡轮从白厅码头离岸。一只海鸥悬在船尾水面上，接下来的一张老海图，把整段航程收进了一页。'],
    cuts:[[10,'Wake at the stern','船尾的浪'],[19.5,'The harbor in 1903','1903 年的港湾'],[32.3,'The harbor chart','港湾海图']],
    archive:['New York waterfront, 1903 / the harbor today','1903 年的纽约水岸 / 今天的港湾'],
    note:['A waterfront view filmed for Edison in 1903 shares the frame with the modern harbor. The film later opens an 1845 Coast Survey chart. Boats that moved across the screen become routes the eye can follow on paper.','一段 1903 年为爱迪生公司拍摄的水岸影像与今天的纽约港并置。片末展开 1845 年的海岸测量图，刚才船只驶过的水面，变成了能用手指循着走的航线。'],
    sound:['Follow the ferry music onto the harbor chart. A few beats later the voice gives the crossing its everyday measure: twenty-five minutes.','渡轮的节拍延续到海图。过了几拍，旁白用乘客熟悉的时间说出这段航程：二十五分钟。'],
    lineCredit:['Original closing line, spoken in English','原创片尾独白 · 英语朗读']
  }
};
const phrases = {
  chongqing: {
    opening:['Lights on at Hongya Cave','洪崖洞亮灯'], street:['A train enters Liziba','列车驶入李子坝'],
    brake:['A boat on the river','一叶船横过江面'], archive:['Chaotianmen, 1941 / today','朝天门，1941 / 今日街梯'],
    page:['A map of the rivers','展开旧地图']
  },
  'san-francisco': {
    opening:['Golden Gate at dusk','暮色中的金门大桥'], street:['Over the crest by cable car','缆车翻过山脊'],
    brake:['A ride between the rails','沿着缆车轨道前行'], archive:['Market Street, 1906 / a modern ride','市场街，1906 / 今日缆车'],
    page:['A page of Bret Harte','布雷特·哈特的诗页']
  },
  'new-york': {
    opening:['The Staten Island Ferry','斯塔滕岛渡轮'], street:['Ferry at the slip','渡轮离岸'],
    brake:['A gull crosses the harbor','海鸥掠过港湾'], archive:['New York Harbor, 1903 / today','纽约港，1903 / 今日'],
    page:['The 1845 harbor chart','1845 年的港湾海图']
  }
};
const sharedCues = {
  two:['Two windows','两格对位'], four:['Four windows','四格齐奏'],
  nine:['Nine windows','九格交错'], sixteen:['Sixteen windows','十六格合奏'],
  black:['Cut to black','切入黑场']
};
let entries = [];
let active = Object.hasOwn(films,params.get('film')) ? params.get('film') : 'chongqing';
let phase = 'opening', sourceFrame = null, projection;
const player=select('picture'),score=select('score'),coda=select('coda');
const media=[player,score,coda];
const clock=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
function labelCue(name, frame) {
  phase = name; sourceFrame = frame;
  select('stage-caption').textContent=translate(sharedCues[name] || phrases[active][name]);
  select('cut-time').textContent = frame===null ? '' :
    [Math.floor(frame/1800), Math.floor(frame/30)%60, frame%30].map(n=>String(n).padStart(2,'0')).join(':');
  select('cut-time').title=translate(['Minutes, seconds, frames at 30 fps','分、秒、帧，每秒三十帧']);
  select('match-cut').hidden=frame===null;
}
function playFrom(seconds) {
  player.currentTime=seconds;
  player.play().catch(()=>{});
  player.focus({preventScroll:true});
}
function setURL() {
  const url=new URL(location.href);url.searchParams.set('lang',language);url.searchParams.set('film',active);
  history.replaceState(null,'',url);
}
function drawFilm(changeMedia=false) {
  const item=entries.find(row=>row.id===active);
  if(!item)return;
  const text=films[active];
  select('film-title').textContent=item.title;select('synopsis').textContent=translate(text.synopsis);
  select('archive-plate').src=plate(active,'-archive');select('archive-plate').alt=translate(text.archive);
  select('archive-caption').textContent=translate(text.archive);select('archive-note').textContent=translate(text.note);
  select('line').textContent='“'+item.line+'”';select('line').lang='en';select('line-source').textContent=translate(text.lineCredit);
  select('sound-note').textContent=translate(text.sound);select('score-title').textContent=item.scoreTitle;
  select('coda-window').textContent=translate(['Film mix','成片混音'])+' · '+clock(item.codaStart)+' – '+clock(item.codaStart+item.codaLength);
  select('credits').href='credits.html?lang='+language+'#'+active;
  player.setAttribute('aria-label',item.title);score.setAttribute('aria-label',item.scoreTitle);coda.setAttribute('aria-label',translate(['Closing transition','片尾转场'])+' · '+item.title);
  document.querySelectorAll('[data-film]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.film===active)));
  select('chapter-list').replaceChildren(...text.cuts.map(([time,en,zh])=>{
    const b=document.createElement('button');b.type='button';b.className='chapter';
    const when=document.createElement('span');when.textContent=clock(time);b.append(when,translate([en,zh]));
    b.addEventListener('click',()=>{
      playFrom(time);
    });return b;
  }));
  if(changeMedia) {
    media.forEach(el=>el.pause());
    player.querySelector('source')?.remove();
    const hadCaptions=Array.from(player.textTracks).some(track=>track.mode==='showing');
    const track=document.createElement('track');track.kind='captions';track.srclang='en';track.label='English';track.src=item.captions;track.default=hadCaptions;
    player.replaceChildren(track);player.poster=plate(active);player.src=item.src;player.load();
    score.src=item.score;coda.src=item.coda;
  }
}
function setLanguage() {
  document.documentElement.lang=language;document.title=translate(['City Symphony — Three City Films','城市交响曲 · 三城放映'])+' · Codex Film Studio';
  titles.forEach(([el,en])=>el.textContent=language==='zh'?el.dataset.zh:en);
  const other=language==='zh'?'en':'zh', langLink=select('language'),url=new URL(location.href);
  url.searchParams.set('lang',other);url.searchParams.set('film',active);langLink.href=url;langLink.textContent=other==='en'?'EN':'中文';langLink.lang=other;langLink.hreflang=other;
  document.querySelectorAll('a.brand').forEach(el=>el.href='../../../?lang='+language);
  document.querySelectorAll('a.library').forEach(el=>el.href='../../../?lang='+language+'#library');
  select('projection-frame').parentElement.setAttribute('aria-label',translate(['Use the scroll wheel to run real film frames forward and backward','用滚轮正放或倒放成片的真实画格']));
  document.querySelector('.city-selector').setAttribute('aria-label',translate(['Choose a city for the prologue','选择序幕中的城市']));
  document.querySelectorAll('[data-prologue]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.prologue===active)));
  labelCue(phase,sourceFrame);drawFilm();
}
select('language').addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();language=language==='zh'?'en':'zh';setURL();setLanguage()});
function chooseCity(id) {
  if (id===active) return;
  active=id;
  phase='opening'; sourceFrame=null;
  setURL(); setLanguage(); drawFilm(true);
  projection.selectCity(id);
}
document.querySelectorAll('[data-film],[data-prologue]').forEach(b=>{
  b.addEventListener('click',()=>chooseCity(b.dataset.film || b.dataset.prologue));
});
let pressedFrame=null;
select('match-cut').addEventListener('pointerdown',()=>{pressedFrame=sourceFrame});
select('match-cut').addEventListener('pointercancel',()=>{pressedFrame=null});
select('match-cut').addEventListener('click', event=>{
  if(sourceFrame===null || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  const time=(event.detail && pressedFrame!==null ? pressedFrame : sourceFrame)/30;
  pressedFrame=null;
  projection.stopGuide();
  playFrom(time);
});
media.forEach(el=>el.addEventListener('play',()=>media.filter(other=>other!==el).forEach(other=>other.pause())));
setLanguage();
projection=mountProjection({section:select('overture'),city:active,posterURL:plate,onCue:labelCue});
try {
  const response=await fetch('media/films.json');if(!response.ok)throw Error(response.status);
  ({films:entries}=await response.json());drawFilm(true);
} catch {
  const state=select('load-state');state.hidden=false;state.textContent=translate(['The programme could not load. Reload to choose another city.','片单加载失败，刷新后可重新选片。']);
}
