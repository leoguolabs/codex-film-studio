import * as THREE from 'three';
import {Pipe} from './post.js';
import {dispose} from './stage.js';
import {ss,clamp} from './lib.js';
import {box,plate,camera,disc,hole} from './box.js';
import {shots} from '../src/film.js';
const query=new URLSearchParams(location.search);
const film=await (await fetch('./timeline.json')).json();
const proof=query.has('proof'), W=+(query.get('w')||1920), H=W*9/16;
await document.fonts.load('600 42px CutSerif');
const screen=document.querySelector('#view');screen.width=W;screen.height=H;
const ctx=screen.getContext('2d',{alpha:false});
const r=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
const scale=+(query.get('ssaa')||1);
r.setPixelRatio(scale);r.setSize(W,H,false);r.shadowMap.enabled=true;r.shadowMap.type=THREE.VSMShadowMap;r.outputColorSpace=THREE.LinearSRGBColorSpace;
const pipe=new Pipe(r,W,H,scale);
function sample(){const S=box();for(let i=0;i<4;i++)plate(S,{w:340,h:120,y:-35+i*5,z:-110+i*16,ink:['#7286bd','#53668f','#303d6c','#182348'][i],draw(c){c.fillRect(-170,-60,340,95-i*10);hole(c,()=>disc(c,i*7,0,15+i*3));}});return {S,update(t){camera(S,t,{d:360});}};}
const plan=proof?[{start:0,make:sample}]:shots;
const cache=new Map();
function draw(i,t,target){let a=cache.get(i);if(!a){a=plan[i].make();cache.set(i,a);}const local=t-plan[i].start;const g=a.update(local,t)||{};pipe.shot(a.S.scene,a.S.cam,{focus:a.S.focus,aper:10,maxCoc:10,bloom:{strength:.3,radius:.5,threshold:1.15},...g.post},target);return g;}
function captions(t){
  const cue=(film.voice||[]).find(v=>t>=v.at&&t<v.end);if(!cue)return;
  const lines=(cue.caption||cue.text).split('|');ctx.save();ctx.scale(W/1920,H/1080);
  ctx.globalAlpha=Math.min(ss((t-cue.at)/.16),ss((cue.end-t)/.2));ctx.font='600 42px CutSerif';ctx.textAlign='center';ctx.textBaseline='middle';
  const extent=Math.max(...lines.map(l=>ctx.measureText(l).width));const y=982-(lines.length-1)*45;
  ctx.shadowColor='rgba(5,8,25,.58)';ctx.shadowBlur=22;ctx.fillStyle='rgba(5,8,26,.40)';ctx.beginPath();ctx.roundRect(960-extent/2-29,y-25,extent+58,lines.length*46+5,12);ctx.fill();
  ctx.fillStyle='#f4e8ce';ctx.shadowBlur=3;ctx.shadowColor='#07081a';lines.forEach((l,i)=>ctx.fillText(l,960,y+i*46));ctx.restore();
}
window.renderTime=t=>{
  const i=Math.max(0,plan.findLastIndex(s=>t>=s.start));let g,mixB=0;
  const overlap=i?(plan[i].dissolve??.6):0, elapsed=t-plan[i].start;
  const blend=i>0&&elapsed<overlap;
  if(blend){draw(i-1,t,pipe.rtA);g=draw(i,t,pipe.rtB);mixB=ss(elapsed/overlap);}else g=draw(i,t,pipe.rtA);
  for(const [j,a] of cache)if(j!==i&&(!blend||j!==i-1)){dispose(a.S.scene);cache.delete(j);}
  pipe.final({...g.grade,mixB,fade:(g.grade?.fade??1)*(proof?1:ss(clamp(t/.45)))});
  ctx.drawImage(r.domElement,0,0,W,H);if(!proof)captions(t);
};
window.READY=true;
