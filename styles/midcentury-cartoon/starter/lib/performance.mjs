// Generic performance geometry. No cast, story, coordinates or film timing.
const clamp=x=>Math.max(0,Math.min(1,x));
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function solveLimb({root,tip,lengths,bend=1}){
 if(!point(root)||!point(tip)||!Array.isArray(lengths)||lengths.length!==2||lengths.some(x=>!Number.isFinite(x)||x<=0)||![1,-1].includes(bend))throw new TypeError('Provide two finite points, positive lengths, and bend +1 or -1');
 const [a,b]=lengths,dx=tip[0]-root[0],dy=tip[1]-root[1],d=Math.hypot(dx,dy);
 if(d===0||d>a+b+1e-9||d<Math.abs(a-b)-1e-9)throw new RangeError('Unreachable or ambiguous limb target');
 const angle=Math.atan2(dy,dx),offset=Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));
 return [root.slice(),[root[0]+a*Math.cos(angle+bend*offset),root[1]+a*Math.sin(angle+bend*offset)],tip.slice()];
}
export function roundedJointPath([root,joint,tip],{rounding=.13,samples=6}={}){
 if(![root,joint,tip].every(point)||rounding<0||rounding>.5||!Number.isInteger(samples)||samples<1)throw new RangeError('Invalid joint path');
 const a=joint.map((v,i)=>v+(root[i]-v)*rounding),b=joint.map((v,i)=>v+(tip[i]-v)*rounding),out=[root.slice(),a];
 for(let i=1;i<=samples;i++){const u=i/samples;out.push(a.map((v,j)=>(1-u)**2*v+2*(1-u)*u*joint[j]+u*u*b[j]));}out.push(tip.slice());return out;
}
export function decisiveEase(u){
 if(!Number.isFinite(u))throw new TypeError('Finite progress required');u=clamp(u);if(u===0||u===1)return u;
 let lo=0,hi=1,t=u;for(let i=0;i<14;i++){t=(lo+hi)/2;const x=3*(1-t)**2*t*.25+3*(1-t)*t*t*.15+t*t*t;if(x<u)lo=t;else hi=t;}return 3*(1-t)*t*t+t*t*t;
}
export function motionPhase(time,start,end){if(![time,start,end].every(Number.isFinite)||end<=start)throw new RangeError('Increasing finite phase range required');return decisiveEase((time-start)/(end-start));}
export function poseBoundary(frame,hold=2){if(!Number.isFinite(frame)||!Number.isInteger(hold)||hold<1)throw new RangeError('Invalid pose clock');return Math.ceil(frame/hold)*hold;}
