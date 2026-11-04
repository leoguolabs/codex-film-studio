import {hash,line,rr,text,oval,path,W,H,clamp} from './primitives.mjs';
import {brush,brushArc,blot} from './brush.mjs';
import {blueprintObject} from './blueprint.mjs';
import {pixelLandscape} from './pixel.mjs';
import {terminalObject} from './terminal.mjs';
export const palettes={
 crayon:{paper:'#f6f0dc',ink:'#34446c',hero:'#80a7d9',accent:'#dc5940',ground:'#739b68',object:'#f3c65e'},
 ink:{paper:'#eee9dc',ink:'#282c2d',hero:'#a7a7a0',accent:'#c34834',ground:'#b4b2a7',object:'#777d78'},
 terminal:{paper:'#120e08',ink:'#ffd57a',hero:'#ffb344',accent:'#fff3bc',ground:'#4a2d0e',object:'#e99f31'},
 riso:{paper:'#faf0d5',ink:'#265d9e',hero:'#f06487',accent:'#e92d69',ground:'#6eaf97',object:'#f0c343'},
 pixel:{paper:'#18264c',ink:'#0b1329',hero:'#46b3c5',accent:'#fa6671',ground:'#6a536a',object:'#f8cc69'},
 blueprint:{paper:'#234779',ink:'#e1eff6',hero:'#2b5180',accent:'#ee665a',ground:'#234779',object:'#234779'},
 swiss:{paper:'#f6f4ec',ink:'#171c1b',hero:'#171c1b',accent:'#e30613',ground:'#d4d3cb',object:'#e30613'},
 paper:{paper:'#efe0c8',ink:'#392e43',hero:'#d97549',accent:'#cb3c45',ground:'#688c79',object:'#e9b953'},
 woodcut:{paper:'#eadfbc',ink:'#253f3c',hero:'#707d63',accent:'#ad4831',ground:'#73836a',object:'#b19663'}
};
export function background(g,m,createCanvas,cache){
 const p=palettes[m];g.fillStyle=p.paper;g.fillRect(0,0,W,H);
 if(m==='riso'){
  line(g,[[75,0],[75,785]],p.ink,2);line(g,[[458,0],[458,785]],p.ink,2);
  for(let [x,y,r]of [[-9,339,91],[524,294,105]]){oval(g,x,y,r,r,'#187fa5',null);oval(g,x+13,y+13,r*.67,r*.67,'#65a55b',null);oval(g,x+20,y+9,r*.61,r*.61,'#ee648a',null);for(let i=0;i<9;i++)oval(g,x+(hash(i)-.5)*r,y+(hash(i+3)-.5)*r,2,2,'#f1c536',null)}
 }
 if(m==='terminal'){
  const glow=g.createRadialGradient(260,530,20,270,480,620);glow.addColorStop(0,'#211509');glow.addColorStop(1,'#050301');g.fillStyle=glow;g.fillRect(0,0,W,H);
  text(g,'SYSTEM / READY',34,212,16,p.ink,null,0,'monospace','left');text(g,'[ ONE ACTION ]',34,242,13,p.ink,null,0,'monospace','left');
  for(let y=0;y<H;y+=4){g.fillStyle='#0003';g.fillRect(0,y,W,1)}rr(g,25,280,490,480,2,null,p.ink,2);return;
 }
 if(m==='blueprint'){
  let wash=cache.get('blueprint-paper');
  if(!wash){wash=createCanvas(W,H);const q=wash.getContext('2d');
   for(let y=0;y<H;y++){q.fillStyle=`rgba(130,163,196,${.008+.015*hash(y/7)})`;q.fillRect(0,y,W,1)}
   for(let i=0;i<18000;i++){q.fillStyle=i%2?'#cedced08':'#0b173b0a';q.fillRect(hash(i*17)*W,hash(i*11)*H,1+hash(i)*2,1)}
   cache.set('blueprint-paper',wash)}g.drawImage(wash,0,0);
  for(let x=0;x<W;x+=18)line(g,[[x,0],[x,H]],x%90===0?'#9dbde11a':'#9dbde10a',1);
  for(let y=0;y<H;y+=18)line(g,[[0,y],[W,y]],y%90===0?'#9dbde11a':'#9dbde10a',1);
  line(g,[[493,358],[493,785]],'#e1eff680',.65);
  for(let i=0;i<7;i++){const y=370+i*65;line(g,[[488,y],[498,y]],'#e1eff680',.65);text(g,String(7-i),506,y,10,'#e1eff6a0',null,0,'monospace')}
  return;
 }
 if(m==='swiss'){
  for(let x=35;x<W;x+=39)line(g,[[x,230],[x,760]],'#c6c4bc',.6);
  for(let y=230;y<780;y+=39)line(g,[[35,y],[505,y]],'#c6c4bc',.6);
  return;
 }
 if(m==='pixel'){pixelLandscape(g,hash);return}
 let key='texture-'+m,tex=cache.get(key);
 if(!tex){tex=createCanvas(W,H);let q=tex.getContext('2d');
  for(let i=0;i<14000;i++){let x=hash(i*11)*W,y=hash(i*7)*H;q.fillStyle=i%2?'#4a392310':'#ffffff22';q.fillRect(x,y,.5+hash(i)*1.5,.7+hash(i*3)*1.5)}
  if(m==='crayon'||m==='woodcut')for(let i=0;i<1600;i++){let x=hash(i*7)*W,y=hash(i*13)*H;line(q,[[x,y],[x+4+hash(i)*13,y-3]],'#6858390b',1)}
  cache.set(key,tex);
 }g.drawImage(tex,0,0);
}

