import {Impasto} from '../engine/impasto.js';
import {Ref, paintRef} from '../engine/plate.js';

export const poly = points => c => {
  c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  c.closePath();
};
export const rect = (x,y,w,h) => c => c.rect(x,y,w,h);
export const oval = (x,y,rx,ry,angle=0) => c => c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);
export const path = fn => fn;
export const grad = (x,y,X,Y,stops) => c => {
  const g = c.createLinearGradient(x,y,X,Y);
  for(const [pos,color] of stops) g.addColorStop(pos,color);
  return g;
};
export const ease = u => { u=Math.max(0,Math.min(1,u)); return u*u*(3-2*u); };
export const mix = (a,b,u) => a+(b-a)*u;
export const hash = seed => { const n=Math.sin(seed*127.1+311.7)*43758.5453; return n-Math.floor(n); };
export const transform = (x,y,scale=1,angle=0,anchorX=0,anchorY=0,scaleY=scale) => {
  const c=Math.cos(angle),s=Math.sin(angle);
  return [c*scale,s*scale,-s*scaleY,c*scaleY,x-c*scale*anchorX+s*scaleY*anchorY,y-s*scale*anchorX-c*scaleY*anchorY];
};
export class Stage {
  constructor(canvas) { this.engine=new Impasto(canvas,{W:1280,H:720,ss:2}); }
  plate(w,h,draw,options={}) {
    const ref=new Ref(w,h,options.scale??1);
    draw(ref);
    const strokes=paintRef(ref,{R:[30,15,7,3.5,1.8],T:15,...options});
    return {batch:this.engine.batch(strokes.data()),texture:this.engine.texture(ref.ctx.canvas,.85),w,h};
  }
  begin() { this.light={}; this.engine.begin(); }
  paint(p,o={}) {
    const underAlpha=o.appear===undefined?1:ease((o.t-o.appear-(o.appDur??.35)*.6)/((o.appDur??.35)*.4));
    if(underAlpha>0) this.engine.under(p.texture,p.w,p.h,{...o,alpha:(o.alpha??1)*underAlpha});
    this.engine.draw(p.batch,o);
  }
  marks(strokes,options={}) { this.engine.drawNow(strokes.data(),options); }
  finish() { this.engine.finish({spec:.24,shin:26,contrast:1.04,vig:.24,...this.light}); }
}
