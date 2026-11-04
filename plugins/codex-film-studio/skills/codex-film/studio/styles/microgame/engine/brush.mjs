import {hash,lerp,oval,path} from './primitives.mjs';

// Bristles follow the path tangent. Sparse, persistent gaps simulate dry ink;
// the seed is attached to the stroke, so seeking does not change its texture.
export function brush(g,points,width=5,seed=1,color='#20241f',wet=false){
 const samples=[];
 for(let k=1;k<points.length;k++){
  const a=points[k-1],b=points[k],n=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));
  for(let i=0;i<n;i++)samples.push([lerp(a[0],b[0],i/n),lerp(a[1],b[1],i/n)]);
 }samples.push(points.at(-1));
 g.save();g.strokeStyle=color;g.lineCap='round';g.lineJoin='round';
 if(wet){g.globalAlpha=.14;g.lineWidth=width*1.5;g.beginPath();samples.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke()}
 const count=Math.max(5,Math.ceil(width*1.8));
 for(let b=0;b<count;b++){
  const offset=(b/(count-1)-.5)*width;
  g.globalAlpha=.25+hash(seed+b*11)*.42;g.lineWidth=.38+hash(b+seed*3)*.72;
  let pen=false;g.beginPath();
  for(let i=0;i<samples.length;i++){
   const p=samples[i],q=samples[Math.min(i+1,samples.length-1)],r=samples[Math.max(0,i-1)];
   const an=Math.atan2(q[1]-r[1],q[0]-r[0])+Math.PI/2;
   const pressure=.52+.39*Math.sin(i/samples.length*Math.PI)+.13*Math.sin(i*.18+seed);
   const d=offset*pressure+(hash(Math.floor(i/3)*17+b+seed)-.5)*.65;
   const x=p[0]+Math.cos(an)*d,y=p[1]+Math.sin(an)*d;
   const gap=!wet&&hash(Math.floor(i/7)+b*29+seed*47)>.87;
   if(gap){pen=false;continue}if(pen)g.lineTo(x,y);else {g.moveTo(x,y);pen=true}
  }g.stroke();
 }g.restore();
}
export function brushArc(g,x,y,rx,ry,start=0,end=Math.PI*2,width=5,seed=1,color='#20241f'){
 const points=[];for(let i=0;i<=80;i++){let a=lerp(start,end,i/80),d=1+Math.sin(a*5+seed)*.018;points.push([x+Math.cos(a)*rx*d,y+Math.sin(a)*ry*d])}
 brush(g,points,width,seed,color);
}
export function blot(g,x,y,rx,ry,seed=1,color='#20241f'){
 const points=[];for(let i=0;i<60;i++){let a=i/60*Math.PI*2,d=.90+hash(i+seed)*.14+Math.sin(a*7+seed)*.04;points.push([x+Math.cos(a)*rx*d,y+Math.sin(a)*ry*d])}
 g.save();const alpha=g.globalAlpha;g.globalAlpha=alpha*.10;for(let i=3;i>0;i--){g.save();g.translate(x,y);g.scale(1+i*.035,1+i*.035);g.translate(-x,-y);path(g,points,color,null);g.restore()}g.globalAlpha=alpha;path(g,points,color,null);g.restore();
}
export function inkFigure(g,pose,role){
 const arm=pose.arm||0,hand=pose.target||[69,-54-arm*48],elbow=[(29+hand[0])*.5,-72+(hand[1]+72)*.45];
 const wash=(p,c='#b8b9ad')=>{g.save();g.globalAlpha=.42;path(g,p,c,null);g.restore()};
 wash([[-31,-83],[26,-84],[39,-17],[-36,-19]]);
 brush(g,[[-25,-22],[-29,23],[-43,29],[-9,30]],9,2);brush(g,[[20,-22],[25,24],[43,29],[12,30]],9,3);
 brush(g,[[-32,-83],[-39,-53],[-38,-18],[35,-18],[30,-78]],5,8);
 brush(g,[[-29,-77],[-56,-52-arm*45],[-67,-50-arm*45]],10,11);
 brush(g,[[30,-77],elbow,hand],10,14);
 brushArc(g,-68,-50-arm*45,10,9,0,6.28,3,22);brushArc(g,...hand,12,10,0,6.28,3,24);
 brushArc(g,0,-118,38,35,-.08,3.08,3,41);brushArc(g,0,-119,38,35,3.4,6.05,5,44);
 // Almost bare paper for skin; light wash and irregular ink features.
 g.save();g.globalAlpha=.16;blot(g,-23,-109,9,7,33,'#8e9687');blot(g,23,-109,9,7,34,'#8e9687');g.restore();
 blot(g,-20,-143,17,11,41);blot(g,16,-143,21,10,46);
 if(role==='baker'){
  path(g,[[-31,-143],[-30,-157],[-21,-177],[2,-184],[25,-175],[31,-148]],'#ede9db',null);
  brushArc(g,-18,-160,17,17,2.1,4.6,4,51);brushArc(g,4,-169,21,18,3.7,5.8,5,53);brushArc(g,23,-157,14,15,4.4,7.3,4,54);
  brush(g,[[-31,-154],[-30,-141],[28,-141],[30,-153]],4,57);brush(g,[[-18,-155],[-18,-145]],2,58);
 }else{
  wash([[-28,-149],[-22,-172],[18,-176],[30,-151]],'#8b9382');brush(g,[[-27,-149],[-22,-172],[18,-176],[30,-151]],5,61);brushArc(g,0,-147,47,8,0,6.28,5,62);
 }
 brush(g,[[-18,-127],[-7,-129]],4,70);brush(g,[[8,-129],[18,-126]],4,71);
 blot(g,-13,-119,3.5,pose.face==='shock'?6:4,74);blot(g,13,-119,3.5,pose.face==='shock'?6:4,75);
 brush(g,[[1,-116],[-2,-109],[3,-109]],1.8,76);
 if(pose.face==='shock')blot(g,0,-99,5,7,78);else brushArc(g,0,-109,12,11,.3,2.8,2.6,77);
 blot(g,0,-53,9,10,81,'#bd3b29');brush(g,[[-24,-72],[-29,-27]],2,85,'#7d8277');
}
