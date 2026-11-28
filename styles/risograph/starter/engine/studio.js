import {W,H,g,plate,clear,text,rrect,over,line} from './draw.js';
import {makeRiso} from './riso.js';
import {film,drawScene,vignette} from '../film.js';

const paper=[0,0,0], blue=[1,0,0],pink=[0,0,1];
const clamp=x=>Math.max(0,Math.min(1,x));
const noise=n=>{const d=Math.sin(n*91.73+17.3)*43758.545;return d-Math.floor(d)};
const canvas=document.querySelector('#print');
const print=makeRiso(canvas,W,H);
await Promise.all(['800 150px Bricolage','500 42px Jost','600 34px Jost'].map(f=>document.fonts.load(f)));
const cues=await (await fetch('content/cues.json')).json();
function fitted(str,weight,size,family,limit,tracking){
  g.letterSpacing=tracking+'px';g.font=weight+' '+size+'px '+family;
  const width=g.measureText(str).width;
  g.letterSpacing='0px';
  return weight+' '+Math.floor(size*Math.min(1,limit/Math.max(1,width)))+'px '+family;
}
function title(t){
  const [start,stop]=film.titleWindow??[0,0];
  if(t<start||t>=stop)return;
  g.save();g.beginPath();g.rect(0,0,W*clamp((t-start)/.42),H);g.clip();
  text(film.title,960,210,fitted(film.title,800,184,'Bricolage',1690,5),blue,'center','alphabetic',5);
  text(film.subtitle,960,273,'500 40px Jost',blue,'center','alphabetic',7);g.restore();
}
function colophon(t){
  clear();
  for(const x of [82,1838])for(const y of [82,998]){
    line([[x-20,y],[x+20,y]],2,blue);line([[x,y-20],[x,y+20]],2,blue);
    g.beginPath();g.arc(x+3,y-2,8,0,2*Math.PI);g.stroke();
  }
  const split=4+10*clamp((t-film.end)/.6);
  const font=fitted(film.title,800,170,'Bricolage',1600,5);
  text(film.title,960+split,477+split*.4,font,pink,'center','alphabetic',5);
  over(()=>text(film.title,960-split,477-split*.4,font,[.83,0,0],'center','alphabetic',5));
  text('RISOGRAPH PRINT',960,590,'600 47px Jost',blue,'center','alphabetic',12);
  text(film.credit||'A three-colour short',960,670,'500 36px Jost',pink,'center','alphabetic',5);
  g.save();vignette(t-film.end);g.restore();
}
function subtitles(t){
  const c=cues.find(c=>t>=c.start&&t<c.end);if(!c)return;
  const lines=c.caption??[c.text];const f=fitted(lines.reduce((a,b)=>a.length>b.length?a:b),500,42,'Jost',1700,.5);
  g.font=f;g.letterSpacing='.5px';const w=Math.max(...lines.map(l=>g.measureText(l).width));g.letterSpacing='0px';
  const top=995-(lines.length-1)*51;
  rrect((W-w)/2-22,top-40,w+44,lines.length*51+8,6,paper);
  lines.forEach((s,i)=>text(s,W/2,top+5+i*51,f,blue,'center','alphabetic',.5));
}
window.drawFrame=frame=>{
  const t=frame/24;const pose=Math.floor(frame/2)/12;
  clear();
  if(film.end!=null&&t>=film.end)colophon(t);else{g.save();drawScene(t,pose);g.restore();g.setTransform(1,0,0,1,0,0);title(t);}
  subtitles(t);
  const shot=film.cuts.filter(c=>t>=c).length;
  const kick=film.kicks.reduce((sum,[at,px])=>{const s=t-at;return sum+(s>=0&&s<.52?px*Math.exp(-11*s)*Math.cos(34*s):0)},0);
  const drift=film.drift&&t>=film.drift[0]&&t<film.drift[1]?clamp((t-film.drift[0])/(film.drift[1]-film.drift[0])):0;
  const off=[[0,0],[3,-2],[-3,2.5]].map(([x,y],i)=>[x+(noise(shot*4+i)-.5)*2+(i-1)*kick+(i===1?10:i===2?-8:0)*drift,y+(noise(shot*8+i)-.5)*2+i*kick*.26]);
  print(plate,{grain:.55,sheet:shot*3.7,seed:Math.floor(frame/2),off,rot:[0,.00036,-.00044],
    gate:film.plates.map(at=>+(t>=at)),sweep:film.plates.map((at,i)=>{const u=clamp((t-at-(i===0?.02:0))/.55);return -60+(W+260)*(u<.5?2*u*u:1-2*(1-u)**2)})});
};
window.filmFrames=Math.round(film.duration*24);window.ready=true;