// Indexed colours remove the antialiased fringe before nearest-neighbour enlargement.
export const pixelPalette=['#101025','#1c1e39','#424782','#777db8','#b4b7dc','#f4d2a2','#e35851','#ed8d3c','#53b3c4','#b6ded7','#f4ecc9','#895f53','#a7a0a1','#6b667f','#dd8094','#fffaf0'];
const pixelRGB=pixelPalette.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
export function indexPixelBuffer(g){
 const img=g.getImageData(0,0,g.canvas.width,g.canvas.height),d=img.data;
 for(let i=0;i<d.length;i+=4){
  let best=pixelRGB[0],distance=Infinity;
  for(const c of pixelRGB){const v=2*(d[i]-c[0])**2+3*(d[i+1]-c[1])**2+(d[i+2]-c[2])**2;if(v<distance){distance=v;best=c}}
  d[i]=best[0];d[i+1]=best[1];d[i+2]=best[2];
 }
 g.putImageData(img,0,0);
}
export function finish(g,m,createCanvas,cache){
 if(m==='crayon'){
  let tex=cache.get('wax');if(!tex){tex=createCanvas(W,H);let q=tex.getContext('2d');for(let i=0;i<18000;i++){q.fillStyle=i%3?'#fff9':'#efe7ce88';let x=hash(i*7)*W,y=hash(i*3)*H;q.fillRect(x,y,1+hash(i)*2,.7+hash(i*2)*2)}cache.set('wax',tex)}g.globalAlpha=.38;g.drawImage(tex,0,0);g.globalAlpha=1;
 }
 if(m==='riso'){g.save();g.globalAlpha=.16;g.fillStyle='#2461a5';for(let y=290;y<770;y+=8)for(let x=25;x<515;x+=8){g.beginPath();g.arc(x+(y%16?4:0),y,1.2,0,7);g.fill()}g.restore()}
 if(m==='woodcut'){g.save();g.globalAlpha=.16;for(let y=300;y<790;y+=5)line(g,[[20,y],[520,y-10]],'#efe2b9',1);g.restore()}
 if(m==='terminal'){g.fillStyle='#0003';for(let y=0;y<H;y+=4)g.fillRect(0,y,W,1)}
}
export function mediumObject(g,m,x,y,scale,kind,variant=0){
 const p=palettes[m];g.save();g.translate(x,y);g.scale(scale,scale);let lw=m==='blueprint'?2:4;
 if(m==='terminal'&&terminalObject(g,kind,p)){g.restore();return}
 if(m==='blueprint'&&blueprintObject(g,kind,p)){g.restore();return}
 const rect=(a,b,w,h,c=p.object,r=5)=>rr(g,a,b,w,h,r,c,p.ink,lw), el=(a,b,rx,ry,c=p.object)=>oval(g,a,b,rx,ry,c,p.ink,lw);
 if(m==='ink'){
  if(['milk','water','bucket','pot'].includes(kind)){
   path(g,[[-37,-23],[37,-23],[26,35],[-26,35]],'#c6c7b9',null);
   brush(g,[[-37,-23],[-26,35],[26,35],[37,-23]],6,91);brushArc(g,0,-23,37,10,0,6.28,4,92);brushArc(g,0,-17,29,29,Math.PI,Math.PI*2,5,93);
   brush(g,[[-23,-12],[-18,23]],9,94,'#8d9487');
  }else if(['cream','icing','dough','crumb','puddle','cookie'].includes(kind)){
   blot(g,0,5,kind==='crumb'?12:48,kind==='crumb'?9:19,101);
   for(let i=0;i<6;i++)blot(g,-39+hash(i+13)*78,-3+hash(i+7)*21,8+hash(i)*10,9,110+i);
  }else if(kind==='stick'||kind==='stake'){
   brush(g,[[-65,1],[-5,-3],[64,0]],13,120);brush(g,[[-64,1],[60,-2]],4,121,'#9b9a80');
  }else if(kind==='tree'||kind==='flower'){
   brush(g,[[0,34],[0,-62]],8,123);for(let i=0;i<5;i++){let a=i*2.4;brush(g,[[0,10],[Math.cos(a)*30,-45+Math.sin(a)*24]],3,124+i);blot(g,Math.cos(a)*30,-45+Math.sin(a)*24,27,18,129+i)}
  }else if(kind==='egg'||kind==='seed'){
   brushArc(g,0,-8,kind==='egg'?24:15,kind==='egg'?33:24,0,6.28,5,122);brushArc(g,3,-7,15,26,-1.2,.9,8,125,'#9ca08e');
  }else{
   path(g,[[-48,-25],[46,-29],[49,24],[-43,27]],'#c9c9b9',null);brush(g,[[-48,-25],[46,-29],[49,24],[-43,27],[-48,-25]],6,131);brush(g,[[-33,-13],[30,-16]],7,133,'#7d8677');
  }g.restore();return;
 }
 if(m==='terminal'){const chars={cake:['   ___   ',' _|###|_ ','|#######|','|_______|'],egg:[' /‾‾\\ ','| () |',' \\__/ '],tree:['  /\\  ',' /++\\ ','/++++\\','  ||  '],pot:[' \\~~~~/ ','  \\__/  '],box:[' +----+ ',' | [] | ',' +----+ ']};let rows=chars[kind]||['  ____  ',' /====\\ ','|======|',' \\____/ '];rows.forEach((s,i)=>text(g,s,0,i*18-30,19,p.ink,null,0,'monospace'));g.restore();return}
 if(['cake','cookie','bread','dough','cream','icing','crumb'].includes(kind)){
  if(kind==='cake'){rect(-54,-20,108,46);el(0,-20,54,15,'#fff1ce');for(let i=-40;i<=40;i+=20)el(i,-10,8,11,m==='ink'?p.hero:'#f18999');rect(-36,-63,72,40);el(0,-63,36,11,'#fff1ce');el(0,-80,9,9,p.accent)}
  else if(kind==='cookie'||kind==='crumb'){el(0,0,kind==='crumb'?13:39,kind==='crumb'?10:32);for(let i=0;i<8;i++)el(Math.cos(i*2.4)*24,Math.sin(i*2.4)*18,3,3,p.ink)}
  else {el(0,0,47,kind==='bread'?28:20);if(kind==='bread')for(let x=-25;x<30;x+=20)line(g,[[x,-20],[x-8,-2]],p.paper,4)}
 }else if(kind==='egg'||kind==='seed'){el(0,-8,kind==='egg'?24:15,kind==='egg'?33:24,kind==='egg'?(m==='pixel'?'#f3e6c4':p.paper):p.object);line(g,[[-8,-25],[-14,-12]],'#fff8',4)}
 else if(['flour','soil','compost'].includes(kind)){path(g,[[-38,22],[-29,-41],[23,-47],[39,21]],p.paper,p.ink,lw);rr(g,-26,-22,52,29,2,p.object,p.ink,2);text(g,kind==='flour'?'F':'S',0,-7,23,p.ink,null)}
 else if(['milk','water','bucket','pot'].includes(kind)){path(g,[[-37,-23],[37,-23],[26,35],[-26,35]],p.object,p.ink,lw);el(0,-23,37,10,m==='ink'?p.hero:'#66b6d2');if(kind!=='pot'){g.beginPath();g.arc(0,-16,29,Math.PI,Math.PI*2);g.strokeStyle=p.ink;g.lineWidth=4;g.stroke()}}
 else if(kind==='tree'||kind==='flower'||kind==='hedge'||kind==='vine'){line(g,[[0,38],[0,-50]],p.ink,7);for(let i=0;i<5;i++){let a=i*2.4;el(Math.cos(a)*30,-47+Math.sin(a)*24,23,15,kind==='flower'?p.accent:p.ground)}if(kind==='tree'){el(0,-73,42,30,p.ground);el(-25,-48,35,26,p.ground);el(30,-44,35,26,p.ground)}}
 else if(kind==='oven'){rect(-49,-51,98,91,p.hero);rect(-38,-25,76,52,p.ink);el(28,-39,6,6,p.accent);el(-28,-39,6,6,p.object);line(g,[[-24,-2],[24,-2]],p.object,3)}
 else if(kind==='sprinkler'){
  // Irrigation controller, valve and hose; distinct from an oven front.
  rect(-38,-55,76,63,p.paper,4);rect(-27,-43,54,22,p.ground,1);
  text(g,'06:00',0,-32,12,p.ink,null,0,'monospace');el(-19,-7,4,4,p.accent);el(18,-7,4,4,p.accent);
  line(g,[[0,8],[0,28],[43,28],[43,41]],p.ink,6);line(g,[[-13,17],[13,17]],p.accent,5);
  line(g,[[43,41],[43,51],[23,63],[-35,63],[-56,48],[-56,30]],p.ink,4);
  line(g,[[-67,28],[-45,28]],p.ink,5);
  for(let i=0;i<5;i++)line(g,[[-56,25],[-78+i*11,-6-Math.sin(i/4*Math.PI)*20]],p.accent,2);
 }
 else if(kind==='seedpod'){
  path(g,[[-43,-8],[-30,-25],[10,-30],[43,-8],[27,14],[-13,16]],p.ground,p.ink,lw);
  line(g,[[0,-28],[3,-16],[-2,-5],[2,14]],p.ink,2);
  for(let i=0;i<4;i++)line(g,[[-30+i*18,-17],[-24+i*18,6]],p.paper,2);
  line(g,[[41,-8],[51,-18]],p.ink,3);
 }
 else if(['box','shelter','tray','fence'].includes(kind)){rect(-52,-26,104,53,p.object,2);path(g,[[-52,-26],[-31,-48],[71,-48],[52,-26]],p.paper,p.ink,3);if(kind==='box'){line(g,[[0,-45],[0,26]],p.accent,10);line(g,[[-52,0],[52,0]],p.accent,10)}}
 else if(kind==='snail'){el(0,0,33,25,p.object);el(30,18,35,10,p.ground);line(g,[[50,15],[57,-15]],p.ink,3);el(57,-15,5,5,p.accent);g.beginPath();g.arc(0,0,15,0,5);g.strokeStyle=p.ink;g.stroke()}
 else if(kind==='puddle'){el(0,12,56,13,'#67b3c9');line(g,[[-25,10],[15,10]],p.paper,2)}
 else if(kind==='stake'||kind==='stick'){
  path(g,[[-71,-8],[58,-9],[70,-4],[58,0],[68,7],[-67,9],[-59,2]],p.object,p.ink,3);
  for(let y=-5;y<=5;y+=4)line(g,[[-59,y],[-8,y-1],[49,y]],p.ink,1);
 }
 else {rect(-52,-8,104,17,p.object,6);rect(-71,-5,20,10,p.ink,3);rect(51,-5,20,10,p.ink,3)}
 if(m==='crayon'){g.globalAlpha=.25;for(let i=0;i<25;i++)line(g,[[-45+i*4,-40],[-65+i*4,35]],p.paper,2);g.globalAlpha=1}
 if(m==='blueprint'){g.setLineDash([4,5]);line(g,[[-65,46],[65,46]],p.ink,1);g.setLineDash([]);line(g,[[-65,41],[-65,52]],p.ink,1);line(g,[[65,41],[65,52]],p.ink,1);text(g,'Ø 120',0,60,12,p.ink,null,0,'monospace')}
 g.restore();
}

