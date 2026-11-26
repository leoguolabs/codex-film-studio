import {mountRecord} from './record.mjs';

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
    name:['San Francisco','旧金山'], synopsis:['Cable tracks lead down Market Street. The fog lifts over the Golden Gate, then the city gives way to a page of Bret Harte.','缆车轨道沿市场街向前延伸。雾从金门大桥上散开，镜头最后落在布雷特·哈特的一页诗上。'],
    cuts:[[7.5,'The cable-car crest','缆车越过山脊'],[20,'Market Street, twice','两个年代的市场街'],[40.3,'The poem page','诗集书页']],
    archive:['Market Street, 1906 / the street today','1906 年的市场街 / 今日街景'],
    note:['The Miles Brothers filmed Market Street from a moving cable car in 1906. Beside it, a modern camera looks down the same street. Watch how the rails hold both pictures together.','1906 年，迈尔斯兄弟从行驶的缆车上拍下市场街。并排的现代镜头沿着同一条街望去。两幅画面里的轨道，把相隔百年的视线引向远处。'],
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
const stageNames=[['Three cities on a record','唱片上的三座城'],['Two windows · counterpoint','两扇窗 · 对位'],['Four windows · four beats','四扇窗 · 四拍'],['Nine windows · cross rhythms','九扇窗 · 交错节奏'],['Sixteen windows · full ensemble','十六扇窗 · 合奏']];
let stage=0, entries=[], active=Object.hasOwn(films,params.get('film'))?params.get('film'):'chongqing';
const player=select('picture'),score=select('score'),coda=select('coda');
const media=[player,score,coda];
const clock=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
function labelStage(n){stage=n;select('stage-caption').textContent=translate(stageNames[n])}
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
      // Assign the pending seek before play so a fresh film opens on the selected frame.
      player.currentTime=time;player.play().catch(()=>{});player.focus({preventScroll:true});
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
  select('pressing').parentElement.setAttribute('aria-label',translate(['A photographic record of three cities unfolds into sixteen windows','三座城市的摄影唱片随滚动展开成十六格分屏']));
  labelStage(stage);drawFilm();
}
select('language').addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();language=language==='zh'?'en':'zh';setURL();setLanguage()});
document.querySelectorAll('[data-film]').forEach(b=>b.addEventListener('click',()=>{if(active===b.dataset.film)return;active=b.dataset.film;setURL();setLanguage();drawFilm(true)}));
media.forEach(el=>el.addEventListener('play',()=>media.filter(other=>other!==el).forEach(other=>other.pause())));
setLanguage();
mountRecord(select('overture'),labelStage).catch(()=>{select('follow').hidden=true;select('overture').classList.add('still')});
try {
  const response=await fetch('media/films.json');if(!response.ok)throw Error(response.status);
  ({films:entries}=await response.json());drawFilm(true);
} catch {
  const state=select('load-state');state.hidden=false;state.textContent=translate(['The programme could not load. Reload to choose another city.','片单加载失败，刷新后可重新选片。']);
}
