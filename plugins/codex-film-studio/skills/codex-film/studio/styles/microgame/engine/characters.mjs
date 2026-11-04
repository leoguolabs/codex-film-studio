import {line,rr,oval,path,text,transformed,INK,hash} from './primitives.mjs';
import {palettes} from './materials.mjs';
import {inkFigure} from './brush.mjs';
import {pixelFigure} from './pixel.mjs';
import {terminalFigure} from './terminal.mjs';
// Convert a scene contact into the same local space used by the performer.
// Subtracting translation alone makes a held tool drift whenever the body leans.
export function localContact(point,x,y,scale,lean=0,jump=0){
 const dx=(point[0]-x)/scale,dy=(point[1]-y+jump)/scale,c=Math.cos(lean),s=Math.sin(lean);
 return [c*dx+s*dy,-s*dx+c*dy];
}
// Common identity: two pointed tufts, short cap, a single red chest button.
// The silhouette is reconstructed in each medium, not a bitmap filter.
export function hero(g,m,x,y,scale,pose={},role='baker'){
 const p=palettes[m],target=pose.target,arm=pose.arm||0,lean=pose.lean||0,jump=pose.jump||0,face=pose.face||'happy';
 transformed(g,x,y-jump,scale,lean,()=>{
  if(m==='ink'){inkFigure(g,pose,role);return}
  if(m==='pixel'){pixelFigure(g,pose,role);return}
  if(m==='terminal'){
   terminalFigure(g,pose,role,p);return;
  }
  if(m==='swiss'){
   path(g,[[-27,-17],[-32,25],[-10,25],[-5,-15]],p.ink,null);path(g,[[5,-15],[9,25],[31,25],[28,-17]],p.ink,null);
   rr(g,-31,-80,62,67,0,p.ink,null);oval(g,0,-116,37,37,p.ink,null);
   if(role==='baker'){rr(g,-31,-158,62,23,0,p.ink,null);oval(g,-20,-163,17,17,p.ink,null);oval(g,1,-171,20,18,p.ink,null);oval(g,23,-161,16,16,p.ink,null);line(g,[[-25,-143],[25,-143]],p.paper,2)}else{rr(g,-28,-170,56,30,0,p.ink,null);rr(g,-48,-148,96,9,0,p.ink,null)}
   oval(g,0,-58,11,11,p.accent,null);
   const hand=target||[65,-50-arm*45];line(g,[[-28,-75],[-62,-46-arm*40]],p.ink,15);line(g,[[28,-75],[(28+hand[0])*.5,(-75+hand[1])*.5],hand],p.ink,15);oval(g,-12,-119,4,4,p.paper,null);oval(g,12,-119,4,4,p.paper,null);return;
  }
  let lw=m==='blueprint'?2:m==='ink'?3:4;let skin=m==='ink'?'#d4d1c6':m==='blueprint'?p.paper:m==='woodcut'?'#d0be8e':'#f3d3a7';
  let body=m==='paper'?'#e5be63':m==='crayon'?'#87aecb':p.hero,light=m==='pixel'?'#f4e5c0':p.paper;
  // Hard side shadow and asymmetric stepping feet.
  path(g,[[-25,-25],[-30,25],[-10,25],[-3,-25]],p.ink,p.ink,lw);path(g,[[8,-25],[12,25],[34,25],[27,-25]],p.ink,p.ink,lw);
  oval(g,-23,26,22,9,m==='pixel'?'#ef8457':light,p.ink,lw);oval(g,28,26,22,9,m==='pixel'?'#ef8457':light,p.ink,lw);
  path(g,[[-32,-85],[32,-85],[38,-17],[-38,-17]],body,p.ink,lw);
  path(g,[[19,-81],[32,-85],[38,-17],[19,-17]],m==='blueprint'?p.hero:p.ground,null);
  let left=pose.leftTarget||[-69,-48-arm*48],leftElbow=pose.leftTarget?[(-28+left[0])*.5,-70+(left[1]+70)*.45]:[-59,-48-arm*48],leftEnd=pose.leftTarget||[-68,-48-arm*48];
  line(g,[[-28,-77],leftElbow,leftEnd],p.ink,lw+9);
  line(g,[[-28,-77],leftElbow,leftEnd],body,lw+3);
  let hand=target||[72,-58-arm*55],elbow=[(30+hand[0])*.5,-70+(hand[1]+70)*.45];
  line(g,[[30,-78],elbow,hand],p.ink,lw+9);
  line(g,[[30,-78],elbow,hand],body,lw+3);
  oval(g,left[0],left[1],11,10,skin,p.ink,lw);oval(g,hand[0],hand[1],12,10,skin,p.ink,lw);
  oval(g,0,-119,39,35,skin,p.ink,lw);
  path(g,[[-34,-139],[-32,-162],[-11,-148],[9,-148],[33,-164],[36,-139]],p.hero,p.ink,lw);
  rr(g,-33,-149,67,17,5,role==='baker'?light:p.ground,p.ink,lw);
  if(role==='baker'){
   oval(g,-17,-158,16,15,light,p.ink,lw);oval(g,8,-164,19,18,light,p.ink,lw);oval(g,25,-155,14,14,light,p.ink,lw);
   rr(g,-26,-151,53,15,2,light,null);
  }else{oval(g,2,-147,48,8,p.ground,p.ink,lw);line(g,[[14,-169],[20,-177]],p.accent,4)}
  if(face==='shock'){oval(g,-13,-120,5,8,p.ink,null);oval(g,12,-120,5,8,p.ink,null);oval(g,0,-101,7,8,p.ink,null)}
  else{line(g,[[-18,-120],[-13,-125],[-8,-120]],p.ink,3);line(g,[[7,-120],[12,-125],[17,-120]],p.ink,3);g.beginPath();g.arc(0,-112,13,.20,Math.PI-.20);g.strokeStyle=p.ink;g.lineWidth=3;g.stroke()}
  oval(g,0,-54,10,10,p.accent,p.ink,2);
  if(m==='ink'){for(let i=0;i<17;i++)line(g,[[-30+hash(i)*60,-80],[-29+hash(i)*60,-20]],'#e9e5d5aa',.8)}
  if(m==='crayon'){g.save();g.globalAlpha=.4;for(let i=0;i<15;i++)line(g,[[-25+i*4,-79],[-37+i*4,-20]],p.paper,1.3);g.restore()}
  if(m==='woodcut'){for(let yy=-80;yy<-20;yy+=5)line(g,[[-28,yy],[24,yy-6]],p.paper,1)}
  if(m==='blueprint'){g.setLineDash([5,3]);line(g,[[0,-185],[0,35]],p.ink,1);g.setLineDash([])}
 });
}
// A bell-shaped stage emcee; same theatrical weight as the reference without its watch-head character.
export function host(g,x,y,sc,t,still=false){
 transformed(g,x,y,sc,0,()=>{
  let tick=still?0:Math.sin(Math.floor(t*8)/8*Math.PI*4)*.08;
  line(g,[[-21,0],[-23,100]],INK,13);line(g,[[23,0],[26,100]],INK,13);
  oval(g,-30,108,27,12,'#fff8dc',INK,5);oval(g,33,108,28,12,'#fff8dc',INK,5);
  path(g,[[-45,-110],[42,-110],[50,0],[-46,0]],'#ff2e88',INK,5);
  path(g,[[-27,-109],[0,-42],[29,-109]],'#1fd1d1',INK,4);path(g,[[-14,-106],[0,-73],[14,-106]],'#fff6d8',INK,3);
  path(g,[[-9,-93],[0,-99],[10,-93],[0,-86]],INK,INK,2);
  [0,1,2].forEach(i=>oval(g,0,-63+i*19,4,4,'#ffc928',null));
  line(g,[[-42,-91],[-58,-30],[-48,10]],INK,17);line(g,[[-42,-91],[-58,-30],[-48,10]],'#ff2e88',9);
  line(g,[[43,-90],[85,-68],[122,-105+Math.sin(t*4)*8]],INK,17);line(g,[[43,-90],[85,-68],[122,-105+Math.sin(t*4)*8]],'#ff2e88',9);
  oval(g,-47,18,16,20,'#fff6df',INK,4);oval(g,128,-110+Math.sin(t*4)*8,18,15,'#fff6df',INK,4);
  transformed(g,0,-167,1,tick,()=>{
   oval(g,0,-83,12,13,'#ffcb28',INK,5);rr(g,-18,-75,36,16,5,'#ffe69b',INK,4);
   path(g,[[-59,48],[-45,-39],[-25,-64],[25,-64],[45,-39],[59,48]],'#ffcb28',INK,6);
   path(g,[[32,-45],[45,-39],[59,48],[37,48]],'#df8900',null);
   oval(g,0,49,67,17,'#ffcb28',INK,6);oval(g,0,63,12,11,'#ed8240',INK,4);
   line(g,[[-32,-14],[-21,-24],[-11,-14]],INK,5);line(g,[[11,-14],[21,-24],[32,-14]],INK,5);
   path(g,[[-26,10],[26,10],[17,30],[0,35],[-17,30]],'#381a38',INK,3);line(g,[[-18,14],[18,14]],'#fff5de',5);
   line(g,[[-37,-38],[-43,16]],'#fff4bb',6);
  });
 });
}