// Material response is computed over the actual colour/coverage buffer before HUD.
// Unlike an overlay texture, white paper holes only remove deposited pigment.
export function materialPass(g,m,cache,dimensions=null){
 const width=dimensions?.width??W,height=dimensions?.height??H;
 if(!['crayon','ink','riso'].includes(m))return;
 const img=g.getImageData(0,0,width,height),src=img.data,copy=m==='riso'?new Uint8ClampedArray(src):null;
 let key=dimensions?`grain-field-${width}x${height}`:'grain-field',field=cache.get(key);
 if(!field){field=new Float32Array(width*height);let seed=348321;for(let i=0;i<field.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;field[i]=(seed>>>0)/4294967295}cache.set(key,field)}
 const paper=m==='ink'?[239,235,222]:m==='riso'?[247,241,218]:[246,240,220];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,n=field[y*width+x];let r=src[i],gg=src[i+1],b=src[i+2];
  if(m==='crayon'){
   let dark=255-Math.min(r,gg,b),hatch=(x*.82+y*.59)%7;
   let hole=n>.76||hatch<.90;let amount=dark>43?(hole?.66:.05):.03;
   for(let k=0;k<3;k++)src[i+k]=src[i+k]*(1-amount)+paper[k]*amount+(n-.5)*7;
  }else if(m==='ink'){
   let isRed=r>gg*1.35&&r>b*1.2;
   if(!isRed){let lum=(r+gg+b)/3,pressure=clamp((238-lum)/215);let dry=n>.965&&pressure>.65;let density=pressure*(dry?.48:1)*(0.94+n*.10);for(let k=0;k<3;k++)src[i+k]=paper[k]*(1-density)+[31,34,31][k]*density+(n-.5)*3}
  }else{
   // Each plate samples a different offset and has its own rotated screen.
   let jB=(Math.max(0,Math.min(height-1,y-1))*width+Math.max(0,Math.min(width-1,x+2)))*4;
   let jM=(Math.max(0,Math.min(height-1,y+1))*width+Math.max(0,Math.min(width-1,x-2)))*4;
   const platesAt=j=>{
    let r=copy[j],g=copy[j+1],b=copy[j+2];
    if(r>210&&g>205&&b>185)return [.12,.025,.015];
    if(b>r*1.12)return [.84,.06,.03];
    if(r>g*1.20&&b>g*.95)return [.02,.86,.12];
    if(g>r*1.1)return [.57,.03,.58];
    if(r>155&&g>100&&b<g*.9)return [0,.08,.83];
    if(r+g+b<280)return [.90,.36,.13];
    return [.18,.20,.55];
   };
   let db=platesAt(jB)[0],dm=platesAt(jM)[1],dy=platesAt(i)[2];
   let dot=(a,b)=>{let u=((a%4)+4)%4-2,v=((b%4)+4)%4-2;return (u*u+v*v)/7.5};
   let cb=db>.06&&dot(x*.87+y*.5,-x*.5+y*.87)<db*.9;
   let cm=dm>.06&&dot(x*.71-y*.71,x*.71+y*.71)<dm*.9;
   let cy=dy>.06&&dot(x,y)<dy*.9;
   let plates=[[6,122,169,cb],[229,55,118,cm],[247,203,35,cy]];
   let rgb=paper.map(v=>v+(n-.5)*16);
   for(let [pr,pg,pb,on]of plates)if(on){rgb[0]*=(pr/255*.88+.12);rgb[1]*=(pg/255*.88+.12);rgb[2]*=(pb/255*.88+.12)}
   for(let k=0;k<3;k++)src[i+k]=rgb[k];
  }
 }
 g.putImageData(img,0,0);
}
