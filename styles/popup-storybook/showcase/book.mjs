// The same transparent watercolor cutouts used in the two films, projected onto a curved sheet.
const W = 1200, H = 850, TAU = Math.PI * 2;
const pictures = new Map();
const scenes = [
  [
    ['village', -.57, .17, 305], ['pine', .78, .13, 135], ['lighthouse', .33, .24, 310],
    ['pinks', .69, .45, 85], ['pier', -.14, .61, 142], ['cutter', -.56, .75, 212],
    ['nell', .19, .71, 78], ['buoy', -.82, .88, 44], ['rock', .69, .86, 86],
  ],
  [
    ['tree', -.62, .17, 262], ['home', .58, .21, 270], ['reed', .48, .46, 116],
    ['spool', -.65, .62, 68], ['pip-pull', -.37, .65, 119], ['button', .05, .75, 120],
    ['beetle', .05, .69, 61], ['mushrooms', .79, .85, 91], ['reed', -.84, .88, 71],
  ],
  [
    ['pine', -.6, .25, 250], ['lighthouse', .54, .18, 316], ['fence', .52, .53, 129],
    ['offering', -.17, .75, 112], ['keeper', .07, .76, 120], ['pinks', -.71, .85, 104],
    ['rock', .79, .84, 84],
  ],
];
const grounds = ['ground-4', 'gutter-floor', 'ground-4'];
const smooth = t => { t = Math.max(0, Math.min(1,t)); return t*t*(3-2*t); };
function point(u,v) {
  const arch = Math.sin(Math.min(1,Math.abs(u))*Math.PI)*26;
  return [603 + u*(460+80*v)-(v-.45)*93, 394+257*v+u*30-arch];
}
function outline(g, left, right, dy=0) {
  const path = new Path2D();
  for (const [i,v] of [0,1].entries()) {
    for (let j=0;j<=48;j++) {
      const n=i ? 48-j : j;
      const [x,y]=point(left+(right-left)*n/48,v);
      if(i===0 && j===0) path.moveTo(x,y+dy); else path.lineTo(x,y+dy);
    }
  }
  path.closePath();return path;
}
function rule(g,points,color,width=1,dash=[]) {
  g.save();g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
  g.strokeStyle=color;g.lineWidth=width;g.setLineDash(dash);g.stroke();g.restore();
}
function ellipse(g,x,y,rx,ry,color,angle=0) {
  g.beginPath();g.ellipse(x,y,rx,ry,angle,0,TAU);g.fillStyle=color;g.fill();
}
function star(g,x,y,r,color){
  g.beginPath();
  for(let k=0;k<10;k++){const a=k*Math.PI/5-Math.PI/2;const rad=k%2?r*.43:r;g[k?'lineTo':'moveTo'](x+Math.cos(a)*rad,y+Math.sin(a)*rad);}
  g.closePath();g.fillStyle=color;g.fill();
}
function bookBase(g) {
  g.save();g.shadowBlur=39;g.shadowOffsetY=24;g.shadowColor='#031b20bb';
  g.fillStyle='#152e35';g.fill(outline(g,-1.033,1.033,26));g.restore();
  for(const [offset,ink] of [[26,'#825944'],[22,'#993f32'],[17,'#c0a06b'],[14,'#6c5941']]){
    g.fillStyle=ink;g.fill(outline(g,-1.024,1.024,offset));
  }
  for(let y=13;y>=1;y-=1.5){
    g.fillStyle=y%3<1.6?'#aa9170':'#e5cda7';
    for(const side of [[-1,0],[0,1]])g.fill(outline(g,...side,y));
  }
  for(const [a,b] of [[-1,0],[0,1]]){
    const grad=g.createLinearGradient(...point(a,.45),...point(b,.45));
    const inks=a<0?['#ccb486','#f4e1b8','#f5e7c8','#dfc89b','#a68a62']:['#b29870','#f4dfb1','#f8e8c8','#ead4a7','#d0b58b'];
    inks.forEach((c,i)=>grad.addColorStop([0,.12,.48,.87,1][i],c));g.fillStyle=grad;g.fill(outline(g,a,b));
  }
  g.save();g.clip(outline(g,-1,1));
  let seed=72415;const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<17500;i++){const x=48+rand()*1105,y=305+rand()*415;g.fillStyle=i%3?'rgba(90,54,28,.105)':'rgba(255,253,222,.35)';g.fillRect(x,y,.45+rand()*2.3,.45+rand()*.8);}
  for(const side of [-1,1])for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const [ox,oy]=point(side*(.07+x*.118+(y%2)*.028),.1+y*.105);
    g.beginPath();g.moveTo(ox-8,oy);g.quadraticCurveTo(ox-4,oy+2,ox,oy-1);g.quadraticCurveTo(ox+4,oy+1,ox+8,oy-1);
    g.strokeStyle='#38717937';g.lineWidth=1.15;g.stroke();
  }
  for(const side of [-1,1]){
    rule(g,Array.from({length:36},(_,i)=>point(side*(.035+i*.026),.94)),'#99754975');
    rule(g,Array.from({length:36},(_,i)=>point(side*(.035+i*.026),.055)),'#99754966');
  }
  g.restore();
  // A cloth bookmark projects beyond the bottom edge.
  const [x,y]=point(-.26,1);g.beginPath();g.moveTo(x-5,y+13);g.bezierCurveTo(x-8,y+37,x-18,y+48,x-29,y+57);g.lineTo(x-13,y+56);g.lineTo(x-5,y+65);g.bezierCurveTo(x+7,y+49,x+12,y+35,x+16,y+14);g.closePath();g.fillStyle='#ae543d';g.fill();
}
function compass(g){
  const [x,y]=point(-.79,.54);g.save();g.translate(x,y);g.transform(1,.06,-.19,.51,0,0);
  for(let j=0;j<2;j++){g.beginPath();g.arc(0,0,29+j*5,0,TAU);g.strokeStyle='#94712f9c';g.stroke();}
  for(let j=0;j<8;j++){g.save();g.rotate(j*Math.PI/4);g.beginPath();g.moveTo(0,-39);g.lineTo(5,0);g.lineTo(0,6);g.closePath();g.fillStyle=j%2?'#ba9654':'#685f41';g.fill();g.restore();}g.restore();
}
function floor(g,scene) {
  const im=pictures.get(grounds[scene]);if(!im)return;
  const [x,y]=point(scene===1?0:.31,.48);
  g.save();g.clip(outline(g,-1,1));g.translate(x,y);g.transform(1,.065,-.23,.43,0,0);
  const size=scene===1?740:580;g.globalAlpha=.81;g.drawImage(im,-size/2,-size/2,size,size);g.restore();
}
function card(g,entry,lift,t,scene){
  let [id,u,v,width]=entry;
  if(scene===0 && id==='cutter')u+=.23*smooth(t/.38);
  if(scene===1 && (id==='button'||id==='beetle'))u+=.14*Math.sin(t*Math.PI*2);
  const im=pictures.get(id);if(!im)return;
  const [x,y]=point(u,v), h=width*im.height/im.width;
  const ang=lift*Math.PI*.485,sy=Math.sin(ang),fold=Math.cos(ang);
  g.save();g.translate(x+5,y+3);g.transform(1,.03,-.72*sy,-.2*sy+.12*fold,0,0);
  g.globalAlpha=.18;g.drawImage(pictures.get(id+'-shade'),-width/2,-h,width,h);g.restore();
  g.save();g.translate(x,y);g.transform(1,.054,-.19*fold-.025,.99*sy+.29*fold,0,0);
  g.shadowColor='#785c4260';g.shadowBlur=1.4;g.shadowOffsetX=2;g.drawImage(im,-width/2,-h,width,h);g.restore();
}
function leaf(g,t){
  // A ruled sheet turns from its fore-edge around the spine. Its curling edge falls into a moving shadow.
  const a=t*Math.PI,c=Math.cos(a),s=Math.sin(a);
  const trace=(k,v)=>{const [x,y]=point(k*c,v);return [x+s*Math.sin(k*Math.PI)*58,y-187*s*Math.sin(k*Math.PI*.78)-65*s*k];};
  for(let j=0;j<52;j++){const l=j/52,r=(j+1)/52;
    const p=[trace(l,0),trace(r,0),trace(r,1),trace(l,1)];g.beginPath();p.forEach(([x,y],k)=>k?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    const tone=Math.round(226+19*Math.sin(l*Math.PI)-35*s*l);g.fillStyle='rgb('+tone+','+(tone-19)+','+(tone-49)+')';g.fill();g.strokeStyle=g.fillStyle;g.lineWidth=1.3;g.stroke();
  }
  for (const v of [.07,.92]) rule(g,Array.from({length:45},(_,i)=>trace(.03+i*.021,v)),'#9c774e80');
}
export async function mountBook(canvas) {
  const art=[...new Set([...grounds,...scenes.flatMap(s=>s.map(c=>c[0])),'gull','envelope'])];
  await Promise.all(art.map(async name=>{
    const image=new Image();image.src='media/'+name+'.webp';await image.decode();pictures.set(name,image);
    const shade=document.createElement('canvas');shade.width=image.width;shade.height=image.height;
    const ctx=shade.getContext('2d');ctx.drawImage(image,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#443b2d';ctx.fillRect(0,0,shade.width,shade.height);pictures.set(name+'-shade',shade);
  }));
  const base=document.createElement('canvas');base.width=W;base.height=H;bookBase(base.getContext('2d'));
  const tint=canvas.getContext('2d');
  return function draw(progress) {
    const span=progress*2, part=Math.min(1,Math.floor(span)), local=span-part;
    const turn=smooth((local-.36)/.31),scene=local<.52?part:part+1;
    const lift=1-smooth((local-.22)/.22)+smooth((local-.56)/.27);
    const camera=1+.035*Math.sin(progress*Math.PI*2);
    tint.clearRect(0,0,canvas.width,canvas.height);tint.save();tint.scale(canvas.width/W,canvas.height/H);
    tint.translate(600,490);tint.scale(camera,camera);tint.translate(-600,-490);
    tint.drawImage(base,0,0);floor(tint,scene);compass(tint);
    if(scene===1){
      const [x,y]=point(-.35,.49),[bx,by]=point(.05+.14*Math.sin(local*TAU),.75);
      tint.beginPath();tint.moveTo(x,y);tint.bezierCurveTo(x+36,y+16,bx-22,by+9,bx,by);tint.strokeStyle='#7e4c31';tint.lineWidth=2.4;tint.stroke();
    }
    const low=Math.max(.025,lift);
    for(const item of scenes[scene])card(tint,item,smooth(low),local,scene);
    if(turn>0 && turn<1)leaf(tint,turn);
    if(scene===0 && low>.2){
      const gull=pictures.get('gull');tint.drawImage(gull,531+104*local,189-46*Math.sin(5*local),62,62*gull.height/gull.width);
      // A wax-sealed letter rides the curve between the harbour and the keeper.
      const travel=smooth(local/.43), envelope=pictures.get('envelope');
      tint.save();tint.translate(506+244*travel,472-103*Math.sin(travel*Math.PI)-48*travel);
      tint.rotate(-.22+travel*.42);tint.drawImage(envelope,-18,-12,36,36*envelope.height/envelope.width);tint.restore();
    }
    if(scene===2 && low>.28){
      for(const [i,u,v] of [[0,-.70,.47],[1,.77,.30],[2,-.32,.15],[3,.18,.12]]){
        const [x,y]=point(u,v);const height=(75+i*15)*smooth((low-.22-i*.07)/.38);
        rule(tint,[[x,y],[x,y-height]],'#98704090',1);star(tint,x,y-height,9+i*.9,'#e9b75b');
      }
    }
    tint.restore();
  };
}
