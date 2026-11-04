// Independent deterministic 2D vocabulary. Units are a 540 × 960 portrait stage.
export const W=540,H=960,INK='#1a1030';
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export const ease=t=>1-(1-clamp(t))**3;
export const hash=n=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
export function path(g,points,fill,stroke=INK,lw=4,close=true){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));if(close)g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.lineWidth=lw;g.strokeStyle=stroke;g.lineJoin='round';g.lineCap='round';g.stroke()}}
export function line(g,p,color=INK,lw=4){path(g,p,null,color,lw,false)}
export function rr(g,x,y,w,h,r,fill,stroke=INK,lw=4){g.beginPath();g.roundRect(x,y,w,h,r);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
export function oval(g,x,y,rx,ry,fill,stroke=INK,lw=4){g.beginPath();g.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
export function text(g,s,x,y,size=32,fill='#fff',stroke=null,lw=5,font='Titan One',align='center'){g.font=`${size}px "${font}"`;g.textAlign=align;g.textBaseline='middle';g.lineJoin='round';if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.strokeText(s,x,y)}g.fillStyle=fill;g.fillText(s,x,y)}
export function fitText(g,s,x,y,max,size=38,fill='#fff',stroke=INK,font='Titan One'){g.font=`${size}px "${font}"`;const width=g.measureText(s).width;text(g,s,x,y,Math.min(size,size*max/Math.max(1,width)),fill,stroke,6,font)}
export function replaySlate(g,sourceSeconds){
 const centiseconds=Math.max(0,Math.floor(sourceSeconds*100)),pad=v=>String(v).padStart(2,'0');
 const clock=`${pad(Math.floor(centiseconds/6000))}:${pad(Math.floor(centiseconds/100)%60)}.${pad(centiseconds%100)}`;
 g.fillStyle='#101010';g.fillRect(0,0,W,72);g.fillRect(0,910,W,50);
 g.font='bold 25px Arial';g.textAlign='left';g.textBaseline='middle';g.fillStyle='#fff';g.fillText('instant replay',25,35);
 oval(g,205,35,6,6,'#df1831',null);text(g,`0.5×  ◀◀  ${clock}`,516,35,14,'#fff',null,0,'Arial','right');
}
export function toonBox(g,x,y,w,h,r,color,shade){rr(g,x+3,y+5,w,h,r,shade,INK,5);rr(g,x,y,w-2,h-4,r,color,INK,4);line(g,[[x+13,y+10],[x+w-18,y+10]],'#fff5',3)}
export function burst(g,x,y,rx,ry,fill,rot=0,n=12){let p=[];for(let i=0;i<n*2;i++){let a=i*Math.PI/n+rot;let k=i%2?.62:1;p.push([x+Math.cos(a)*rx*k,y+Math.sin(a)*ry*k])}path(g,p,fill,INK,4)}
export function star(g,x,y,r,color){burst(g,x,y,r,r,color,-Math.PI/2,5)}
export function transformed(g,x,y,s,angle,fn){g.save();g.translate(x,y);g.rotate(angle);g.scale(s,s);fn();g.restore()}
export function command(g,s,t,hold=.65){
 let u=smooth((t-hold)/.22),scale=lerp(t<.10?lerp(1.7,.94,t/.10):1,.40,u),x=lerp(270,122,u),y=lerp(275,124,u);
 transformed(g,x,y,scale,-.08,()=>{if(u<.99)burst(g,0,0,246,76,'#ffc928',0,13);fitText(g,s,5,8,440,66,'#ff2e88',INK);fitText(g,s,0,0,440,66,'#fff',INK)})
}
export function spark(g,x,y,t,r=13){for(let i=0;i<9;i++){let a=i*2.4+t*13;line(g,[[x+Math.cos(a)*5,y+Math.sin(a)*5],[x+Math.cos(a)*(r+5*hash(i+Math.floor(t*30))),y+Math.sin(a)*(r+5*hash(i))]],i%2?'#ffb51c':'#fff8b9',3)}oval(g,x,y,5,5,'#fff9a5',null)}
export function fuse(g,progress,beats,t){let x=48,y=842,len=417,p=x+len*clamp(progress);line(g,[[p,y],[x+len,y]],'#2c1832',7);line(g,[[p,y-1],[x+len,y-1]],'#d7aa70',4);for(let i=0;i<=Math.ceil(beats);i++){let q=x+len*i/beats;if(q>x+len||q<p)continue;oval(g,q,y,3,3,'#c39359','#35283c',1.4)}
 g.save();g.setLineDash([1,3]);line(g,[[x,y],[p,y]],'#777067',1.5);g.restore();spark(g,p,y,t);transformed(g,x+len+12,y,1,-.23,()=>{rr(g,-9,-17,18,33,3,'#ff3b3b',INK,3);path(g,[[-11,-17],[0,-29],[11,-17]],'#ffc928',INK,2)})
}
export function stamp(g,ok,t,x=402,y=718){let sc= t<.14?lerp(1.7,1,t/.14):1;transformed(g,x,y,sc,-.15,()=>{oval(g,0,0,55,55,ok?'#3bdc5a':'#ff3b3b',INK,6);oval(g,0,0,45,45,null,'#fff9',2);text(g,ok?'OK!':'NO!',0,2,35,'#fff',INK,6)})}
