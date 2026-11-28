// Author in the 1848 by 912 plate. Only the compositor sees the surrounding paper.
import * as wood from './index.js';
import {clamp,seg,ss} from './math.js';
import {curl,peelState} from './curl.js';
export {wood,clamp,seg,ss};
const W=1920,H=1080,PW=1848,PH=912;
const [mask,m]=wood.canvas(),[colour,c]=wood.canvas();
const [front,frontG]=wood.canvas(),[back,backG]=wood.canvas();
const printer=wood.makePrinter();
const cache=new Map();
export function keep(key,make){
  if(!cache.has(key))cache.set(key,make());
  return cache.get(key);
}
export function cuts(g,key,path,opts={},time=1e9){
  const strokes=keep(key,()=>wood.cutAlong(path,opts));
  wood.drawStrokes(g,strokes,{t:time,color:opts.color||'#fff'});
}
export function relief(g,key,points,opts={},time=1e9){
  keep(key,()=>wood.shape([points],{halo:5,light:wood.light(-.65,-.65,.22),sp:8,seg:[80,290],...opts})).draw(g,time);
}
export function group(g,x,y,angle,scale,draw){
  g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale);draw(g);g.restore();
}
export function letter(g,text,x,y,size,opts={}){
  g.save();g.translate(x,y);g.scale(opts.mirror?-1:1,1);g.font=size+'px '+(opts.sc===false?'Fell':'FellSC');
  g.textAlign=opts.align||'center';g.textBaseline='middle';g.fillStyle=opts.color||'#fff';g.fillText(text,0,0);g.restore();
}
export function printFrame(g,plan,draw,cue,t){
  const {mode='print', zoom=1,x=PW/2,y=PH/2,seed=13,inkSeed=seed,mirror=false,jolt=0,plate='#c8502a',peel,wetX=-1}=plan;
  const full=mode==='block';
  m.fillStyle='#fff';m.fillRect(0,0,W,H);c.clearRect(0,0,W,H);
  for(const ctx of [m,c]){
    ctx.save();if(!full){ctx.beginPath();ctx.rect(36,36,PW,PH);ctx.clip();}
    ctx.translate(W/2+(jolt===1?5:jolt===2?-2:0),full?H/2:492);
    ctx.scale(mirror?-zoom:zoom,zoom);ctx.translate(-x,-y);
  }
  m.fillStyle='#000';m.fillRect(-10000,-10000,20000,20000);
  draw(m,c);
  m.restore();c.restore();
  if(!full&&cue){
    const a=Math.min(seg(t,cue.start,cue.start+.10),1-seg(t,cue.end-.15,cue.end));
    const lines=cue.caption||[cue.text];
    for(let i=0;i<lines.length;i++)letter(m,lines[i],960,1016+(i-(lines.length-1)/2)*47,44,{sc:false,color:'rgba(0,0,0,'+a+')'});
  }
  const image=printer.render(mask,colour,{mode,seed,inkSeed,plate,wetX,reg:[3,2]});
  g.drawImage(image,0,0);
  if(peel!==undefined&&peel<1){
    // Incoming impression stays flat. The sheet above it carries mirrored ink on the reverse.
    frontG.fillStyle='#e8dfc9';frontG.fillRect(0,0,W,H);
    frontG.save();frontG.globalAlpha=.14+.33*(1-clamp(peel));frontG.translate(W,0);frontG.scale(-1,1);
    frontG.drawImage(image,0,0);frontG.restore();
    backG.drawImage(image,0,0);
    const {xf,r}=peelState(peel,116);curl(g,front,back,xf,r);
  }
}
