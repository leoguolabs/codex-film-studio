import {createCanvas} from '@napi-rs/canvas';
import {W,H} from './material.mjs';

function noise(x,y){let n=Math.imul(x+17,374761393)^Math.imul(y+29,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function field(x,y,sx,sy,seed=0){
 const a=x/sx,b=y/sy,i=Math.floor(a),j=Math.floor(b),u=(a-i)**2*(3-2*(a-i)),v=(b-j)**2*(3-2*(b-j));
 return (noise(i+seed,j)*(1-u)+noise(i+1+seed,j)*u)*(1-v)+(noise(i+seed,j+1)*(1-u)+noise(i+1+seed,j+1)*u)*v;
}

// Long fibres have irregular spacing, bends and broken highlights. Several
// independent scales prevent a periodic sine pattern or a striped wallpaper.
export function deskTexture(paper,{meander=false,wear=0,layered=false,handGrain=0,fibreDetail=0,dryScumble=0}={}){
 if(!Number.isFinite(fibreDetail)||fibreDetail<0||fibreDetail>1)throw new Error('fibreDetail must be between 0 and 1');
 if(!Number.isFinite(dryScumble)||dryScumble<0||dryScumble>1)throw new Error('dryScumble must be between 0 and 1');
 if(layered)return layeredDesk(paper,{meander,wear,handGrain,fibreDetail,dryScumble});
 const canvas=createCanvas(W,H),ctx=canvas.getContext('2d'),im=ctx.createImageData(W,H),d=im.data;
 const drift=(x,y)=>meander?(field(x,y,570,310,311)-.5)*61+(field(x,y,210,110,337)-.5)*10:0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const j=(y*W+x)*4,warp=y+x*.022+drift(x,y)+(field(x,y,430,94,36)-.5)*18+(field(x,y,94,32,41)-.5)*3;
  const broad=(field(x,warp,600,34,8)-.5)*29;
  const grain=(field(x,warp,175,3.6,23)-.5)*31;
  const fibre=(field(x,warp,29,.85,71)-.5)*15+(noise(x,y)-.5)*8;
  const radial=((x-1030)/1290)**2+((y-510)/880)**2;
  const light=1.05-.29*radial+.10*Math.exp(-(((x-1090)/500)**2+((y-220)/370)**2));
  const value=broad*(1+wear*.4)+grain*(1+wear*.5)+fibre*(1+wear*.3);
  for(let k=0;k<3;k++)d[j+k]=[150,104,59][k]*light+value*[1,.86,.62][k];
  d[j+3]=255;
 }
 ctx.putImageData(im,0,0);
 // Draw long, pressure-varying grain paths. Broken chalk-like glints sit
 // beside darker grooves, rather than bright dots on equally spaced rows.
 for(let row=-10,index=0;row<H+20;row+=5+noise(index++,93)*16){
  const bend=6+noise(index,97)*9,period=150+noise(index,81)*390;
  const curve=x=>row-x*.022-drift(x,row)+Math.sin(x/period+index)*bend+(field(x,row,170,50,104)-.5)*4;
  // Nearby fibres share a slow bend; individual grooves lose pressure along
  // their length instead of outlining every row from edge to edge.
  for(let x0=-20,part=0;x0<W+20;part++){
   const length=meander?100+noise(part,index+415)*330:W+40;
   const localWear=field(x0,row,260,93,401);
   ctx.beginPath();for(let x=x0;x<=Math.min(W+20,x0+length);x+=meander?8:12){const y=curve(x);x===x0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
   ctx.strokeStyle=`rgba(52,27,13,${(meander?.08+noise(part,index+118)*.29:.16+noise(index,118)*.35)*(1+wear*(localWear-.25))})`;
   ctx.lineWidth=.8+noise(index,127)*(meander?3.1:2.3);ctx.stroke();
   x0+=length+(meander?20+noise(part,index+453)*95:1);
  }
  for(let x=-20,part=0;x<W;x+=11+noise(part++,index)*27){
   const length=8+noise(part+300,index)*77;
   if(noise(part,index+19)<.28+wear*(.5-field(x,row,260,93,401))*.6)continue;
   ctx.beginPath();for(let dx=0;dx<length;dx+=5){let y=curve(x+dx)-1.5;dx===0?ctx.moveTo(x+dx,y):ctx.lineTo(x+dx,y)}
   ctx.strokeStyle=`rgba(235,199,137,${((meander?.11:.15)+noise(part,index+77)*(meander?.25:.32))*(1+wear*.5)})`;ctx.lineWidth=.6+noise(part,index+53)*1.5;ctx.stroke();
  }
 }
 // Sparse dry pigment catches on elongated wood ridges.
 const surface=ctx.getImageData(0,0,W,H),pixels=surface.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,j=i*4,ridge=field(x,y+x*.022+drift(x,y),60,2.3,201),clump=field(x,y,4,1.5,227);
  const density=field(x,y,260,93,401),threshold=.64+wear*(.5-density)*.25;
  if(ridge>threshold&&clump>.56&&noise(x,y+88)>.35){
   const a=Math.min(.88,((ridge-threshold)*1.5+.28)*(1+wear*(density+.3)));for(let k=0;k<3;k++)pixels[j+k]=pixels[j+k]*(1-a)+[226,194,149][k]*a;
  }
 }
 ctx.putImageData(surface,0,0);
 for(const [row,seed] of [[254,17],[570,29],[870,43]]){
  ctx.beginPath();for(let x=0;x<=W;x+=12){const y=row+Math.sin(x/330+seed)*4+(field(x,row,80,50,seed)-.5)*3;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.strokeStyle='rgba(44,23,12,.48)';ctx.lineWidth=1.6;ctx.stroke();
 }
 return {canvas,p:ctx.getImageData(0,0,W,H).data,tooth:paper.tooth};
}

// Broad pigment ribbons establish the wood; fine grooves and worn catches
// belong to that same surface. No pattern or seed depends on the video frame.
function layeredDesk(paper,{meander,wear,handGrain,fibreDetail,dryScumble}){
 const canvas=createCanvas(W,H),ctx=canvas.getContext('2d'),im=ctx.createImageData(W,H),d=im.data;
 const drift=(x,y)=>meander?(field(x,y,690,260,311)-.5)*(27+handGrain*26)+(field(x,y,240,120,337)-.5)*(5+handGrain*7):0;
 const warp=(x,y)=>y+x*.012+drift(x,y)+(field(x,y,490,120,36)-.5)*12;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const j=(y*W+x)*4,v=warp(x,y),region=field(x,y,370,130,401);
  const ribbons=(field(x,v,530,43,8)-.5)*112*(1-.65*fibreDetail)+(field(x,v,210,13,83)-.5)*31;
  const grain=(field(x,v,250,2.9+handGrain*2.3,23)-.5)*36+(field(x,v,43,.9+handGrain*.8,71)-.5)*17;
  const grainPressure=(.65+field(x,y,230,70,127)*.55)*(1-dryScumble*.32);
  const radial=((x-1030)/1290)**2+((y-510)/880)**2;
  const light=1.05-.29*radial+.10*Math.exp(-(((x-1090)/500)**2+((y-220)/370)**2));
  const value=ribbons+grain*grainPressure*(1+.35*fibreDetail)+(noise(x,y)-.5)*10-wear*(1-region)*9;
  for(let k=0;k<3;k++)d[j+k]=[136,94,52][k]*light+value*[1,.83,.61][k];
  d[j+3]=255;
 }
 ctx.putImageData(im,0,0);
 ctx.lineCap='round';
 for(let row=-20,index=0;row<H+30;row+=3+noise(index++,93)*15){
  const curve=x=>row-x*.012-drift(x,row)+(field(x,row,340,55,104)-.5)*(9+handGrain*24);
  // Short neighbouring segments share a path but vary continuously in pressure.
  // Highlights use an independent mask: they do not outline every dark groove.
  for(let x=-20;x<W+20;x+=14){
   const pressure=field(x,row,190,38,118),catching=field(x,row,93,27,77);
   const a=Math.max(0,pressure-.23)*(.40+handGrain*.32)*(1-dryScumble*.30);
   ctx.beginPath();ctx.moveTo(x,curve(x));ctx.lineTo(x+14,curve(x+14));
   ctx.strokeStyle=`rgba(50,28,13,${a})`;ctx.lineWidth=.5+noise(index,127)*(1.5+handGrain*1.3);ctx.stroke();
   if(catching>.51){
    ctx.beginPath();ctx.moveTo(x,curve(x)-1.2);ctx.lineTo(x+14,curve(x+14)-1.2);
    ctx.strokeStyle=`rgba(219,179,121,${(catching-.51)*(.55+handGrain*.65)*(1-dryScumble*.65)})`;ctx.lineWidth=.6+handGrain*1.2;ctx.stroke();
   }
  }
 }
 const surface=ctx.getImageData(0,0,W,H),pixels=surface.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const j=(y*W+x)*4,v=warp(x,y),region=field(x,y,330,95,401);
  const ridge=field(x,v,88,2.1+handGrain*.9,201),clump=field(x,y,3.1+handGrain*3.5,1.6+handGrain*.5,227);
  const threshold=.63+handGrain*.025-wear*(region-.5)*(.12+handGrain*.16);
  if(ridge>threshold&&clump>.57&&noise(x,y+88)>.40){
   const a=Math.min(.78,((ridge-threshold)*1.7+.33)*(.85+region*.45))*(1-.7*fibreDetail);
   for(let k=0;k<3;k++)pixels[j+k]=pixels[j+k]*(1-a)+[224,190,143][k]*a;
  }
 }
 ctx.putImageData(surface,0,0);
 if(fibreDetail>0){
  const catches=createCanvas(W,H),pen=catches.getContext('2d');pen.lineCap='round';
  // Light catches the same elongated ridges as the grooves, with pressure
  // varying along the grain. Broad colour drift does not supply all contrast.
  for(let row=-10,index=0;row<H+20;row+=3.5+noise(index++,813)*8){
   const curve=x=>row-x*.012-drift(x,row)+(field(x,row,340,55,104)-.5)*(9+handGrain*24);
   for(let x=-20;x<W+20;x+=3){
    const smoothPressure=field(x,row,190,38,811);
    const pressure=smoothPressure*(1-dryScumble*.65)+(.24+field(x,row,83,17,861)*.55)*dryScumble*.65;
    const breaks=field(x,row,19,2.7,817);
    if(pressure<.27||breaks<.29)continue;
    const alpha=Math.min(.66+dryScumble*.14,(pressure-.27)*(.50+breaks*.8)*(1+dryScumble*.40))*fibreDetail;
    // Dry pressure deposits form short irregular islands along each fibre.
    // The local wobble and tooth stay in table space during camera motion.
    const offset=u=>dryScumble*(field(u,row,8,3,853)-.5)*3;
    pen.beginPath();pen.moveTo(x,curve(x)-1+offset(x));pen.lineTo(x+3,curve(x+3)-1+offset(x+3));
    pen.strokeStyle=`rgba(238,205,150,${alpha})`;
    pen.lineWidth=(.55+noise(index,827)*1.8+breaks*.65)*(1+dryScumble*.75);pen.stroke();
   }
  }
  const marks=pen.getImageData(0,0,W,H),ink=marks.data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=(y*W+x)*4;if(!ink[i+3])continue;
   const tooth=field(x,warp(x,y),3.1,1.1,839)*.70+noise(x,y+841)*.30;
   const clustered=field(x,y,4.7,1.7,857);
   const dryTooth=tooth*(1-dryScumble*.40)+clustered*dryScumble*.40;
   ink[i+3]*=Math.max(0,Math.min(1,(dryTooth-(.36+dryScumble*.12))*(3.9+dryScumble*5.1)));
  }
  pen.putImageData(marks,0,0);ctx.drawImage(catches,0,0);
 }
 if(handGrain>0){
  // Broad dry catches follow the same curved grain as the dark grooves.
  // Their ragged width and clustered gaps are fixed in table coordinates.
  for(let row=-12,index=0;row<H+20;row+=15+noise(index++,711)*24){
   const curve=x=>row-x*.012-drift(x,row)+(field(x,row,340,55,104)-.5)*33;
   for(let x=-20;x<W+20;x+=4){
    const pressure=field(x,row,170,61,727),tooth=field(x,row,7,2.1,733);
    if(pressure<.39||tooth<.40)continue;
    const alpha=(pressure-.39)*(.28+tooth*.5)*handGrain;
    const width=.6+noise(index,739)*2.4+tooth*1.7;
    ctx.beginPath();ctx.moveTo(x,curve(x)-1.8);ctx.lineTo(x+4,curve(x+4)-1.8);
    ctx.strokeStyle=`rgba(236,203,148,${alpha})`;ctx.lineWidth=width;ctx.stroke();
   }
  }
 }
 for(const [row,seed] of [[254,17],[570,29],[870,43]]){
  for(let x=0;x<W;x+=16){
   const curve=u=>row+(field(u,row,370,80,seed)-.5)*6;
   ctx.beginPath();ctx.moveTo(x,curve(x));ctx.lineTo(x+16,curve(x+16));
   ctx.strokeStyle=`rgba(44,23,12,${.2+field(x,row,150,50,seed)*.28})`;ctx.lineWidth=1.4;ctx.stroke();
  }
 }
 return {canvas,p:ctx.getImageData(0,0,W,H).data,tooth:paper.tooth};
}

