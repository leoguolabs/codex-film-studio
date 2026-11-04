import {W,H,hash,path,line,oval} from './primitives.mjs';

// A print surface assembled from coloured plates, torn paper and scored lines.
// Cache only static plates: moving scenery is evaluated from time on every call.
export function collageBackdrop(g,{createCanvas,cache,time=0,landscape=true}){
 const key=`collage-plates-${landscape}`,horizon=737;
 let plate=cache.get(key);
 if(!plate){
  plate=createCanvas(W,H);const q=plate.getContext('2d');
  q.fillStyle='#faedbd';q.fillRect(0,0,W,H);
  const bands=[['#e9508c',0,260],['#f17a78',245,440],['#f7ad43',425,610],['#f6d846',595,horizon]];
  for(let j=0;j<bands.length;j++){
   const [colour,top,bottom]=bands[j],points=[];
   for(let x=-8;x<=W+8;x+=8)points.push([x,top+Math.sin(x*.017+j)*10+(hash(x+j*17)-.5)*4]);
   for(let x=W+8;x>=-8;x-=8)points.push([x,bottom+Math.sin(x*.013+j)*13+(hash(x*3+j)-.5)*5]);
   path(q,points,colour,null);
  }
  // Angled screen dots reveal warm paper between the colour plates.
  q.save();q.translate(W/2,H/2);q.rotate(-.17);
  for(let y=-650;y<650;y+=3)for(let x=-450;x<450;x+=3){
   q.fillStyle=(Math.round(y/3)&1)?'#fff6d7d0':'#fff6d790';
   q.fillRect(x+(Math.round(y/3)&1?1.5:0),y,.85+hash(x+y)*.5,1);
  }q.restore();
  // A differently angled second screen keeps this from reading as a digital grid.
  q.save();q.globalAlpha=.2;q.translate(250,460);q.rotate(.24);q.fillStyle='#217fa1';
  for(let y=-600;y<600;y+=5)for(let x=-400;x<400;x+=5)q.fillRect(x,y,.65,.65);
  q.restore();
  for(let i=0;i<6000;i++){
   q.fillStyle=i%3?'#fff9dc22':'#843c4b18';
   q.fillRect(hash(i*13)*W,hash(i*31)*H,1+hash(i*7)*2,.4+hash(i)*.7);
  }
  cache.set(key,plate);
 }
 g.drawImage(plate,0,0);
 // Printed sun or warm oven-window glow sits behind the working silhouette.
 oval(g,landscape?80:442,landscape?481:466,91,91,'#ee713b',null);
 g.save();g.globalAlpha=.35;
 for(let i=0;i<22;i++)line(g,[[landscape?-15:347,410+i*7],[landscape?175:537,405+i*7]],'#ffd656',.7);
 g.restore();
 if(landscape){
  for(let i=0;i<3;i++){
   const cx=[65,350,485][i]+Math.sin(time*.2+i)*10,cy=[370,172,555][i];
   g.save();g.translate(cx,cy);g.rotate([-.06,.09,-.12][i]);
   const points=[];for(let n=0;n<32;n++){let a=n/32*Math.PI*2;points.push([Math.cos(a)*(54+hash(n+i*32)*12),Math.sin(a)*(14+hash(n*3+i)*11)])}
   path(g,points,'#f9f3dc',null);line(g,[[-48,8],[-15,5],[13,8],[45,3]],'#bdc8b4',.9);g.restore();
  }
 }else{
  // A broad paper arch and offset red strips suggest a bakery window.
  g.save();g.globalAlpha=.8;
  path(g,[[9,615],[9,373],[30,319],[85,285],[145,302],[184,348],[184,615]],'#fceabb','#c43f68',3);
  path(g,[[26,615],[26,378],[47,336],[86,314],[130,327],[166,365],[166,615]],'#f5b74f',null);
  line(g,[[99,318],[99,615]],'#fff3d4',5);line(g,[[27,455],[165,455]],'#fff3d4',5);
  g.restore();
 }
 // Receding, hand-scored surface gives the climax a foreground plane.
 g.fillStyle=landscape?'#397d91':'#427c9a';g.fillRect(0,horizon,W,H-horizon);
 for(let i=-8;i<15;i++){
  const base=i*73,top=270+(base-270)*.17;
  line(g,[[top,horizon],[base,H]],'#f5eed2',1.3);
  line(g,[[top+3,horizon],[base+8,H]],'#d0c2cc',.6);
 }
 for(let i=0;i<14;i++){
  const y=horizon+4+i*i*1.45;
  const pts=[];for(let x=-10;x<W+10;x+=15)pts.push([x,y+Math.sin(x*.04+i)*1.5]);
  line(g,pts,i%2?'#f2ecd2':'#192d5f',i%2?2:1.2);
 }
 for(let i=0;i<80;i++){
  const x=hash(i*29)*W,y=horizon+hash(i*17)*(H-horizon);
  line(g,[[x,y],[x+8+hash(i)*19,y-3]],i%3?'#e8d5a8':'#e6819c',.5);
 }
}
