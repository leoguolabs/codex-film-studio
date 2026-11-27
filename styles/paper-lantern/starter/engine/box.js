import * as THREE from 'three';
import {stage,aim} from './stage.js';
import {sheet,skyPanel,moon} from './paper.js';
export {mulberry,lerp,ss,seg,clamp} from './lib.js';
export const stock='#9a9a9a';
const neutral=new THREE.Color(stock).r;
export function box({sky=['#060b22','#23386a'],stars=180,light='#b8c8f0',lampX=0,lampY=35,seed=8}={}){
  const S=stage({light:[lampX/1000,lampY/1000,-.11],lightR:.17,lightCol:light,key:1,keyCol:'#cbd4ff',amb:.24,ambCol:'#6275ac',floor:.34,keyPos:[-.05,.32,.3],keyTarget:[0,-.03,-.09],keyAngle:1.15});
  S.sky=S.add(skyPanel({w:1.45,h:.62,z:-.146,stops:sky.map((c,i)=>[i/(sky.length-1),c]),stars,seed,starMinY:-.025,ppm:1800}));
  return S;
}
// Canvas paths use millimetres and y grows upwards. The sheet origin is its centre.
export function plate(S,{w=760,h=340,x=0,y=0,z=-90,ink='#495b8b',trans=.45,ppm=4400,draw,windows,glow=2.5,glowColor='#ffc672',shadow=true,recv=true,finish}){
  const paint=(fn,isGlow)=>(c)=>{
    c.scale(.001,.001);
    c.fillStyle=isGlow?'black':stock;
    if(isGlow){c.fillRect(-w/2,-h/2,w,h);c.fillStyle='white';}
    c.strokeStyle=c.fillStyle;fn(c);
  };
  const mesh=sheet({U:S.U,w:w/1000,h:h/1000,x:x/1000,y:y/1000,z:z/1000,ppm,trans,draw:paint(draw,false),glowDraw:windows?paint(windows,true):undefined,glow,glowCol:glowColor,glowRes:1,shadow,recv,finish});
  mesh.material.color.set(ink).multiplyScalar(1/neutral);return S.add(mesh);
}
export function power(mesh,amount){mesh.material.userData.u.uGlowLit.value=amount;}
export function move(mesh,x,y){mesh.position.x=x/1000;mesh.position.y=y/1000;}
export function camera(S,t,{x=0,y=0,d=350,lookX=x,lookY=y,focusZ=-80,hand=.45}={}){
  aim(S.cam,[x/1000,y/1000,d/1000,lookX/1000,lookY/1000,focusZ/1000],t,{hand:hand/1000});
  S.focus=(d-focusZ)/1000;
}
export function lunar(S,{x,y,r=7,z=-137,...opts}){
  return S.add(moon({x:x/1000,y:y/1000,z:z/1000,r:r/1000,gain:1.5,halo:5,haloGain:.14,...opts}));
}
export function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
export function line(c,points,width=.6){c.beginPath();c.lineWidth=width;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
export function hole(c,fn){c.save();c.globalCompositeOperation='destination-out';c.fillStyle=c.strokeStyle='#000';fn(c);c.restore();}
export function disc(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
export function label(c,value,x,y,size,color='#201b31',weight=600){c.save();c.translate(x,y);c.scale(1,-1);c.fillStyle=color;c.font=weight+' '+size+'px CutSerif';c.textAlign='center';c.textBaseline='middle';c.fillText(value,0,0);c.restore();}
