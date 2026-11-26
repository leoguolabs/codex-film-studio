import {mk,draw,blot} from './ink.js';
import {clamp,mulberry} from './lib.js';

// Points carry brush pressure. The same seed fixes every hair in the bundle.
export function loadBrush(points,width,seed) {
  const rand=mulberry(seed);
  const bands=[];
  const side=(path,offset,taper=1)=>path.map(([x,y,p=1],i)=>{
    const before=path[Math.max(0,i-1)],after=path[Math.min(i+1,path.length-1)];
    const dx=after[0]-before[0],dy=after[1]-before[1],l=Math.hypot(dx,dy)||1;
    return [x-dy/l*offset*p,y+dx/l*offset*p,p*taper];
  });
  function add(path,w,options){bands.push(mk(path,{w,ds:3.5,prof:'brush',seed:seed+bands.length,...options}));}
  add(points,width,{tone:.78,wet:.94,dry:.69,body:.60,brWet:true,side:.94,rough:.20,nb:35});
  add(side(points,-width*.25),width*.42,{tone:.97,wet:.78,dry:.57,side:.9,body:.83,nb:22,rough:.21});
  for(let i=0;i<11;i++){
    const strip=side(points,(rand()-.43)*width*1.30);
    // Individual hairs separate toward the lift; some end before the last knot.
    const reach=.45+rand()*.54;
    for(let j=1;j<strip.length;j++){const u=j/(strip.length-1);strip[j][1]+=Math.sin(Math.PI*u)*Math.pow(u,1.2)*(rand()-.45)*width*.21;strip[j][2]*=1-(1-reach)*u;}
    add(strip,width*(.012+rand()*.071),{tone:.49+rand()*.47,wet:.30,dry:.48+rand()*.32,body:.26,side:.6,nb:4,rough:.13});
  }
  return (ink,progress,alpha=1)=>{if(progress<=0||alpha<=0)return;for(const s of bands)draw(ink,s,clamp(progress),clamp(alpha));};
}

// Droplets are fixed by seed and born progressively along the advancing stroke.
export function splinters(count,seed,particle){
  const random=mulberry(seed);
  const drops=Array.from({length:count},(_,i)=>particle(random,i));
  return (wet,age,opacity=1)=>{
    for(const [i,d] of drops.entries()){
      const t=age-d.born;if(t<=0)continue;
      const travel=Math.min(t,d.flight),v=travel*(1-.26*travel);
      const alpha=opacity*d.alpha*clamp(1-(t-d.flight)/d.fade);
      if(alpha>.004)blot(wet,d.x+d.vx*v,d.y+d.vy*travel+d.gravity*travel*travel,d.size,alpha,Math.atan2(d.vy+2*d.gravity*travel,d.vx),d.aspect||1.3,seed+i);
    }
  };
}
