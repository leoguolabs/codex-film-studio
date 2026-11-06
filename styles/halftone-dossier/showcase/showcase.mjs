const key='film-studio-language';
const language=()=>document.documentElement.lang.startsWith('zh')?'zh':'en';
function stored(){try{return localStorage.getItem(key)}catch{return null}}
function setLanguage(lang){
 const zh=lang==='zh';document.documentElement.lang=zh?'zh-CN':'en';
 document.querySelectorAll('[data-en]').forEach(n=>{n.textContent=zh?n.dataset.zh:n.dataset.en});
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
 document.querySelectorAll('[data-home]').forEach(a=>{const url=new URL(a.getAttribute('href'),location.href);url.searchParams.set('lang',lang);a.href=url.href});
 const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
 try{localStorage.setItem(key,lang)}catch{}
 renderChapters();renderFilm();
}
let chapters=[],film=null;const player=document.querySelector('video');
function renderChapters(){
 const nav=document.querySelector('[data-chapters]');nav.replaceChildren();
 chapters.forEach(c=>{const b=document.createElement('button');b.type='button';const time=document.createElement('b');time.textContent=`${Math.floor(c.time/60)}:${String(c.time%60).padStart(2,'0')}`;const label=document.createElement('span');label.textContent=c.label[language()]??c.label.en;b.append(time,label);b.addEventListener('click',()=>{player.currentTime=c.time;player.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});nav.append(b)});
}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
const requested=new URLSearchParams(location.search).get('lang');setLanguage(['en','zh'].includes(requested)?requested:stored()==='zh'?'zh':'en');
const density=document.querySelector('#density');density.addEventListener('input',()=>document.querySelector('.print-lab').style.setProperty('--dot',`${density.value}px`));
function renderFilm(){
 document.querySelectorAll('[data-film-en]').forEach(n=>n.textContent=language()==='zh'?n.dataset.filmZh:n.dataset.filmEn);
 if(film){document.querySelector('[data-film-title]').textContent=film.title[language()]??film.title.en;document.querySelector('[data-film-meta]').textContent=`3:00 · ${film.width} × ${film.height} · ${film.fps} FPS`;}
}
const filmStatus=document.querySelector('[data-film-status]');
player.addEventListener('error',()=>{filmStatus.hidden=false;filmStatus.textContent=language()==='zh'?'影片未能加载，请重试或打开下方 MP4。':'The film could not load. Retry or open the MP4 below.'});
player.addEventListener('playing',()=>{filmStatus.hidden=true});
document.querySelector('[data-film-play]').addEventListener('click',async()=>{if(player.error)player.load();try{await player.play()}catch{filmStatus.hidden=false;filmStatus.textContent=language()==='zh'?'请重试播放或打开 MP4。':'Retry playback or open the MP4.'}});
const stamp=document.querySelector('.lab-stamp');document.querySelector('#stamp').addEventListener('click',()=>{stamp.classList.remove('slam');void stamp.offsetWidth;stamp.classList.add('visible','slam')});
try{
 const url=new URL('media/films.json',location.href);const response=await fetch(url);if(!response.ok)throw new Error(response.status);const data=await response.json();film=data.films?.[0];
 if(!film || film.file!=='https://github.com/leoguolabs/codex-film-studio/releases/download/halftone-dossier-preview-v1/coffee-case-en.mp4')throw new Error('Unexpected film source');
 chapters=film.chapters??[];renderChapters();renderFilm();document.querySelector('[data-film-screening]').dataset.ready='true';
 const transcript=await fetch(new URL('media/transcript.json',location.href));if(!transcript.ok)throw new Error(transcript.status);const rows=await transcript.json();const box=document.querySelector('[data-transcript]');rows.forEach(s=>{const p=document.createElement('p');p.textContent=s.text;box.append(p)});
}catch(e){document.querySelector('[data-chapters]').hidden=true;document.querySelector('.transcript').hidden=true;console.error('Optional film details unavailable',e)}
