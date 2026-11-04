/** Generic deterministic frame helpers. No production content or renderer. */
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
/** Evaluate the same cubic path used to draw a route; t is clamped to its endpoints. */
export function cubicPoint(points,t){
  if(points.length!==4||points.some(p=>p.length!==2||!p.every(Number.isFinite))||!Number.isFinite(t))throw new RangeError('Invalid cubic path');
  const u=clamp(t),v=1-u;
  return [0,1].map(k=>v*v*v*points[0][k]+3*v*v*u*points[1][k]+3*v*u*u*points[2][k]+u*u*u*points[3][k]);
}
export function phase(frame,start,end){
  if(!(end>start))throw new RangeError('Expected a nonempty half-open interval');
  return clamp((frame-start)/(end-start));
}
export function shotAt(shots,frame){return shots.find(s=>s.start<=frame&&frame<s.end)}
export function eventSample(frame,fps,sampleRate){
  if(!(fps>0&&sampleRate>0&&Number.isInteger(frame)&&frame>=0))throw new RangeError('Invalid clock');
  return Math.round(frame*sampleRate/fps);
}
export function wheelAngle(distance,radius){
  if(!(radius>0))throw new RangeError('Wheel radius must be positive');
  return distance/radius;
}
/** Two-segment reach with explicit elbow side and an observable reach limit. */
export function solveTwoBone(root,target,upper,lower,bend=1){
  if(![...root,...target,upper,lower,bend].every(Number.isFinite)||root.length!==2||target.length!==2||upper<=0||lower<=0||![-1,1].includes(bend))throw new RangeError('Invalid limb geometry');
  const dx=target[0]-root[0],dy=target[1]-root[1],distance=Math.hypot(dx,dy);
  const reach=clamp(distance,Math.abs(upper-lower),upper+lower);
  if(reach===0)return{joint:[root[0]+upper,root[1]],end:[...root],reached:true};
  const direction=Math.atan2(dy,dx),offset=Math.acos(clamp((upper*upper+reach*reach-lower*lower)/(2*upper*reach),-1,1));
  return{joint:[root[0]+upper*Math.cos(direction+bend*offset),root[1]+upper*Math.sin(direction+bend*offset)],end:[root[0]+reach*Math.cos(direction),root[1]+reach*Math.sin(direction)],reached:Math.abs(reach-distance)<1e-8};
}
/** Exactly one owner renders a transferred prop at each integer frame. */
export function propOwner(frame,{take,place}){
  if(![frame,take,place].every(Number.isInteger)||take<0||place<=take)throw new RangeError('Invalid transfer frames');
  return frame<take?'source':frame<place?'travelling':'destination';
}
export function group(ctx,{x=0,y=0,scale=1,rotation=0},draw){
  ctx.save();try{ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(rotation);draw(ctx)}finally{ctx.restore()}
}
export function camera(ctx,{cx,cy,zoom,width,height},draw){
  ctx.save();try{ctx.translate(width/2,height/2);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);draw(ctx)}finally{ctx.restore()}
}
export function worldToScreen({x,y},{cx,cy,zoom,width,height}){
  return{x:(x-cx)*zoom+width/2,y:(y-cy)*zoom+height/2};
}
/** Pinhole projection for a camera looking along +Z; coordinates are camera-relative. */
export function projectPerspective(point,{focal,center=[0,0],near=.01}){
  if(point.length!==3||center.length!==2||![...point,...center,focal,near].every(Number.isFinite)||focal<=0||near<=0)throw new RangeError('Invalid perspective geometry');
  const[x,y,z]=point;
  return z<near?null:[center[0]+focal*x/z,center[1]+focal*y/z];
}
/** Clip a camera-relative polygon before projection; do not clamp individual vertices. */
export function clipNearPlane(points,near=.01){
  if(!(Number.isFinite(near)&&near>0)||points.some(p=>p.length!==3||!p.every(Number.isFinite)))throw new RangeError('Invalid clipping geometry');
  if(points.length<3)return[];
  const result=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],insideA=a[2]>=near,insideB=b[2]>=near;
    if(insideA)result.push([...a]);
    if(insideA!==insideB){const t=(near-a[2])/(b[2]-a[2]);result.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t),near])}
  }
  return result;
}
export function coverImage(ctx,image,{width,height,overscan=1,offsetX=0,offsetY=0}){
  const scale=Math.max(width/image.width,height/image.height)*overscan;
  ctx.drawImage(image,(width-image.width*scale)/2+offsetX,(height-image.height*scale)/2+offsetY,image.width*scale,image.height*scale);
}
export function validateTimeline(t){
  if(!(t.fps>0&&Number.isInteger(t.duration_frames)&&t.duration_frames>0))throw new Error('Production timing is incomplete');
  let end=0;const ids=new Set();
  for(const s of t.shots){
    if(!s.id||ids.has(s.id)||s.start!==end||!Number.isInteger(s.end)||s.end<=s.start)throw new Error('Shots must uniquely cover the timeline without gaps');
    ids.add(s.id);end=s.end;
  }
  if(end!==t.duration_frames)throw new Error('Incomplete shot coverage');
  for(const e of t.events??[])if(!Number.isInteger(e.frame)||e.frame<0||e.frame>=end)throw new Error('Event outside timeline');
  return true;
}