export function shadeSpread(c,bx,by,pw,bh,{tableLight=0,paperLight=false}={}){
 c.save();c.beginPath();c.rect(bx,by,pw*2,bh);c.clip();
 if(paperLight){
  // Tint, illumination and falloff are independent. Bright paper near the
  // spine should not inherit several broad brown shadow overlays.
  c.fillStyle='rgba(230,180,100,.18)';c.fillRect(bx,by,pw*2,bh);
  const pool=c.createLinearGradient(bx,0,bx+pw*2,0);
  for(const [at,alpha] of [[0,0],[.12,0],[.25,.16],[.40,.55],[.49,.22],[.56,.50],[.66,.26],[.84,0],[1,0]])pool.addColorStop(at,`rgba(255,205,115,${alpha})`);
  c.globalCompositeOperation='screen';c.fillStyle=pool;c.fillRect(bx,by,pw*2,bh);c.globalCompositeOperation='source-over';
  const falloff=c.createLinearGradient(bx,0,bx+pw*2,0);
  for(const [at,alpha] of [[0,.33],[.10,.20],[.25,.02],[.40,0],[.52,0],[.68,.06],[.84,.20],[1,.34]])falloff.addColorStop(at,`rgba(52,34,20,${alpha})`);
  c.fillStyle=falloff;c.fillRect(bx,by,pw*2,bh);
  const depth=c.createLinearGradient(0,by,0,by+bh);
  depth.addColorStop(0,'rgba(61,40,23,.03)');depth.addColorStop(.28,'rgba(61,40,23,0)');depth.addColorStop(1,'rgba(61,40,23,.06)');
  c.fillStyle=depth;c.fillRect(bx,by,pw*2,bh);
 }else{
 c.fillStyle='rgba(187,141,77,.09)';c.fillRect(bx,by,pw*2,bh);
 const light=c.createRadialGradient(bx+pw*1.36,by+bh*.44,15,bx+pw*1.36,by+bh*.44,pw*.95);
 light.addColorStop(0,'rgba(255,225,165,.27)');light.addColorStop(.45,'rgba(223,191,137,.08)');light.addColorStop(1,'rgba(62,39,21,.29)');
 c.fillStyle=light;c.fillRect(bx,by,pw*2,bh);
 // A fixed table light creates a warm pool and an asymmetric falloff. It is
 // evaluated in book space, so the final camera push carries the same shading.
 if(tableLight){
  c.fillStyle=`rgba(123,77,33,${.10*tableLight})`;c.fillRect(bx,by,pw*2,bh);
  const falloff=c.createLinearGradient(bx,0,bx+pw*2,0);
  for(const [at,alpha] of [[0,.07],[.4,.02],[.52,0],[.68,.04],[.84,.22],[1,.38]])falloff.addColorStop(at,`rgba(56,35,22,${alpha*tableLight})`);
  c.fillStyle=falloff;c.fillRect(bx,by,pw*2,bh);
  const depth=c.createLinearGradient(0,by,0,by+bh);
  depth.addColorStop(0,`rgba(61,40,23,${.03*tableLight})`);depth.addColorStop(.28,'rgba(61,40,23,0)');depth.addColorStop(1,`rgba(61,40,23,${.12*tableLight})`);
  c.fillStyle=depth;c.fillRect(bx,by,pw*2,bh);
 }
 }
 const gutter=c.createLinearGradient(bx+pw-54,0,bx+pw+54,0);
 gutter.addColorStop(0,'rgba(61,43,26,0)');gutter.addColorStop(.34,'rgba(61,43,26,.07)');gutter.addColorStop(.49,'rgba(61,43,26,.30)');gutter.addColorStop(.53,'rgba(61,43,26,.23)');gutter.addColorStop(.76,'rgba(61,43,26,.06)');gutter.addColorStop(1,'rgba(61,43,26,0)');
 c.fillStyle=gutter;c.fillRect(bx+pw-54,by,108,bh);c.restore();
}
