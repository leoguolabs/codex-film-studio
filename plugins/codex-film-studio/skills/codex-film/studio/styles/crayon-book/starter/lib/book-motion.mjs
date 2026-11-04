// Author camera, leaf and contact times separately on the shared frame clock.
const unit=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=unit(x);return x*x*(3-2*x)};
export function bookMotion(frame,timing){
 const {start,revealEnd,turnStart,settle,pushStart,pushEnd}=timing;
 if(![frame,start,revealEnd,turnStart,settle,pushStart,pushEnd].every(Number.isFinite)
  ||!(start<revealEnd&&revealEnd<=turnStart&&turnStart<settle&&settle<=pushStart&&pushStart<pushEnd))
  throw new Error('Invalid book motion timing');
 const duration=pushEnd-start;
 return {progress:unit((frame-start)/duration),revealEnd:(revealEnd-start)/duration,
  pushStart:(pushStart-start)/duration,light:smooth((frame-start)/(revealEnd-start)),
  turn:smooth((frame-turnStart)/(settle-turnStart))};
}

// Two ruled-paper profiles: a rounded bow, or a straighter outer span with
// the bend near the hinge. Depth and transverse bend are separate controls.
// Project before choosing the visible face; material coordinates stay fixed.
export function leafStrips(turn,{x,y,width,height},{curl=1,segments=240,profile='rounded'}={}){
 if(!['rounded','hinge'].includes(profile))throw new Error('Invalid leaf profile');
 if(![turn,x,y,width,height,curl,segments].every(Number.isFinite)||width<=0||height<=0
  ||curl<0||curl>1.5||!Number.isInteger(segments)||segments<16)throw new Error('Invalid leaf geometry');
 const progress=unit(turn),rotation=profile==='hinge'?progress-.09*Math.sin(Math.PI*progress):progress;
 const angle=Math.PI*rotation,s=Math.max(0,Math.sin(angle)),co=Math.cos(angle),eye=width*1.85;
 const point=u=>{
  const z=width*s*curl*(profile==='hinge'?.556*u:.556*u+.370*Math.sin(Math.PI*u));
  const scale=eye/(eye-z);
  return {x:x+(width*co*u+width*(profile==='hinge'?-.18:.058)*Math.sin(Math.PI*u)*s*curl)*scale,
   y:y+height/2-height/2*scale,height:height*scale,z};
 };
 const strips=[];
 for(let i=0;i<segments;i++){
  const u=i/segments,v=(i+1)/segments,a=point(u),b=point(v),mid=(u+v)/2;
  strips.push({u,v,a,b,front:b.x>=a.x,depth:(a.z+b.z)/2,
   shade:s*(.10+.09*Math.sin(Math.PI*mid))});
 }
 // Farther strips are painted first, so curled parts occlude the surface below.
 return strips.sort((a,b)=>a.depth-b.depth||a.u-b.u);
}
