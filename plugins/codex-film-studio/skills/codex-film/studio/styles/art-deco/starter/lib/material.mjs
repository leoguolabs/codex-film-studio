// Original deterministic drawing vocabulary. No upstream animation source imports.
export const C={ink:'#0d0b09',black:'#060504',night:'#0a0e16',emerald:'#1D6B57',burgundy:'#8E1B2E',ivory:'#F2E8D5',gold:'#C9A24B',light:'#F3D98B',hot:'#FFF4D2'};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
export const mix=(a,b,t)=>a+(b-a)*t;
export const tau=Math.PI*2;
export function path(g,p,close=false){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(close)g.closePath()}
export function gold(g,x=0,y=0,w=1080,h=1920,t=0){let z=g.createLinearGradient(x,y,x+w,y+h);z.addColorStop(0,'#6F5220');z.addColorStop(.23,'#C9A24B');z.addColorStop(.42+.08*Math.sin(t),'#FFF4D2');z.addColorStop(.57+.08*Math.sin(t),'#F3D98B');z.addColorStop(.79,'#C9A24B');z.addColorStop(1,'#6F5220');return z}
export function line(g,p,w=2,t=0,closed=false,alpha=1){g.save();g.globalAlpha*=alpha;path(g,p,closed);g.lineWidth=w+1.6;g.strokeStyle='#241808';g.stroke();g.lineWidth=w;g.strokeStyle=gold(g,p[0][0],p[0][1],300,420,t);g.stroke();g.lineWidth=.42;g.strokeStyle='rgba(255,244,210,.45)';g.stroke();g.restore()}
export function poly(g,p,base='#332717',light='#80652e',rim=true){let xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;let z=g.createLinearGradient(x,y,x+w,y+h*.5);z.addColorStop(0,light);z.addColorStop(.42,base);const end={'#bd8c68':'#b07a58','#a5684a':'#a46c4e','#a97350':'#ae7854','#8E1B2E':'#5a1220','#1D6B57':'#153e31','#163f31':'#123729','#b9a878':'#d4c7a5','#b2a475':'#d8cba9','#627b4e':'#284c37'}[base]||'#0b0907';z.addColorStop(1,end);path(g,p,true);g.fillStyle=z;g.fill();if(rim)line(g,p,1.5,0,true)}
export function rect(g,x,y,w,h,base='#20180e',light='#6a5325'){poly(g,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],base,light)}
export function ellipse(g,x,y,rx,ry,fill=C.gold,stroke=true){g.beginPath();g.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,tau);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=gold(g,x-rx,y-ry,rx*2,ry*2);g.lineWidth=1.5;g.stroke()}}
export function glow(g,x,y,r,color='245,206,110',strength=.25){const z=g.createRadialGradient(x,y,0,x,y,r);z.addColorStop(0,`rgba(${color},${strength})`);z.addColorStop(1,`rgba(${color},0)`);g.fillStyle=z;g.fillRect(x-r,y-r,2*r,2*r)}
export function lightBeam(g,from,to,nearWidth,farWidth,{color='244,220,165',strength=.12}={}){
 const dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);if(!length||nearWidth<0||farWidth<=0)return;
 g.save();g.translate(...from);g.rotate(Math.atan2(dy,dx)-Math.PI/2);
 path(g,[[-nearWidth/2,0],[nearWidth/2,0],[farWidth/2,length],[-farWidth/2,length]],true);g.clip();
 const fade=g.createLinearGradient(0,0,0,length);fade.addColorStop(0,`rgba(${color},${strength})`);fade.addColorStop(.7,`rgba(${color},${strength*.72})`);fade.addColorStop(1,`rgba(${color},0)`);g.fillStyle=fade;g.fillRect(-Math.max(nearWidth,farWidth)/2,0,Math.max(nearWidth,farWidth),length);g.restore();
}
// Apply to the defocused set before drawing the sharp figure. Keep the key on one side.
export function portraitLighting(g,t,{resolved=false,origin=[920,-120]}={}){
 g.save();
 const negative=g.createLinearGradient(0,0,1080,0);
 negative.addColorStop(0,'rgba(3,8,13,.48)');negative.addColorStop(.55,'rgba(3,8,13,.18)');negative.addColorStop(1,'rgba(3,8,13,0)');
 g.fillStyle=negative;g.fillRect(0,0,1080,1920);
 const floor=g.createLinearGradient(0,850,0,1920);
 floor.addColorStop(0,'rgba(6,7,8,0)');floor.addColorStop(1,'rgba(6,7,8,.48)');
 g.fillStyle=floor;g.fillRect(0,850,1080,1070);
 if(resolved){
  glow(g,1030,630,1050,'244,192,89',.58);
  const drift=Math.sin(t*.22)*18;
  lightBeam(g,origin,[300+drift,1870],90,500,{strength:.13});
  lightBeam(g,[origin[0]-530,origin[1]-100],[70-drift,1850],45,230,{color:'198,208,192',strength:.08});
  lightBeam(g,[origin[0]+200,origin[1]-70],[1030-drift,1800],35,290,{strength:.065});
 }
 g.restore();
}
// Portrait stage lighting preserves the high lamp row and long cool cones of the source.
export function stageLighting(g,t,{starsVisible=true}={}){
 const ground=g.createLinearGradient(0,0,0,1920);
 ground.addColorStop(0,'#080b10');ground.addColorStop(.55,'#0c151b');ground.addColorStop(1,'#142824');
 g.fillStyle=ground;g.fillRect(0,0,1080,1920);
 if(starsVisible)for(let i=0;i<55;i++){
  const x=(i*337.217+45)%1080,y=(i*179.523+40)%1520;
  const alpha=.32+.18*(1+Math.sin(t*.3+i))/2;
  if(i%5===0){glow(g,x,y,13,'243,230,188',alpha*.16);sparkle(g,x,y,4+i%3,alpha)}
  else{g.save();g.globalAlpha*=alpha;ellipse(g,x,y,1.2,1.2,'#d7cfb5',false);g.restore()}
 }
 for(let i=0;i<9;i++){
  const x=80+i*115,y=125;
  lightBeam(g,[x,y],[x+Math.sin(t*.27+i)*240,2180],32,270,{color:'191,208,199',strength:.105});
  glow(g,x,y,90,'176,156,103',.20);
  g.save();g.globalAlpha*=.82;ellipse(g,x,y,17,17,'#968e70',false);g.restore();
 }
}
export function bulb(g,x,y,on=1,r=4){
 if(on<=0){ellipse(g,x,y,r,r,'#17120a');return;}
 const energy=Math.min(1.45,on);
 glow(g,x,y,r*11,'255,204,104',.27*energy);
 glow(g,x,y,r*4.2,'255,220,140',.46*energy);
 g.save();g.globalAlpha*=Math.min(1,on);
 ellipse(g,x,y,r*1.12,r*1.12,'#e2b75b',false);
 ellipse(g,x,y,r*.88,r*.88,'#fff0b7',false);
 ellipse(g,x,y,r*.67,r*.67,'#e2be6a',false);
 ellipse(g,x,y,r*.47,r*.47,C.hot,false);
 g.restore();
}
export function rays(g,x,y,r=1600,amount=1,rot=0){g.save();g.globalAlpha*=amount;for(let i=0;i<64;i++){let a=i*tau/64+rot,b=a+tau/128;g.fillStyle=i%2?'rgba(201,162,75,.025)':'rgba(201,162,75,.10)';path(g,[[x,y],[x+Math.cos(a)*r,y+Math.sin(a)*r],[x+Math.cos(b)*r,y+Math.sin(b)*r]],true);g.fill();if(i%2===0)line(g,[[x,y],[x+Math.cos(a)*r,y+Math.sin(a)*r]],.6,0,false,.22)}g.restore()}
export function sparkle(g,x,y,r=10,a=1){g.save();g.globalAlpha*=a;poly(g,[[x,y-r],[x+r*.23,y-r*.23],[x+r,y],[x+r*.23,y+r*.23],[x,y+r],[x-r*.23,y+r*.23],[x-r,y],[x-r*.23,y-r*.23]],C.light,C.hot,false);g.restore()}
export function archPoints(x,y,w,h){const r=w*.16,cy=y-h+r,p=[[x-w/2,y],[x-w/2,y-h*.34],[x-w*.40,y-h*.34],[x-w*.40,y-h*.52],[x-w*.29,y-h*.52],[x-w*.29,cy],[x-w*.16,cy]];for(let i=0;i<=32;i++){let a=Math.PI+i*Math.PI/32;p.push([x+Math.cos(a)*r,cy+Math.sin(a)*r])}p.push([x+w*.29,cy],[x+w*.29,y-h*.52],[x+w*.40,y-h*.52],[x+w*.40,y-h*.34],[x+w/2,y-h*.34],[x+w/2,y]);return p}
export function arch(g,x,y,w,h,n=4){for(let i=0;i<n;i++)line(g,archPoints(x,y,w+i*20,h+i*12),i===0?2.8:1.4)}
export function chevrons(g,x,y,w,n=8,h=24){for(let k=0;k<3;k++){let p=[];for(let i=0;i<=n*2;i++)p.push([x+i*w/(n*2),y+k*7+(i%2)*h]);line(g,p,1.2)}}
export function fan(g,x,y,r,open=1,rot=0,color=C.emerald,{folded=false,pivot=true}={}){
 g.save();g.translate(x,y);g.rotate(rot);
 const ivory=color===C.ivory;
 for(let i=0;i<12;i++){
  const a=-Math.PI/2-open*Math.PI/2+i*open*Math.PI/12,b=a+open*Math.PI/12,m=(a+b)/2;
  g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*r*.96,Math.sin(a)*r*.96);
  g.quadraticCurveTo(Math.cos(m)*r*1.055,Math.sin(m)*r*1.055,Math.cos(b)*r*.96,Math.sin(b)*r*.96);g.closePath();
  const shade=g.createLinearGradient(0,0,Math.cos(m)*r,Math.sin(m)*r);
  if(ivory&&folded){
   for(const [stop,value] of [[0,'#36290f'],[.2,'#79633e'],[.4,'#c0ac80'],[.55,'#d3be97'],[1,'#f2e2be']])shade.addColorStop(stop,value);
  }else{
   shade.addColorStop(0,ivory?'#bba45e':color);shade.addColorStop(.4,ivory?'#e0cf9d':i%2?'#6e895d':'#8b713b');shade.addColorStop(1,ivory?'#f3e6bd':color);
  }
  g.fillStyle=shade;g.fill();
  if(folded){
   g.save();g.clip();
   const fold=g.createLinearGradient(Math.cos(a)*r,Math.sin(a)*r,Math.cos(b)*r,Math.sin(b)*r);
   fold.addColorStop(0,'rgba(94,79,46,.10)');fold.addColorStop(.44,'rgba(255,249,218,.025)');fold.addColorStop(.57,'rgba(255,249,218,.11)');fold.addColorStop(1,'rgba(94,79,46,.025)');
   g.fillStyle=fold;g.fillRect(-r*1.06,-r*1.06,r*2.12,r*2.12);g.restore();
  }
  g.strokeStyle=ivory?'#b69a4d':'#b09850';g.lineWidth=folded?r*.012:.9;g.stroke();
 }
 if(pivot){ellipse(g,0,0,r*.065,r*.065,ivory?'#f5e2aa':C.gold);ellipse(g,0,0,r*.044,r*.044,'#1b160d')}g.restore();
}
// Paired surfaces leave room for the supporting figure or lamp bracket.
export function fanPair(g,r,opening,{tilt=1,fixture=false,layer='all'}={}){
 const reveal=ease((tilt-.30)/.35);
 if(layer!=='details'){
 g.save();g.scale(r,r);
 g.save();g.globalAlpha*=reveal;g.strokeStyle='#b7a675';g.lineWidth=.011;g.lineCap='round';
 for(const side of [-1,1]){
  g.beginPath();g.moveTo(side*.23,-.13);
  g.bezierCurveTo(side*.36,-.10,side*.36,.06,side*.33,.12);
  g.bezierCurveTo(side*.37,.23,side*.28,.31,side*.13,.33);g.stroke();
 }
 g.restore();g.restore();
 fan(g,0,-r*.12*reveal,r,opening,0,C.ivory,{folded:true,pivot:false});
 }
 if(layer==='surfaces')return;
 g.save();g.globalAlpha*=reveal;fan(g,0,r*.18*reveal,r*.36,opening,Math.PI,C.ivory,{folded:true,pivot:false});g.restore();
 g.save();g.globalAlpha*=reveal;
 if(!fixture)ellipse(g,0,-r*.035,r*.115,r*.12,'#e4bd91',false);
 const cap=g.createRadialGradient(-r*.028,-r*.04,r*.01,0,0,r*.095);
 cap.addColorStop(0,'#4b432c');cap.addColorStop(.7,'#17150f');cap.addColorStop(1,'#070705');
 ellipse(g,0,0,r*.086,r*.086,cap,false);
 g.strokeStyle=fixture?'#d9bf76':'#f2dc96';g.lineWidth=r*.012;g.beginPath();g.arc(0,0,r*.086,0,tau);g.stroke();
 g.strokeStyle='#554421';g.lineWidth=r*.006;g.beginPath();g.arc(0,0,r*.103,0,tau);g.stroke();
 if(fixture)bulb(g,0,0,1,r*.019);
 g.restore();
}
// A shallow stage figure beneath a raised pair; the plan-view cap takes over on tilt.
export function fanFigure(g,x,y,unit,tilt,rotation,opening=1){
 const h=(1-tilt)*unit*4,lift=ease((opening-.2)/.8),anchor=[x+unit*.85*(1-tilt),y-h*(.73+.22*lift)],alpha=1-ease((tilt-.55)/.30);
 if(alpha<=0)return anchor;
 const facing=x<540?-1:1;
 const fw=unit/70,fh=.94*fw,reveal=ease((tilt-.30)/.35);
 const point=(v)=>[anchor[0]-Math.sin(rotation)*v*fh,anchor[1]+Math.cos(rotation)*v*fh];
 const targets=[point(-12*reveal),point(18*reveal)];
 g.save();g.globalAlpha*=alpha;g.translate(x,y);g.scale(facing,1);g.translate(-x,-y);
 const w=unit*.34;
 g.beginPath();g.moveTo(x-w*.325,y-h*.75);g.quadraticCurveTo(x-w*.23,y-h*.5,x-w,y-9);
 g.quadraticCurveTo(x-w*.8,y+4,x+w*.8,y);g.quadraticCurveTo(x+w*1.1,y-4,x+w*.8,y-14);
 g.lineTo(x+w*.25,y-h*.75);g.closePath();g.fillStyle='#e9ddba';g.fill();
 g.save();g.clip();g.fillStyle='#a29b80';g.fillRect(x,y-h,w*2,h+5);g.restore();
 for(let k=0;k<3;k++){g.fillStyle='#9b8a5c';g.fillRect(x-unit*.097,y-h*.70+k*unit*.07,unit*.184,unit*.034)}
 g.strokeStyle='#dfb78d';g.lineWidth=unit*.09;g.lineCap='round';g.beginPath();g.moveTo(x,y-h*.78);g.lineTo(x,y-h*.83);g.stroke();
 ellipse(g,x,y-h*.89,unit*.115,unit*.20,'#eac396',false);
 const headY=y-h*.89;
 g.fillStyle='#1a1710';g.beginPath();g.moveTo(x-unit*.11,headY+unit*.17);
 g.bezierCurveTo(x-unit*.18,headY+unit*.05,x-unit*.18,headY-unit*.24,x,headY-unit*.24);
 g.quadraticCurveTo(x+unit*.12,headY-unit*.24,x+unit*.12,headY-unit*.10);
 g.lineTo(x+unit*.015,headY-unit*.14);g.lineTo(x-unit*.005,headY+unit*.18);g.closePath();g.fill();
 g.strokeStyle='#c6b779';g.lineWidth=unit*.012;g.beginPath();g.moveTo(x-unit*.14,headY-unit*.07);g.quadraticCurveTo(x-unit*.10,headY-unit*.23,x+unit*.09,headY-unit*.16);g.stroke();
 ellipse(g,x+unit*.066,headY-unit*.025,unit*.013,unit*.022,'#2a2115',false);
 g.strokeStyle='#80613e';g.lineWidth=unit*.012;g.beginPath();g.moveTo(x+unit*.08,headY+unit*.01);g.lineTo(x+unit*.13,headY+unit*.055);g.lineTo(x+unit*.08,headY+unit*.065);g.stroke();
 g.beginPath();g.moveTo(x+unit*.055,headY+unit*.12);g.lineTo(x+unit*.09,headY+unit*.12);g.stroke();
 for(let i=0;i<2;i++){
  const start=[x+unit*(i?.08:.015),y-h*.76],end=targets[i];
  g.beginPath();g.moveTo(...start);g.quadraticCurveTo((start[0]+end[0])/2+unit*.02,(start[1]+end[1])/2+unit*.03,...end);
  g.strokeStyle='#b58c60';g.lineWidth=unit*(i?.08:.055);g.stroke();g.strokeStyle='#eed3a7';g.lineWidth=unit*(i?.05:.03);g.stroke();
 }
 g.restore();return [x+(anchor[0]-x)*facing,anchor[1]];
}
export function text(g,s,x,y,size=48,font='Limelight',color=null,align='center'){g.font=`${size}px "${font}"`;g.textAlign=align;g.textBaseline='middle';g.fillStyle=color||gold(g,x-size*2,y-size,size*4,size*2);g.fillText(s,x,y)}
export function plaque(g,s,x,y,w=800,size=44,p=1){g.save();g.translate(x,y);g.scale(ease(p),1);const h=100;let pts=[[-w/2,-h/2],[-w/2+25,-h/2],[-w/2+25,-h/2-15],[w/2-25,-h/2-15],[w/2-25,-h/2],[w/2,-h/2],[w/2,h/2],[w/2-25,h/2],[w/2-25,h/2+15],[-w/2+25,h/2+15],[-w/2+25,h/2],[-w/2,h/2]];poly(g,pts,C.black,'#191209');g.save();g.scale(.973,.84);line(g,pts,1,0,true);g.restore();text(g,s,0,0,size);g.restore()}
export function backdrop(g,t,kind='night'){let z=g.createLinearGradient(0,0,0,1920);z.addColorStop(0,kind==='night'?'#070a0e':'#0d0b09');z.addColorStop(.6,kind==='night'?'#10231f':'#231b0d');z.addColorStop(1,'#060504');g.fillStyle=z;g.fillRect(0,0,1080,1920);}
export function stars(g,t){for(let i=0;i<90;i++){let x=(i*337.217)%1080,y=(i*179.523)%1100;g.globalAlpha=.18+.18*(1+Math.sin(t*.3+i))/2;if(i%17===0)sparkle(g,x,y,6,1);else {g.fillStyle=C.ivory;g.fillRect(x,y,1.6,1.6)}}g.globalAlpha=1}
export function moon(g,x=820,y=330,r=88){ellipse(g,x,y,r,r,'#c8b77e',false);ellipse(g,x+r*.38,y-r*.16,r*.85,r*.90,'#090e13',false);for(let i=0;i<3;i++){g.beginPath();g.arc(x,y,r+12+i*14,0,tau);g.strokeStyle=`rgba(201,162,75,${.2-i*.04})`;g.lineWidth=.9;g.stroke()}}
export function vignette(g){let z=g.createRadialGradient(540,880,320,540,930,1130);z.addColorStop(0,'rgba(0,0,0,0)');z.addColorStop(1,'rgba(0,0,0,.38)');g.fillStyle=z;g.fillRect(0,0,1080,1920)}
export function camera({x=0,y=2,z=-8,tx=0,ty=2.5,tz=7,f=900,cy=950}={}){let dx=tx-x,dy=ty-y,dz=tz-z,ln=Math.hypot(dx,dy,dz);let forward=[dx/ln,dy/ln,dz/ln],right=[forward[2],0,-forward[0]],rn=Math.hypot(...right);right=right.map(v=>v/rn);let up=[forward[1]*right[2]-forward[2]*right[1],forward[2]*right[0]-forward[0]*right[2],forward[0]*right[1]-forward[1]*right[0]];return (X,Y,Z)=>{let d=[X-x,Y-y,Z-z],depth=d.reduce((a,v,i)=>a+v*forward[i],0);return [540+f*d.reduce((a,v,i)=>a+v*right[i],0)/depth,cy-f*d.reduce((a,v,i)=>a+v*up[i],0)/depth,f/depth]}}
export function ppoly(g,P,pts,base,light){poly(g,pts.map(v=>P(...v).slice(0,2)),base,light)}
// Screen-space orientation must follow the projected radius, not the world angle.
export function projectedRadialAngle(P,x,z){const c=P(0,0,0),q=P(x,0,z);return Math.atan2(q[1]-c[1],q[0]-c[0])+Math.PI/2}
// Decelerate secondary movement through the final phrase, then hold its endpoint.
export function radialMotionTime(t,p){
 if(p<=.72)return t;
 const q=clamp((p-.72)/.20);
 return t/p*(.72+.20*(q-q*q/2));
}
// The stage holds an oblique view before a single cut into plan view.
export function radialTilt(progress,{cut=.328}={}){
 return progress<cut?mix(0,.14,ease(progress/cut)):1;
}
// Keep outer apertures alive while selected inner groups settle open.
export function radialFanOpening(progress,{cut=.328,cycles=11.6625,depth=.28,phase=.39,settle=0}={}){
 if(progress<cut)return 1;
 const pulse=1-depth*.5*(1-Math.cos(tau*cycles*(progress-cut)+phase));
 return mix(pulse,1,clamp(settle));
}
// Polar arrival curves calibrated from visible pivots, independent of story content.
// The ring turns clockwise, adjacent groups cross, then two groups travel inward.
const radialArrivalKeys=[0,2,4,6,8,11,14,16,17,18,20,24,28,32];
const radialClockwise=[33.3,33.1,24,16.7,6,-15.6,-46.8,-73.2,-85.5,-96.5,-114.6,-137.4,-147.3,-150];
const radialCounter=[78.3,77.9,78.5,81.7,87.8,104.1,131.4,157.1,169.6,208.3,188.7,164,153,150];
const radialNearAngle=[-56.7,-57.4,-56.8,-54.3,-49,-34.1,-9.2,14.1,25.4,35.9,53.1,76,87.1,90];
const radialFarAngle=[-101.7,-105.6,-111,-117.6,-127.3,-147.5,-176,-205.8,-211.4,-221.3,-237.3,-258.3,-267.3,-270];
const radialRingRadius=[328,328,330,332,334,340,349,356,360,363,369,376,379,380];
const radialNearRadius=[328,325,321,315,305,282,245,213,198,184,161,132,119,116];
const radialFarRadius=[328,327,326,324,322,314,303,287,285,283,279,266,261,260];
function radialCurve(values,q){
 if(q<=0)return values[0];
 for(let i=1;i<radialArrivalKeys.length;i++)if(q<=radialArrivalKeys[i]){
  const p=(q-radialArrivalKeys[i-1])/(radialArrivalKeys[i]-radialArrivalKeys[i-1]);
  return mix(values[i-1],values[i],p);
 }
 return values.at(-1);
}
export function radialBeat(t,p,index,{bpm=116,count=8}={}){
 const tt=Math.floor(t*12)/12,phase=t>0?p*tt/t:0,step=360/count;
 const openingOrder=(index*(count===12?5:3))%count,delay=.01+openingOrder/Math.max(1,count-1)*.22;
 const bloom=index===0?1:mix(.2,1,ease((phase-delay)/.075));
 const q=145*p-100,resolve=ease(q/32);
 const opening=bloom*radialFanOpening(p,{settle:index<2?resolve:0});
 const seeds=[count-2,count-3,...Array.from({length:count-3},(_,i)=>i),count-1];
 const seed=seeds[index],early=33.3-1.073622*q+seed*step;
 let angle=early,radius=328;
 if(q>=0){
  if(index<2){
   const values=index===0?radialNearAngle:radialFarAngle;
   const originalStart=index===0?-56.7:-101.7;
   const adaptedStart=33.3+seed*step-360;
   angle=radialCurve(values,q)+(adaptedStart-originalStart)*(1-resolve);
   radius=radialCurve(index===0?radialNearRadius:radialFarRadius,q);
  }else{
   angle=seed%2===0?radialCurve(radialClockwise,q)+seed*step:
    radialCurve(radialCounter,q)+(step-45)+(seed-1)*step-(seed===count-1?2*step*clamp(q-17):0);
   radius=radialCurve(radialRingRadius,q);
   if(count!==8){
    const target=90+(index-.5)*step+(index%2?1:-1)*step/6;
    const arrival=ease((q-17)/15),endAngle=seed%2===0?-150+seed*step:150+(step-45)+(seed-1)*step-(seed===count-1?2*step:0);
    const adjusted=target+360*Math.round((endAngle-target)/360);
    angle+=arrival*(adjusted-endAngle);
   }
  }
 }
 return {opening,angle:angle*Math.PI/180,radius:radius*3.6/380,resolve,scale:index===1?mix(1,.87,resolve):1};
}
export function radialFloor(g,P,{radius=5.7,rotation=0}={}){
 const ring=(r)=>Array.from({length:97},(_,i)=>P(Math.cos(i*tau/96)*r,0,Math.sin(i*tau/96)*r));
 path(g,ring(radius),true);g.fillStyle='#080705';g.fill();
 for(let i=0;i<48;i++){
  const a=i*tau/48+rotation,b=(i+1)*tau/48+rotation;
  if(i%2===0){const points=[P(Math.cos(a)*.5,0,Math.sin(a)*.5)];for(let j=0;j<=4;j++){const q=mix(a,b,j/4);points.push(P(Math.cos(q)*radius,0,Math.sin(q)*radius))}points.push(P(Math.cos(b)*.5,0,Math.sin(b)*.5));path(g,points,true);g.fillStyle='#252010';g.fill();}
  line(g,[P(Math.cos(a)*.5,0,Math.sin(a)*.5),P(Math.cos(a)*radius,0,Math.sin(a)*radius)],i%2?1:1.4,0,false,i%2?.65:.9);
 }
 for(const r of [radius*.25,radius*.5,radius*.75,radius])line(g,ring(r),r===radius?2.2:1.2,0,true,.9);
}
export function room(g,t,{live=true,greenUniform=false,dolly=0}={}){
backdrop(g,t,'room');let P=camera({z:-10+dolly*.4,y:3.2,ty:2.8,tz:12,f:1120,cy:840});
ppoly(g,P,[[-7,0,-8],[7,0,-8],[7,0,20],[-7,0,20]],'#0d0c08','#2d271b');
ppoly(g,P,[[-7,0,-8],[-7,9,-8],[-7,9,20],[-7,0,20]],'#20180e','#72562a');
ppoly(g,P,[[7,0,-8],[7,9,-8],[7,9,20],[7,0,20]],'#1a140d','#4a3820');
ppoly(g,P,[[-7,0,20],[7,0,20],[7,9,20],[-7,9,20]],'#110f09','#2e2413');
for(let x=-7;x<=7;x+=1)line(g,[P(x,0,-8),P(x,0,20)],.7,0,false,.4);
for(let z=-7;z<20;z+=1.2){line(g,[P(-7,0,z),P(7,0,z)],.7,0,false,.4)}
// Broad ivory chevron carpet and reflected side wall light, reaching the lens.
ppoly(g,P,[[-2.5,0,-8],[2.5,0,-8],[2.5,0,20],[-2.5,0,20]],'#b8ae95','#e1d6bc');
for(let z=-8;z<20;z+=1.8){ppoly(g,P,[[-2.5,.002,z],[0,.002,z+.55],[2.5,.002,z],[2.5,.002,z+.33],[0,.002,z+.9],[-2.5,.002,z+.33]],'#100e09','#292419')}
for(const side of [-1,1]){line(g,[P(side*2.65,0,-8),P(side*2.65,0,20)],2);for(let z=-4;z<20;z+=3){let X=7*side;for(let k=0;k<4;k++)line(g,[P(X,0,z+k*.13),P(X,8.2,z+k*.13)],1);let q=P(X*.995,4.8,z+.2);fan(g,q[0],q[1],q[2]*.7,1,0,'#8b7039');if(live){glow(g,q[0],q[1],q[2]*2.6,'235,193,106',.26);let ref=P(X*.65,.001,z);g.save();g.globalAlpha=.08;poly(g,[[q[0]-20,q[1]],[q[0]+20,q[1]],[ref[0]+90,ref[1]],[ref[0]-90,ref[1]]],'#b79448','#e7cf82',false);g.restore()}}}
let q=P(0,0,19.9),top=P(0,7.1,19.9);arch(g,q[0],q[1],P(4,0,19.9)[0]-P(-4,0,19.9)[0],q[1]-top[1],5);
for(let z=0;z<20;z+=4){line(g,[P(-7,9,z),P(7,9,z)],1.2)}
let l=P(-6.7,7.7,19.9),r=P(6.7,7.7,19.9);chevrons(g,l[0],l[1],r[0]-l[0],8,12);
return P}
export function gear(g,x,y,r,rot=0,n=18){g.save();g.translate(x,y);g.rotate(rot);let pts=[];for(let i=0;i<n*4;i++){let a=i*tau/(n*4),rr=(i%4===0||i%4===3)?r*.88:r;pts.push([Math.cos(a)*rr,Math.sin(a)*rr])}poly(g,pts,'#644b21','#dcc582');ellipse(g,0,0,r*.72,r*.72,'#15120b');for(let i=0;i<6;i++){g.save();g.rotate(i*tau/6);rect(g,-r*.035,-r*.70,r*.07,r*.58,'#8e7137','#f3d98b');g.restore()}ellipse(g,0,0,r*.18,r*.18,'#80622b');ellipse(g,0,0,r*.055,r*.055,C.black);g.restore()}
export function dial(g,x,y,r,value=.5,label='SIGNAL',t=0){glow(g,x,y,r*1.5,'241,204,113',.08);ellipse(g,x,y,r,r,'#161209');ellipse(g,x,y,r*.94,r*.94,'#0b0a07');for(let i=0;i<=50;i++){let a=Math.PI*.8+i*Math.PI*1.4/50;line(g,[[x+Math.cos(a)*r*.82,y+Math.sin(a)*r*.82],[x+Math.cos(a)*r*(i%5?.88:.94),y+Math.sin(a)*r*(i%5?.88:.94)]],i%5?1:2);if(i%10===0)text(g,String(i*2),x+Math.cos(a)*r*.64,y+Math.sin(a)*r*.64,r*.12,'Poiret One')}
let a=Math.PI*.8+clamp(value)*Math.PI*1.4;poly(g,[[x-5,y+4],[x+Math.cos(a)*r*.78,y+Math.sin(a)*r*.78],[x+5,y-4]],'#bca25c','#fff4d2');ellipse(g,x,y,r*.045,r*.045,C.gold);text(g,label,x,y+r*.35,r*.12,'Josefin Sans',C.ivory)}
export function leaf(g,x,y,size,rot=0,open=1,material={}){g.save();g.translate(x,y);g.rotate(rot);g.scale(Math.max(.01,open),1);poly(g,[[0,0],[-size*.27,-size*.25],[-size*.38,-size*.63],[0,-size],[size*.38,-size*.63],[size*.27,-size*.25]],material.base||'#163f31',material.light||'#6eaa77');line(g,[[0,0],[0,-size]],1.7);for(let i=1;i<5;i++)line(g,[[-size*.27*(1-i/6),-size*i/5],[0,-size*(i/5+.1)],[size*.27*(1-i/6),-size*i/5]],.6);g.restore()}
// Cloth keeps distinct lit and shaded planes instead of fading into near-black lacquer.
function uniformPalette(greenUniform=false){return greenUniform?['#5e9979','#418566','#23634b','#164335']:['#ce4b55','#bc3e45','#9e2a2f','#7e1b28']}
export function garmentPanel(g,points,greenUniform=false){
 const xs=points.map(p=>p[0]),left=Math.min(...xs),right=Math.max(...xs);
 const c=uniformPalette(greenUniform),shade=g.createLinearGradient(left,0,right,0);
 for(const [stop,color] of [[0,c[0]],[.49,c[1]],[.5,c[2]],[1,c[3]]])shade.addColorStop(stop,color);
 g.save();path(g,points,true);g.fillStyle=shade;g.fill();g.restore();
}
// Fabric piping is one warm band; keep the engraved dark undercut on rigid metal only.
export function clothTrim(g,points,w=2){
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const shade=g.createLinearGradient(Math.min(...xs)-w/2,Math.min(...ys),Math.max(...xs)+w/2,Math.max(...ys)+1);
 shade.addColorStop(0,'#dbb974');shade.addColorStop(.55,'#efd394');shade.addColorStop(1,'#c6a15d');
 g.save();path(g,points);g.lineJoin='round';g.lineCap='butt';g.lineWidth=w;g.strokeStyle=shade;g.stroke();g.restore();
}
// Shade each sleeve segment across its width and overlap the rounded elbow seam.
export function clothSleeve(g,points,w,green){
 const colors=uniformPalette(green).map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)continue;
  // Continuous lighting avoids a side swap when an arm passes the key direction.
  const key=(-.8*dy+.6*dx)/length,blend=(key+1)/2;
  g.save();g.translate(...a);g.rotate(Math.atan2(dy,dx)-Math.PI/2);
  const shade=g.createLinearGradient(-w/2,0,w/2,0);
  [0,.49,.5,1].forEach((stop,j)=>{const c=colors[j].map((n,k)=>Math.round(mix(n,colors[3-j][k],blend)));shade.addColorStop(stop,`rgb(${c.join(',')})`)});
  g.beginPath();g.moveTo(0,0);g.lineTo(0,length);g.strokeStyle=shade;g.lineWidth=w;g.lineCap='round';g.stroke();
  const edge=w*.4;
  g.strokeStyle='#e5c582';g.lineWidth=w*.14;g.lineCap='butt';
  g.beginPath();g.arc(0,0,edge,Math.PI,0);g.stroke();
  for(const side of [-1,1]){g.save();g.globalAlpha*=(1+side*key)/2;g.beginPath();g.moveTo(side*edge,0);g.lineTo(side*edge,length);g.stroke();g.restore()}
  g.restore();
 }
}
// Trouser planes retain their fine metallic outer edge.
function sleeve(g,points,w,col,lit){
 if(col===C.burgundy||col===C.emerald){clothSleeve(g,points,w,col===C.emerald);return}
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 g.save();g.lineCap='round';g.lineJoin='round';path(g,points);
 g.strokeStyle='#24180d';g.lineWidth=w+3;g.stroke();
 g.strokeStyle=gold(g,Math.min(...xs),Math.min(...ys),70,180);g.lineWidth=w+1;g.stroke();
 const shade=g.createLinearGradient(Math.min(...xs)-w,0,Math.max(...xs)+w,0);shade.addColorStop(0,lit);shade.addColorStop(.46,col);shade.addColorStop(1,'#173f32');
 g.strokeStyle=shade;g.lineWidth=w-2;g.stroke();g.restore();
}
function glove(g,x,y,angle=0,grip=0){
 g.save();g.translate(x,y);g.rotate(angle);const z=g.createLinearGradient(-7,0,9,0);z.addColorStop(0,'#fff0d0');z.addColorStop(1,'#c9b691');g.fillStyle=z;g.strokeStyle='#ac9154';g.lineWidth=.7;
 g.beginPath();g.moveTo(-6,-5);g.bezierCurveTo(-9,1,-8,12,-3,16);g.quadraticCurveTo(2,20,5,13);g.lineTo(7,4);g.quadraticCurveTo(14,0,9,-4);g.lineTo(5,-7);g.closePath();g.fill();g.stroke();
 g.strokeStyle='rgba(100,70,35,.3)';g.lineWidth=.5;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-4+i*3,5);g.quadraticCurveTo(-5+i*3,11,-2+i*3,14-grip*3);g.stroke()}g.restore();
}
function metalButton(g,x,y,r=2.4){const z=g.createRadialGradient(x-r*.4,y-r*.5,r*.1,x,y,r);z.addColorStop(0,'#fff4d2');z.addColorStop(.3,'#e8cf85');z.addColorStop(.75,'#b29347');z.addColorStop(1,'#6f5220');ellipse(g,x,y,r,r,z,false)}
function characterNeck(g,profile=false){
 g.save();g.beginPath();g.moveTo(-9,-583);g.lineTo(12,-583);g.lineTo(12,-548);g.bezierCurveTo(12,-535,-9,-535,-9,-548);g.closePath();
 g.fillStyle='#f0c399';g.fill();g.clip();
 g.fillStyle='#bc8865';g.fillRect(profile?0:4,-584,14,56);
 g.fillStyle='#f7d596';g.fillRect(-8,-584,2.2,56);g.restore();
}
function walkingProfile(g,x,y,h,t,direction,greenUniform){
 const tt=Math.floor(t*12)/12,phase=tt*7,stride=Math.sin(phase),col=greenUniform?'#1D6B57':'#8E1B2E',lit=greenUniform?'#569371':'#D4485C';
 g.save();g.translate(x,y);g.scale((direction<0?-1:1)*h/700,h/700);g.translate(0,-Math.abs(stride)*7);
 glow(g,0,-2,90,'0,0,0',.5);
 for(const side of [-1,1]){
  const swing=stride*side,hip=[side*9,-326],knee=[swing*59,-171-Math.max(0,swing)*33],foot=[swing*101,-10-Math.max(0,swing)*20];
  sleeve(g,[hip,knee,foot],25,'#2b2233','#625160');
  poly(g,[[foot[0]-11,foot[1]-5],[foot[0]+14,foot[1]-6],[foot[0]+29,foot[1]+8],[foot[0]-11,foot[1]+8]],'#0b0908','#b59857');
 }
 const arm=(side)=>[[0,-532],[-stride*side*44,-432],[stride*-side*89+10,-346]];
 sleeve(g,arm(-1),19,col,lit);glove(g,...arm(-1)[2],0);
 garmentPanel(g,[[-25,-548],[24,-551],[33,-493],[25,-430],[33,-333],[-20,-322],[-33,-430]],greenUniform);
 clothTrim(g,[[-25,-548],[-32,-430],[-20,-322],[33,-333]],2.1);
 if(!greenUniform)for(let i=0;i<6;i++)metalButton(g,24,-512+i*29,2.2);
 characterNeck(g,true);
 sleeve(g,arm(1),20,col,lit);glove(g,...arm(1)[2],0);
 g.save();g.translate(5,-606);g.scale(.72,.78);
 // A continuous forehead, nose, mouth and jaw silhouette, facing the travel direction.
 g.fillStyle='#eab88c';g.beginPath();g.moveTo(-31,-42);g.bezierCurveTo(-19,-83,29,-78,36,-44);g.lineTo(40,-13);g.lineTo(55,0);g.quadraticCurveTo(56,6,39,7);g.lineTo(40,29);g.quadraticCurveTo(32,48,11,52);g.lineTo(-17,30);g.closePath();g.fill();
 poly(g,[[-31,-42],[-3,-53],[5,24],[11,52],[-17,30]],'#a5684a','#bd8663',false);
 g.fillStyle='#0b0807';g.beginPath();g.moveTo(-29,30);g.bezierCurveTo(-55,-20,-38,-78,2,-83);g.bezierCurveTo(26,-84,42,-64,38,-45);g.quadraticCurveTo(10,-61,-8,-32);g.lineTo(-10,20);g.closePath();g.fill();
 line(g,[[-33,-12],[-30,-45],[-8,-68],[20,-70]],1);
 const blink=tt%4.3>.13&&tt%4.3<.3;line(g,[[20,-10],[29,blink?-8:-14],[37,-10]],1.5);if(!blink)ellipse(g,30,-9,3,4,'#291d15',false);line(g,[[18,-24],[36,-26]],2.4);line(g,[[28,28],[39,27]],1.8);
 if(greenUniform){poly(g,[[-37,-69],[-27,-103],[22,-102],[36,-69]],'#1D6B57','#4e8d6a',false);clothTrim(g,[[-37,-69],[-27,-103],[22,-102],[36,-69]],1.5);ellipse(g,3,-68,48,6,'#275c43')}
 else{g.strokeStyle=gold(g,-50,-85,100,100);g.lineWidth=4;g.beginPath();g.arc(-3,-12,47,Math.PI,Math.PI*1.95);g.stroke();ellipse(g,-18,-4,9,20,'#57401c');ellipse(g,-18,-4,6,15,'#100e0a')}
 g.restore();g.restore();
}
function foreheadSweepArm(progress){
 const q=clamp(progress),upperLength=Math.hypot(16,108),lowerLength=Math.hypot(8,102);
 const dx=35-48,dy=-638+540,d=Math.hypot(dx,dy);
 const finalUpper=Math.atan2(dy,dx)+Math.acos((upperLength**2+d*d-lowerLength**2)/(2*upperLength*d))+tau;
 const finalElbow=[48+Math.cos(finalUpper)*upperLength,-540+Math.sin(finalUpper)*upperLength];
 const finalLower=Math.atan2(-638-finalElbow[1],35-finalElbow[0])+tau;
 // The elbow crosses the chest, rises over the head, then opens to the touch.
 // Fixed segment lengths keep the broad sweep attached without stretching.
 const keys=[[0,Math.atan2(108,16),Math.atan2(102,8)],[.36,210*Math.PI/180,110*Math.PI/180],
  [.58,250*Math.PI/180,145*Math.PI/180],[.77,285*Math.PI/180,180*Math.PI/180],[1,finalUpper,finalLower]];
 let i=1;while(i<keys.length-1&&q>keys[i][0])i++;
 const a=keys[i-1],b=keys[i],u=(q-a[0])/(b[0]-a[0]);
 const upper=mix(a[1],b[1],u),lower=mix(a[2],b[2],u);
 const elbow=[48+Math.cos(upper)*upperLength,-540+Math.sin(upper)*upperLength];
 return [[48,-540],elbow,[elbow[0]+Math.cos(lower)*lowerLength,elbow[1]+Math.sin(lower)*lowerLength]];
}
function foreheadGesture(t,delayFrames=0){
 const frame=Math.floor(t*24+1e-7)-delayFrames;
 // Fast sweeps use distinct poses on adjacent frames; the contact is held.
 const keys=[[16,0],[17,.15],[18,.36],[19,.58],[20,.77],[21,1],[31,1],
  [32,.88],[33,.77],[34,.58],[35,.36],[36,.15],[37,0]];
 if(frame<=keys[0][0]||frame>=keys.at(-1)[0])return 0;
 let i=1;while(frame>keys[i][0])i++;
 const a=keys[i-1],b=keys[i];return mix(a[1],b[1],(frame-a[0])/(b[0]-a[0]));
}
export function reactionActing(t,p,{beat='concern',greenUniform=false}={}){
 const tt=Math.floor(t*12)/12,q=t>0?p*tt/t:0,ramp=(a,d)=>ease((tt-a)/d),phase=(a,d)=>ease((q-a)/d);
 const fastTime=Math.floor(t*24+1e-7)/24,fastRamp=(a,d)=>ease((fastTime-a)/d);
 const state={pose:'stand',emotion:'calm',gaze:0,action:0,headTilt:0,bodyLean:0,expression:1};
 if(beat==='listen'){
  const up=ramp(.25,.3),release=phase(.65,.15);
  return {...state,pose:'listen',emotion:q<.2?'calm':q<.6?'surprise':'worry',action:up*(1-release),
   gaze:mix(-.35,.65,phase(.18,.13))-.9*release,headTilt:.12*up-.19*release,bodyLean:-.025*up+.04*release};
 }
 if(beat==='concern'||beat==='remember'){
  const remembering=beat==='remember',delayFrames=remembering?6:0,delay=delayFrames/24;
  const up=fastRamp(delay+14/24,4/24),release=fastRamp(delay+31/24,6/24);
  const emotion=remembering?(tt<.4?'calm':tt<1.5?'surprise':tt<2.25?'worry':'calm'):(fastTime<22/24?'surprise':fastTime<26/24?'worry':'determined');
  return {...state,pose:'consider',emotion,action:foreheadGesture(t,delayFrames),foreheadSweep:true,
   gaze:.45-.95*phase(.21,.12)+.85*phase(.49,.1)-.35*release,
   headTilt:.09*up-.17*fastRamp(delay+32/24,6/24)+.11*release,bodyLean:-.025*up+.015*release};
 }
 if(beat==='discover'){
  const turn=phase(.18,.12),point=phase(.48,.12),settle=phase(.8,.15);
  return {...state,emotion:q<.18?'calm':q<.38?'surprise':'determined',
   gaze:mix(-.3,.9,turn),headTilt:-.06+.13*turn-.025*settle,bodyLean:.05*turn,
   handTargets:[null,[mix(70,165,point),mix(-334,-510,point)]],elbowSides:[1,1]};
 }
 if(beat==='relief'){
  const tip=greenUniform?foreheadGesture(t,-8):ramp(.32,.28)*(1-ramp(1.15,.32)),look=phase(.25,.14),returnLook=phase(.69,.15);
  return {...state,pose:greenUniform?'consider':'listen',emotion:tt<.24?'surprise':tt<.75||(q>.62&&q<.80)?'relief':'smile',
   action:greenUniform?tip:1-ramp(.7,.4),foreheadSweep:greenUniform,gaze:.45-.9*look+.45*returnLook,
   headTilt:.09*tip-.035*look+.04*returnLook,bodyLean:(greenUniform?-.025:.025)*tip-.018*look+.018*returnLook};
 }
 return state;
}
export function person(g,x,y,h,t,{greenUniform=false,pose='stand',emotion='calm',gaze=0,back=false,turn=0,action=1,headTilt=0,handTargets=null,bodyLean=0,planted=false,elbowSides=null,expression=0,foreheadSweep=false}={}){
 if(h<=0)return;
 if(pose==='walk'&&turn){walkingProfile(g,x,y,h,t,turn,greenUniform);return;}
 const tt=Math.floor(t*12)/12,phase=tt*7,walking=pose==='walk',walk=walking?Math.sin(phase):0;
 const effort=pose==='crank'?Math.sin(tt*3):0,breath=Math.sin(tt*1.8)*1.1,col=greenUniform?'#1D6B57':'#8E1B2E',lit=greenUniform?'#569371':'#D4485C';
 const rootX=planted?0:walking?Math.sin(phase)*3:effort*4,rootY=planted?0:walking?-Math.abs(Math.sin(phase))*9:breath;
 g.save();g.translate(x,y);g.scale(h/700,h/700);g.translate(rootX,rootY);
 // Grounding, trouser planes and softly articulated knees.
 glow(g,0,-2,90,'0,0,0',.5);
 for(const side of [-1,1]){let hip=[side*20,-337],knee=[side*24+walk*53*side,-174-Math.max(0,walk*side)*25],foot=[side*26+walk*84*side,-12-Math.max(0,walk*side)*7];
 sleeve(g,[hip,knee,foot],25,'#2b2233','#625160');
 g.save();g.translate(...foot);g.fillStyle='#0b0908';g.strokeStyle='#b59857';g.lineWidth=.8;g.beginPath();g.moveTo(-12,0);g.quadraticCurveTo(-12,-7,4,-8);g.quadraticCurveTo(13,-7,22,8);g.lineTo(-12,8);g.closePath();g.fill();g.stroke();g.restore();}
 // The upper body leans about the pelvis while planted feet stay on the floor.
 g.save();if(bodyLean){g.translate(0,-337);g.rotate(bodyLean);g.translate(0,337)}
 // The neck overlaps the collar with a rounded lower edge and lit side plane.
 garmentPanel(g,[[-49,-552],[49,-552],[44,-491],[35,-430],[37,-337],[0,-318],[-37,-337],[-35,-430],[-44,-491]],greenUniform);
 clothTrim(g,[[-48,-548],[-34,-431],[-36,-336],[0,-319],[37,-336]],2.1);
 if(greenUniform){garmentPanel(g,[[-25,-522],[25,-522],[32,-339],[-32,-339]],true);clothTrim(g,[[-24,-522],[-35,-550]],3);clothTrim(g,[[24,-522],[35,-550]],3);clothTrim(g,[[-26,-402],[-26,-368],[26,-368],[26,-402]],.8);for(const s of [-1,1])metalButton(g,s*24,-514,3.0)}
 else{clothTrim(g,[[0,-537],[0,-326]],4.2);for(let row=0;row<6;row++)for(let s of [-1,1])metalButton(g,s*(19-row*.7),-511+row*29,3.4);poly(g,[[-35,-551],[-10,-554],[0,-533],[-22,-538]],'#6a1928','#b74151',false);poly(g,[[35,-551],[10,-554],[0,-533],[22,-538]],'#6a1928','#b74151',false);clothTrim(g,[[-35,-551],[-10,-554],[0,-533],[10,-554],[35,-551]],2.1);}
 characterNeck(g);
 for(const side of [-1,1]){g.save();g.translate(side*45,-550);g.rotate(side*.17);path(g,[[-14,-5],[15,-5],[13,6],[-14,3]],true);g.fillStyle=gold(g,-14,-5,29,11);g.fill();g.restore()}
 let left=[[-48,-540],[-64,-432],[-72,-330]],right=[[48,-540],[64,-432],[72,-330]];
 if(pose==='listen'){const q=ease(action);right=[[48,-540],[mix(64,105,q),mix(-432,-527,q)],[mix(72,46,q),mix(-330,-599,q)]];left=[[-48,-540],[-74,-447],[-47,-393]]}
 if(pose==='reach'){right=[[48,-540],[110,-503],[181,-502+Math.sin(tt*2)*2]];left=[[-48,-540],[-71,-443],[-40,-399]]}
 if(pose==='crank'){let a=tt*3;right=[[48,-540],[105,-465],[132+34*Math.cos(a),-410+34*Math.sin(a)]];left=[[-48,-540],[-74,-451],[-49,-398]]}
 if(pose==='lift'){left=[[-48,-540],[-94,-591],[-84,-683]];right=[[48,-540],[94,-591],[84,-683]]}
 if(pose==='plant'){right=[[48,-540],[93,-448],[20,-388]];left=[[-48,-540],[-93,-448],[-20,-388]]}
 if(pose==='consider'){const q=ease(action);right=foreheadSweep?foreheadSweepArm(action):[[48,-540],[mix(64,105,q),mix(-432,-596,q)],[mix(72,35,q),mix(-330,-638,q)]];left=[[-48,-540],[-74,-447],[-47,-393]]}
 if(walking){left=[[-48,-540],[-65+walk*38,-438],[-72+walk*80,-337]];right=[[48,-540],[65-walk*38,-438],[72-walk*80,-337]]}
 if(handTargets){for(let i=0;i<2;i++){if(!handTargets[i])continue;let arm=i?right:left,target=handTargets[i];if(bodyLean||planted){const dx=target[0]-rootX,dy=target[1]-rootY+337,cs=Math.cos(bodyLean),sn=Math.sin(bodyLean);target=[dx*cs+dy*sn,-dx*sn+dy*cs-337]}arm[2]=target;let dx=target[0]-arm[0][0],dy=target[1]-arm[0][1],len=Math.hypot(dx,dy),bend=Math.sqrt(Math.max(0,105**2-len**2/4)),bendSide=elbowSides?.[i]??(i?-1:1);arm[1]=[(target[0]+arm[0][0])/2-dy/len*bend*bendSide,(target[1]+arm[0][1])/2+dx/len*bend*bendSide]}}
 const drawArm=arm=>{sleeve(g,arm,20,col,lit);let a=Math.atan2(arm[2][1]-arm[1][1],arm[2][0]-arm[1][0])-Math.PI/2;g.save();g.translate(...arm[2]);g.rotate(a);g.fillStyle=gold(g,-10,-6,20,4);g.fillRect(-10,-6,20,4);g.restore();glove(g,arm[2][0]+Math.sin(-a)*8,arm[2][1]+Math.cos(a)*8,a,pose==='crank'?1:0)};
 drawArm(left);if(pose!=='consider')drawArm(right);
 g.save();g.translate(gaze*3,-607);g.rotate(headTilt+(emotion==='worry'?-0.06:0)+Math.sin(tt*.85)*.012);g.scale(.72,.78);
 if(back){ellipse(g,0,-13,44,62,'#10100b',false)}else{
 // A curved cheek/jaw silhouette contains one hard directional shadow plane.
 const facePath=()=>{g.beginPath();g.moveTo(-42,-24);g.bezierCurveTo(-45,-62,-24,-78,1,-76);g.bezierCurveTo(32,-76,45,-52,44,-18);g.bezierCurveTo(43,18,29,48,6,53);g.quadraticCurveTo(-2,56,-15,49);g.bezierCurveTo(-35,38,-42,13,-42,-24);g.closePath()};
 facePath();g.fillStyle='#f0c399';g.fill();
 g.save();g.clip();path(g,[[6,-80],[60,-80],[60,80],[16,80],[6,-15]],true);g.fillStyle='#bc8865';g.fill();g.restore();
 g.save();facePath();g.clip();g.beginPath();g.moveTo(-42,-20);g.bezierCurveTo(-43,15,-27,46,-8,52);g.strokeStyle='#ffe2ab';g.lineWidth=3;g.stroke();g.restore();
 // Ears, hair cap and two engraved lit-edge strands.
 for(const side of [-1,1]){ellipse(g,side*40,-9,4.7,15,side<0?'#d7a581':'#a86e50',false)}
 g.fillStyle='#0b0807';g.beginPath();g.moveTo(-41,15);g.bezierCurveTo(-54,-6,-48,-64,-23,-79);g.bezierCurveTo(1,-98,37,-81,46,-52);g.lineTo(42,-12);g.quadraticCurveTo(33,-42,14,-54);g.quadraticCurveTo(-7,-49,-25,-29);g.lineTo(-32,14);g.closePath();g.fill();
 for(let k=0;k<2;k++){g.strokeStyle=k?'#64512d':'#8c7846';g.lineWidth=.8;g.beginPath();g.moveTo(-42+k*4,-5);g.bezierCurveTo(-46,-48,-24,-83,16,-77+k*4);g.stroke()}
 g.strokeStyle='#4c3024';g.lineWidth=1.8;g.lineCap='round';g.beginPath();g.moveTo(-40,8);g.bezierCurveTo(-36,34,-21,50,6,54);g.bezierCurveTo(25,50,39,28,41,8);g.stroke();
 let blink=(tt%4.3)>.13&&(tt%4.3)<.30,eyeY=-7;
 for(const side of [-1,1]){let ex=side*18+gaze*2;
 g.strokeStyle='#28170f';g.lineWidth=1.8;g.beginPath();
 if(blink||emotion==='relief'){g.moveTo(ex-9,eyeY);g.quadraticCurveTo(ex,eyeY-5,ex+9,eyeY);g.stroke()}
 else {const narrow=emotion==='determined'?clamp(expression):0,opening=emotion==='surprise'?1.12:emotion==='determined'?mix(.72,.22,narrow):1,lower=mix(6,1.8,narrow);g.fillStyle='#fff0d4';g.moveTo(ex-10,eyeY);g.bezierCurveTo(ex-5,eyeY-10*opening,ex+5,eyeY-10*opening,ex+10,eyeY);g.quadraticCurveTo(ex,eyeY+lower,ex-10,eyeY);g.fill();
 if(expression>0){g.save();g.clip();ellipse(g,ex+gaze*3,eyeY-1,3.7,4,'#291d15',false);ellipse(g,ex+gaze*3-1,eyeY-3,1.1,1.2,C.ivory,false);g.restore()}
 g.beginPath();g.moveTo(ex-10,eyeY);g.bezierCurveTo(ex-5,eyeY-10*opening,ex+5,eyeY-10*opening,ex+10,eyeY);g.lineWidth=2.9;g.lineCap='round';g.stroke();
 if(expression<=0){ellipse(g,ex+gaze*3,eyeY-1,3.7,4,'#291d15',false);ellipse(g,ex+gaze*3-1,eyeY-3,1.1,1.2,C.ivory,false)}
 g.beginPath();g.moveTo(ex-6,eyeY+lower*.5);g.quadraticCurveTo(ex,eyeY+lower*.8,ex+6,eyeY+lower*.4);g.lineWidth=1.5;g.strokeStyle='#b98260';g.stroke();g.strokeStyle='#28170f';}
 let worry=emotion==='worry'?-side*5:emotion==='determined'?side*mix(4,6.5,clamp(expression)):0,raise=emotion==='surprise'?5:0;g.lineCap='round';g.lineWidth=3.1+.7*clamp(expression);g.beginPath();g.moveTo(ex-10,eyeY-20+worry-raise);g.quadraticCurveTo(ex,eyeY-24-raise,ex+9,eyeY-20-worry-raise);g.stroke();}
 g.strokeStyle='#85543a';g.lineWidth=1.7;g.beginPath();g.moveTo(3,-20);g.lineTo(9,13);g.quadraticCurveTo(5,17,-1,15);g.stroke();
 if(emotion==='surprise'){ellipse(g,3,32,4.8,7.5,'#843b2c',false);g.strokeStyle='#b67452';g.lineWidth=1.2;g.stroke()}
 else if(expression>0&&(emotion==='smile'||emotion==='relief')){
  g.beginPath();g.moveTo(-7,31);g.quadraticCurveTo(3,34,13,30);g.quadraticCurveTo(4,44,-7,31);g.closePath();g.fillStyle='#713326';g.fill();
  g.save();g.clip();g.beginPath();g.moveTo(-7,31);g.quadraticCurveTo(3,34,13,30);g.lineWidth=2;g.strokeStyle=C.ivory;g.stroke();g.restore();
 }
 else{g.strokeStyle='#824734';g.lineWidth=2.5;g.beginPath();g.moveTo(-6,32);g.quadraticCurveTo(2,emotion==='smile'||emotion==='relief'?41:emotion==='worry'?26:32,12,31);g.stroke();}
 }
 if(greenUniform){g.save();g.rotate(-.16);poly(g,[[-42,-68],[-32,-104],[26,-104],[37,-68]],'#1D6B57','#4e8d6a',false);clothTrim(g,[[-42,-68],[-32,-104],[26,-104],[37,-68]],1.5);ellipse(g,0,-68,47,7,'#275c43');clothTrim(g,[[-34,-96],[29,-96]],2);g.restore()}
 else {g.strokeStyle=gold(g,-60,-80,120,100);g.lineWidth=4;g.beginPath();g.arc(0,-12,49,Math.PI,0);g.stroke();for(const side of [-1,1]){ellipse(g,side*45,-6,6.5,19,'#57401c');ellipse(g,side*46,-6,4.2,14,'#100e0a')}}
 g.restore();if(pose==='consider')drawArm(right);g.restore();g.restore();
}

// A cylindrical brass conduit with a wall shadow and a transverse highlight.
export function brassTube(g,points,width){
 if(points.length<2||width<=0)return;
 g.save();g.lineJoin='round';g.lineCap='butt';
 g.translate(13,15);g.filter='blur(7px)';path(g,points);g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=width+7;g.stroke();g.filter='none';g.translate(-13,-15);
 path(g,points);g.strokeStyle='#b8a069';g.lineWidth=width+2;g.stroke();
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length===0)continue;const nx=-dy/length,ny=dx/length;
  const shade=g.createLinearGradient(a[0]-nx*width/2,a[1]-ny*width/2,a[0]+nx*width/2,a[1]+ny*width/2);
  for(const [stop,color] of [[0,'#584322'],[.2,'#af9458'],[.38,'#f1dfaa'],[.55,'#a58b4f'],[1,'#302717']])shade.addColorStop(stop,color);
  path(g,[a,b]);g.strokeStyle=shade;g.lineWidth=width;g.stroke();
 }
 g.restore();
}
