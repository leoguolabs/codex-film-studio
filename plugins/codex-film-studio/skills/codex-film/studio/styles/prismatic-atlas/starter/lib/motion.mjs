// Content-independent transform, path and motion helpers. No cast or scenes.
import {clamp,smooth} from './atlas.mjs';

export function composePose(parent,child){
 const rotation=(parent.rotation??0)+(child.rotation??0),scale=(parent.scale??1)*(child.scale??1);
 const a=parent.rotation??0,k=parent.scale??1,[x,y]=child.position??[0,0],[px,py]=parent.position??[0,0];
 return {position:[px+k*(x*Math.cos(a)-y*Math.sin(a)),py+k*(x*Math.sin(a)+y*Math.cos(a))],rotation,scale};
}

export function pathPoint(points,progress){
 if(points.length<2)throw new RangeError('A path needs at least two points');
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0);if(total===0)return [...points[0]];
 let remaining=clamp(progress)*total;
 for(let i=0;i<lengths.length;i++){
  if(remaining<=lengths[i]||i===lengths.length-1){const q=lengths[i]===0?0:remaining/lengths[i];return [points[i][0]+q*(points[i+1][0]-points[i][0]),points[i][1]+q*(points[i+1][1]-points[i][1])];}
  remaining-=lengths[i];
 }
}

export function blink(time,{period=4.2,duration=.12,phase=0}={}){
 if(period<=0||duration<=0||duration>=period)throw new RangeError('Require 0 < duration < period');
 const t=((time+phase)%period+period)%period;
 return t<duration?Math.abs(t-duration/2)/(duration/2):1;
}

export function contactSettle(time,{at,duration=.35,amplitude=1}={}){
 if(duration<=0)throw new RangeError('Positive duration required');
 const q=(time-at)/duration;return q<=0||q>=1?0:amplitude*Math.sin(Math.PI*q);
}

export function actionProgress(frame,{start,end}){
 if(!Number.isInteger(start)||!Number.isInteger(end)||end<=start)throw new RangeError('Require an increasing integer frame interval');
 return smooth((frame-start)/(end-start));
}

// Solve a two-link attachment without stretching either segment.
export function twoBone(root,target,upper,lower,{bend=1,heading=0}={}){
 if(![...root,...target,upper,lower,bend,heading].every(Number.isFinite)||upper<=0||lower<=0||![-1,1].includes(bend))throw new RangeError('Finite points, positive lengths and bend ±1 required');
 const dx=target[0]-root[0],dy=target[1]-root[1],requested=Math.hypot(dx,dy),distance=Math.max(Math.abs(upper-lower),Math.min(upper+lower,requested));
 const ux=requested>1e-12?dx/requested:Math.cos(heading),uy=requested>1e-12?dy/requested:Math.sin(heading);
 const along=distance===0?0:(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 return {joint:[root[0]+ux*along-uy*height*bend,root[1]+uy*along+ux*height*bend],end:[root[0]+ux*distance,root[1]+uy*distance],reached:Math.abs(requested-distance)<1e-8};
}
