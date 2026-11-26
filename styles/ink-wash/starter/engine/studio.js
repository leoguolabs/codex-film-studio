import {mk,draw,blot} from './ink.js';
import {clamp,ss,mulberry} from './lib.js';
import {layerSet} from './comp.js';

export const W=1920,H=1080,FPS=24;
export const ease=(t,a,b)=>ss((t-a)/(b-a));
export function stroke(L,points,width,options={},progress=1,opacity=1){
  draw(L,mk(points,{w:width,tone:.88,dry:.32,wet:.55,prof:'tip',seed:1,...options}),progress,opacity);
}
export function pose(A,x,y,scale,rotate,paint){
  const pens=[A.cw,A.cd,A.cc];
  for(const pen of pens){pen.save();pen.translate(x,y);pen.scale(scale,scale);pen.rotate(rotate);}
  try{paint(A.ink);}finally{for(const pen of pens)pen.restore();}
}
export function imprint(A,plate,x=0,y=0,scale=1,alpha=1){
  for(const [ctx,canvas] of [[A.cw,plate.wet],[A.cd,plate.dry],[A.cc,plate.col]]){
    ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(canvas,x,y,canvas.width*scale,canvas.height*scale);ctx.restore();
  }
}
export function plate(paint,w=W,h=H){
  const layer=layerSet(w,h);paint(layer);return layer;
}
export function type(c,text,x,y,size,opts={}){
  c.save();c.translate(x,y);c.rotate(opts.angle||0);c.globalAlpha=clamp(opts.alpha??1);
  c.font=(opts.italic?'italic 500 ':'600 ')+size+'px '+(opts.italic?'Inscription':'Capitals');
  c.textAlign=opts.align||'left';c.fillStyle=opts.color||'#000';c.letterSpacing=(opts.tracking??1)+'px';
  c.fillText(text,0,0);c.restore();
}
export function inscription(A,lines,x,y,size,alpha){
  if(alpha<=0)return;
  const wet=(1-alpha)*.8;
  for(const [i,line] of lines.entries())for(const [ctx,opacity] of [[A.cw,wet],[A.cd,1-wet*.6]]){
    type(ctx,line,x+size*.62,y+i*size*1.22,size,{italic:true,alpha:alpha*opacity*.9});
  }
  const c=A.cc;c.save();c.globalAlpha=clamp(alpha*.91);c.fillStyle='#b02e22';c.fillRect(x,y-size*.52,size*.32,size*.32);c.restore();
}
// The seal is drawn on its own sheet so that carving cannot erase underlying pigment.
export function seal(c,x,y,size,carving,alpha=1){
  const patch=document.createElement('canvas');patch.width=patch.height=100;
  const d=patch.getContext('2d'),r=mulberry(6703);
  d.fillStyle='#ad3026';d.beginPath();
  for(let i=0;i<36;i++){const side=Math.floor(i/9),u=(i%9)/9;
    const [px,py]=[[u,0],[1,u],[1-u,1],[0,1-u]][side];
    const X=2+px*95+r()*2,Y=2+py*95+r()*2;i?d.lineTo(X,Y):d.moveTo(X,Y);}
  d.closePath();d.fill();d.globalCompositeOperation='destination-out';d.lineWidth=5;d.lineJoin='round';d.lineCap='round';
  for(const path of carving){d.beginPath();path.forEach(([a,b],i)=>i?d.lineTo(100*a,100*b):d.moveTo(100*a,100*b));d.stroke();}
  for(let i=0;i<95;i++){d.globalAlpha=.3+r()*.6;d.fillRect(r()*100,r()*100,.3+r()*1.7,.3+r()*2);}
  c.save();c.globalAlpha=clamp(alpha);c.drawImage(patch,x,y,size,size);c.restore();
}
// Silk and roller geometry follows the paper's current screen rectangle throughout the pull-back.
export function mount(A,x,y,w,h,border,alpha=1){
  const c=A.cc;c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=clamp(alpha);
  c.fillStyle='#2f2b27';c.beginPath();c.rect(0,0,W,H);c.rect(x-border,y-border,w+2*border,h+2*border);c.fill('evenodd');
  c.fillStyle='#cdc3aa';c.beginPath();c.rect(x-border,y-border,w+2*border,h+2*border);c.rect(x,y,w,h);c.fill('evenodd');
  c.fillStyle='#594635';
  for(const xx of [x-border*2,x+w+border])c.fillRect(xx,y-border-9,border,h+2*border+18);
  c.strokeStyle='rgba(62,48,38,.45)';c.lineWidth=1.4;c.strokeRect(x-1,y-1,w+2,h+2);c.restore();
}
export function materialProof(A){
  const L=A.ink;
  for(let i=0;i<5;i++)stroke(L,[[410+i*215,370],[475+i*215,490],[432+i*215,680]],88,{tone:.18+i*.19,dry:.07+i*.14,wet:.8,seed:13+i});
  blot(A.cw,1470,550,29,.68,0,.9,7);
}
