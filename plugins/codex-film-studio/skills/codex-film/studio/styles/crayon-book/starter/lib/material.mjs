import {createCanvas} from '@napi-rs/canvas';
import opentype from 'opentype.js';
const waxFonts=new Map(),glyphCache=new Map();
export function registerWaxFont(name,bytes){waxFonts.set(name,opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));}
export const W=1920,H=1080;
export const C={ink:'#343258',purple:'#805496',yellow:'#e4b83b',red:'#c75043',rose:'#b95d85',peach:'#e8c4a5',blue:'#5888ae',teal:'#58a5ab',green:'#6d934e',brown:'#967044',orange:'#df8f36',white:'#f4efe3'};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
function hash(x,y,s=0){let n=Math.imul(x+71,374761393)^Math.imul(y+131,668265263)^Math.imul(s+3,2246822519);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function strokePaint(context,stroke){
 const {path,color,alpha,pressureStops,pressureAxis}=stroke;
 if(!pressureStops){context.globalAlpha=alpha;context.strokeStyle=color;return;}
 const [first,last]=pressureAxis??[path[0],path.at(-1)],gradient=context.createLinearGradient(first[0],first[1],last[0],last[1]);
 const rgb=[1,3,5].map(start=>parseInt(color.slice(start,start+2),16));
 for(const [position,weight] of pressureStops)gradient.addColorStop(position,`rgba(${rgb.join(',')},${clamp(alpha*weight)})`);
 context.globalAlpha=1;context.strokeStyle=gradient;
}
function grid(x,y,step,s){let xx=x/step,yy=y/step,i=Math.floor(xx),j=Math.floor(yy),u=ease(xx-i),v=ease(yy-j);return (hash(i,j,s)*(1-u)+hash(i+1,j,s)*u)*(1-v)+(hash(i,j+1,s)*(1-u)+hash(i+1,j+1,s)*u)*v;}
export function paperTexture({reliefMap=null,reliefGain=1,toothScale=1}={}){
 if(reliefMap&&reliefMap.length!==W*H)throw new Error('Paper relief dimensions must match the canvas');
 const canvas=createCanvas(W,H),ctx=canvas.getContext('2d'),im=ctx.createImageData(W,H),p=im.data,tooth=new Float32Array(W*H),pigmentTooth=toothScale===1?tooth:new Float32Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x;let n=grid(x,y,1.7,3)*.45+grid(x,y,4,5)*.32+grid(x,y,12,9)*.23;
  const ridge=grid(x-1,y-1,1.7,3)-grid(x+1,y+1,1.7,3);
  const fibre=(grid(x/5,y,2,12)-.5)*8;
  const rad=((x-W*.5)/(W*.65))**2+((y-H*.48)/(H*.85))**2;
  const shade=1-.16*rad;
  const relief=reliefMap?reliefMap[i]*reliefGain:(n-.5)*27+ridge*33+fibre*1.25+(hash(x,y)-.5)*43;
  for(let k=0;k<3;k++)p[4*i+k]=[234,229,217][k]*shade+relief;
  const waxGrain=toothScale===1?n:grid(x*toothScale,y*toothScale,1.7,3)*.45+grid(x*toothScale,y*toothScale,4,5)*.32+grid(x*toothScale,y*toothScale,12,9)*.23;
  p[4*i+3]=255;tooth[i]=clamp((n-.28)*1.85+(hash(x,y,4)-.5)*.12);pigmentTooth[i]=clamp((waxGrain-.28)*1.85+(hash(x,y,4)-.5)*.12);
 }
 ctx.putImageData(im,0,0);return {canvas,p,tooth,pigmentTooth};
}
export class Wax {
 constructor(){this.revealCounts=new Map();this.measureCanvas=createCanvas(1,1);this.canvas=createCanvas(W,H);this.ctx=this.canvas.getContext('2d');this.frame=0;this.letterCanvas=createCanvas(W,H);this.letters=this.letterCanvas.getContext('2d');}
 begin(frame){this.letters.resetTransform();this.letters.clearRect(0,0,W,H);this.strokeIndex=0;this.strokeBudget=Infinity;this.fillIndex=0;this.fillBudget=Infinity;this.filling=false;this.outlineOnly=false;this.frame=Math.floor(frame/2);this.ctx.resetTransform();this.ctx.clearRect(0,0,W,H);this.ctx.setTransform(1.5,0,0,1.5,0,0);}
 // Draw-on progress controls actual contour and pigment strokes. Each group
 // has an independent budget, so late props cannot pop into a completed scene.
 reveal(key,progress,draw){
  progress=clamp(progress);if(progress<=0)return;if(progress>=1||this.measuring){draw();return;}
  const fields=['ctx','letters','strokeIndex','fillIndex','strokeBudget','fillBudget','outlineOnly','filling','measuring'];
  const saved=Object.fromEntries(fields.map(k=>[k,this[k]]));
  let counts=this.revealCounts.get(key);
  try{
   if(!counts){
    this.ctx=this.measureCanvas.getContext('2d');this.letters=this.ctx;this.ctx.resetTransform();
    this.strokeIndex=0;this.fillIndex=0;this.strokeBudget=Infinity;this.fillBudget=Infinity;this.outlineOnly=false;this.measuring=true;
    draw();counts={stroke:this.strokeIndex,fill:this.fillIndex};this.revealCounts.set(key,counts);
   }
   Object.assign(this,saved);this.strokeIndex=0;this.fillIndex=0;this.filling=false;
   this.outlineOnly=progress<.42;this.strokeBudget=this.outlineOnly?counts.stroke*ease(progress/.42):Infinity;
   this.fillBudget=this.outlineOnly?0:counts.fill*ease((progress-.42)/.58);
   draw();
  }finally{Object.assign(this,saved);}
 }
 rnd(s){return hash(s,this.frame%7,33)}
 // Stable identity belongs to an object, not its screen position or draw order.
 // Nested keys give repeated objects distinct marks without temporal reseeding.
 withVariant(key,draw){
  if(key===0||key==null||(this.variantStrength??1)===0)return draw();
  const previous=this.variantSeed??0;let seed=previous||2166136261;
  for(const code of String(key))seed=Math.imul(seed^code.charCodeAt(0),16777619)>>>0;
  this.variantSeed=seed||1;try{return draw();}finally{this.variantSeed=previous;}
 }
 seedFor(seed){return this.variantSeed?Math.floor(hash(seed,this.variantSeed,1823)*2147483647):seed;}
 line(points,color=C.ink,width=3,pressure=.97,seed=1,pressureDrift=0,pressureSeed=seed){
  seed=this.seedFor(seed);
  const pressureAxis=pressureDrift>0?[points[0],points.at(-1)]:null;
  const available=this.filling?this.fillBudget-this.fillIndex++:this.strokeBudget-this.strokeIndex++;if(this.outlineOnly){color=C.ink;width=Math.min(width,2.8);}if(this.measuring||available<=0||points.length<2)return;
  if(available<1){
   const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*available,partial=[points[0]];
   for(let i=0;i<lengths.length;i++){if(remaining>=lengths[i]){partial.push(points[i+1]);remaining-=lengths[i];}else{const q=remaining/Math.max(.0001,lengths[i]);partial.push([points[i][0]+(points[i+1][0]-points[i][0])*q,points[i][1]+(points[i+1][1]-points[i][1])*q]);break;}}points=partial;
  }const c=this.ctx;c.save();c.strokeStyle=color;
  // Contour pressure controls tooth exposure without eroding dark pigment
  // fills or glyphs. It is constant through a reveal, never a fade envelope.
  const contourPressure=color===C.ink&&width<=6&&!this.filling?(this.contourPressure??1):1;
  c.globalAlpha=clamp(pressure*contourPressure);c.lineWidth=width*(color===C.ink&&width<=6?(this.contourScale??1):1);c.lineJoin='round';c.lineCap='round';c.beginPath();
  const hand=points.map(([x,y],i)=>[x+(hash(i,seed,this.frame%5)-.5)*.75,y+(hash(i+32,seed,this.frame%5)-.5)*.75]);
  const stroke=(path,strokeWidth)=>{
   // Pressure varies along an existing pass. Fixed stops belong to the full
   // stroke, so partial reveals crop the same marks instead of stretching them.
   const pressureStops=pressureDrift>0?Array.from({length:9},(_,k)=>{
    const q=k/8,[a,b]=pressureAxis,x=a[0]+(b[0]-a[0])*q,y=a[1]+(b[1]-a[1])*q;
    return [q,1+(grid(x,y,45,pressureSeed+883)-.5)*.60*pressureDrift];
   }):null;
   if(this.surfaceStrokes&&this.filling){
    const m=c.getTransform();
    this.surfaceStrokes.push({path,width:strokeWidth,color,alpha:c.globalAlpha,pressureStops,pressureAxis,matrix:[m.a,m.b,m.c,m.d,m.e,m.f]});
   }else{strokePaint(c,{path,color,alpha:c.globalAlpha,pressureStops,pressureAxis});c.lineWidth=strokeWidth;c.beginPath();path.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  };
  if(this.organicContours&&color===C.ink&&width<=6){
   const baseWidth=c.lineWidth;
   for(let i=1;i<hand.length;i++){
    stroke([hand[i-1],hand[i]],baseWidth*(.73+grid(i,seed,5,619)*.54));
   }
  }else stroke(hand,c.lineWidth);
  c.restore();
 }
 curve(points,color=C.ink,width=3,pressure=.97){this.line(points,color,width,pressure,17)}
 withHatch(angle,draw){const previous=this.hatchAngle;this.hatchAngle=angle;try{return draw();}finally{this.hatchAngle=previous;}}
 withHatchFlow(strength,draw){const previous=this.hatchFlow;this.hatchFlow=clamp(strength);try{return draw();}finally{this.hatchFlow=previous;}}
 path(points){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
 shape(points,color,seed=1,outline=true,progress=1){
  seed=this.seedFor(seed);
  if(this.variantSeed){
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
   // Keep the bounding box and contact extremes fixed. Only interior contour
   // positions wander, with a low-frequency field rather than vertex noise.
   if(width>28&&height>28){
    const amplitude=Math.min(width,height)*.08*clamp(this.variantStrength??1);
    points=points.map(([x,y])=>{const u=(x-left)/width,v=(y-top)/height;return [x+Math.sin(u*Math.PI)*(grid(u*4,v*3,1,seed)-.5)*amplitude,y+Math.sin(v*Math.PI)*(grid(u*3,v*4,1,seed+31)-.5)*amplitude];});
   }
  }
  const boundary=points;
  // Larger polygons follow a softly wandering hand instead of ruler-straight
  // edges. Tiny facial features keep their original geometry.
  if(points.length<20){
   const edge=[];for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),count=Math.max(1,Math.ceil(len/14));
    for(let j=0;j<count;j++){const q=j/count,offset=Math.sin(q*Math.PI)*(hash(i*101+j,seed+211)-.5)*1.8;edge.push([a[0]+dx*q-dy/Math.max(1,len)*offset,a[1]+dy*q+dx/Math.max(1,len)*offset]);}
   }points=edge;
  }
  const c=this.ctx;let xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);let x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  c.save();this.path(points);c.clip();
  if(!this.strokeOcclusion){c.globalAlpha=1;c.globalCompositeOperation='destination-out';c.fillStyle='#fff';c.fillRect(x0-2,y0-2,x1-x0+4,y1-y0+4);c.globalCompositeOperation='source-over';}
  this.surfaceStrokes=this.strokeOcclusion?[]:null;
  if(color&&!this.outlineOnly){
   this.filling=true;
   const smallMark=this.protectSmallMarks&&color===C.ink&&x1-x0<=28&&y1-y0<=36;
   const pressure=smallMark?1.45:(({[C.yellow]:1.18,[C.peach]:1.13,[C.orange]:1.04,[C.green]:.78,[C.red]:.83,[C.blue]:.90,[C.purple]:.92})[color]??.96);
   // A form can choose a drawing direction; neighbouring passes share that
   // direction but vary pressure. Clip in object space before rotating the pen.
   if(this.formedHatching){
    const cx=(x0+x1)/2,cy=(y0+y1)/2,angle=this.hatchAngle??(hash(seed,Math.round(x1-x0+y1-y0),913)-.5)*.9;
    const co=Math.cos(angle),si=Math.sin(angle),bounds=points.map(([x,y])=>[(x-cx)*co+(y-cy)*si,-(x-cx)*si+(y-cy)*co]);
    const left=Math.min(...bounds.map(p=>p[0]))-10,right=Math.max(...bounds.map(p=>p[0]))+10,top=Math.min(...bounds.map(p=>p[1]))-12,bottom=Math.max(...bounds.map(p=>p[1]))+12;
    const formPressure=.91+hash(seed,947)*.17;
    // Neighbouring passes share a stable, gently curved field. This changes
    // local drawing direction rather than moving the form or adding noise.
    const flow=clamp(this.hatchFlow??0);
    const offset=(x,y)=>flow*(Math.sin((x-left)/Math.max(1,right-left)*Math.PI)*9
      +(grid(x,y,64,seed+257)-.5)*12);
    c.save();c.translate(cx,cy);c.rotate(angle);
    const overlap=clamp(this.hatchOverlap??0),largeInk=color===C.ink&&(x1-x0>28||y1-y0>36);
    if(this.brokenHatching&&color!==C.white&&(color!==C.ink||(overlap>0&&largeInk))){
     // Stagger the ends and pressure of wax passes instead of spanning each
     // shape with identical parallel bands. All seeds remain object-local.
     const strength=typeof this.brokenHatching==='number'?clamp(this.brokenHatching):1;
     // Broad crayon gestures vary together across neighbouring passes. The
     // field is fixed in form coordinates; small marks keep their old pen.
     const gesture=(color===C.ink?0:clamp(this.hatchGesture??0))*clamp((Math.min(x1-x0,y1-y0)-35)/70)
       *({[C.yellow]:.45,[C.peach]:.35}[color]??1);
     let pass=0;
     for(let y=top;y<bottom;y+=5.6+hash(pass,seed+41)*1.7+gesture*(grid(pass,0,2.7,seed+269)-.5)*3.2,pass++){
      const yy=y+(hash(pass,seed+19)-.5)*2.1;
      const span=48+hash(pass,seed+137)*74+gesture*(40+hash(pass,seed+277)*90);
      const stagger=hash(pass,seed+151)*span;
      let segment=0;
      for(let start=left-stagger;start<right;start+=span*.82,segment++){
       const stop=Math.min(right+10,start+span),stroke=[];
       const bend=(hash(pass,segment,seed+101)-.5)*(3.5+gesture*3);
       for(let x=start;x<=stop+5;x+=5){
        const q=(x-start)/Math.max(1,stop-start);
        stroke.push([x,yy+offset(x,yy)+bend*Math.sin(q*Math.PI)+(hash(pass,Math.round(x),seed+71)-.5)*1.5]);
       }
       const pressureVariation=(grid(segment,pass,2.2,seed+163)-.5)*.20*strength
         +gesture*(grid(segment,pass,2.7,seed+281)-.5)*.08;
       // A broader wax side overlaps adjacent passes without painting an
       // undercoat. Small identifying marks retain their original pen model.
       const width=7.7+overlap*5+(hash(pass,segment,seed+6)-.5)*1.7
         +gesture*(grid(segment,pass,2.5,seed+283)-.5)*2.5;
       const pressureDrift=(color===C.ink?0:clamp(this.hatchPressureDrift??0))*clamp((Math.min(x1-x0,y1-y0)-35)/70);
       this.line(stroke,color,width,(.69+pressureVariation)*pressure*formPressure,seed+pass*97+segment,pressureDrift,seed);
      }
     }
     for(let pass=0;pass<Math.ceil((bottom-top)/17);pass++){
      const y=top+pass*17+(hash(pass,seed+171)-.5)*12;
      const start=left+hash(pass,seed+173)*(right-left),span=28+hash(pass,seed+179)*65;
      this.line([[start,y+3],[Math.min(right+5,start+span),y-8]],color,3.4,(.13+hash(pass,seed+83)*.10)*pressure,seed+31+pass);
     }
    }else{
    for(let y=top,pass=0;y<bottom;y+=6.5,pass++){
     const yy=y+(hash(pass,seed+19)-.5)*3,end=left+(right-left)*clamp(progress*1.1),stroke=[];
     for(let x=left;x<=end+8;x+=8)stroke.push([x,yy+(x-left)*.025+(hash(pass,Math.round(x),seed+71)-.5)*1.6]);
     this.line(stroke,color,7.8+(hash(pass,seed+6)-.5)*2.2,(.58+hash(pass,seed+2)*.25)*pressure*formPressure,seed+pass);
    }
    for(let y=top-15,pass=0;y<bottom+15;y+=13,pass++)this.line([[left,y+10],[right,y-(right-left)*.18]],color,3.7,(.18+hash(pass,seed+83)*.12)*pressure,seed+31);
    }
    c.restore();
   }else{
   // Pigment arrives only through directional strokes, with no flat fill reveal.
   let ii=0;for(let y=y0-45;y<y1+50;y+=6.5){
    let yy=y+(hash(ii,seed)-.5)*3;let end=x0+(x1-x0+15)*clamp(progress*1.1);if(y>y0+(y1-y0)*progress+40)break;
    const pts=[];for(let x=x0-12;x<end+10;x+=8)pts.push([x,yy+(x-x0)*.2+(hash(ii,Math.round(x),seed)-.5)*2]);
    this.line(pts,color,7.8+(hash(ii,seed+6)-.5)*2.2,(.58+hash(ii,seed+2)*.25)*pressure,seed+ii);ii++;
   }
   for(let y=y0-50;y<y1+50;y+=13){let pts=[[x0-8,y+20],[x1+10,y-(x1-x0)*.28]];this.line(pts,color,3.7,.24*pressure,seed+31)}
   }
  }
  if(this.surfaceStrokes){
   const strokes=this.surfaceStrokes;this.surfaceStrokes=null;
   c.save();c.resetTransform();c.globalAlpha=1;c.globalCompositeOperation='destination-out';c.lineCap='round';c.lineJoin='round';
   // Erase only where a visible pigment stroke has actually passed. Device
   // coordinates avoid transformed destination-out leaving background ghosts.
   for(const s of strokes){
    const [a,b,cc,d,e,f]=s.matrix;c.lineWidth=s.width*Math.hypot(a,b);c.beginPath();
    s.path.forEach(([x,y],i)=>{const xx=a*x+cc*y+e,yy=b*x+d*y+f;i?c.lineTo(xx,yy):c.moveTo(xx,yy);});c.stroke();
   }
   c.globalCompositeOperation='source-over';
   for(const s of strokes){
    c.setTransform(...s.matrix);strokePaint(c,s);c.lineWidth=s.width;c.beginPath();
    s.path.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
   }
   c.restore();
  }
  this.filling=false;c.restore();
  // Short wax passes cross selected edges; they keep large fill shapes from
  // looking perfectly clipped, without obscuring small facial features.
  if(color&&!this.outlineOnly&&x1-x0>55&&y1-y0>45&&this.fillIndex<this.fillBudget){
   this.filling=true;
   const scumble=clamp(this.edgeScumble??0);
   if(scumble>0&&color!==C.white&&color!==C.ink){
    // Arc-length sampling works on circles as well as long polygon edges.
    // An object-local seed keeps the same dry overruns through the reveal.
    const lengths=boundary.map((a,i)=>{const b=boundary[(i+1)%boundary.length];return Math.hypot(b[0]-a[0],b[1]-a[1]);});
    const perimeter=lengths.reduce((sum,n)=>sum+n,0),spacing=7.5;
    const angle=this.hatchAngle??(hash(seed,Math.round(x1-x0+y1-y0),913)-.5)*.9;
    let edge=0,edgeStart=0;
    for(let mark=0,distance=spacing*.35;distance<perimeter;mark++,distance+=spacing){
     while(edge<lengths.length-1&&edgeStart+lengths[edge]<distance){edgeStart+=lengths[edge];edge++;}
     const a=boundary[edge],b=boundary[(edge+1)%boundary.length],q=(distance-edgeStart)/Math.max(.001,lengths[edge]);
     if(hash(mark,seed,227)<.18)continue;
     const x=a[0]+(b[0]-a[0])*q,y=a[1]+(b[1]-a[1])*q;
     const direction=angle+(hash(mark,seed,229)-.5)*.35,dx=Math.cos(direction),dy=Math.sin(direction);
     const before=(1.5+hash(mark,seed,233)*2.5)*scumble,after=(2+hash(mark,seed,239)*3.5)*scumble;
     this.line([[x-dx*before,y-dy*before],[x+dx*after,y+dy*after]],color,(2.6+hash(mark,seed,241)*2.2)*scumble,.52+hash(mark,seed,251)*.18,seed+mark*17);
    }
   }else{
   for(let i=0;i<boundary.length;i++){
    const a=boundary[i],b=boundary[(i+1)%boundary.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let j=0;j<Math.floor(len/25);j++){
     const q=(j+.45)/Math.max(1,Math.floor(len/25)),x=a[0]+(b[0]-a[0])*q,y=a[1]+(b[1]-a[1])*q;
     if(hash(j+i*29,seed)>.48)this.line([[x-2,y-1],[x+3+hash(j,seed)*2,y+1.2]],color,2.2,.42,seed+i+j);
    }
   }
   }
  }
  this.filling=false;
  if(outline)this.line([...points,points[0]],C.ink,2.8,.96,seed);
 }
 ellipse(x,y,rx,ry,color,seed=1,outline=true){let pts=[],jitterSeed=this.seedFor(seed);for(let i=0;i<60;i++){let a=i/60*Math.PI*2,noise=1+(hash(i,jitterSeed)-.5)*.024;pts.push([x+Math.cos(a)*rx*noise,y+Math.sin(a)*ry*noise]);}this.shape(pts,color,seed,outline);}
 rect(x,y,w,h,color,seed=1,outline=true){this.shape([[x,y],[x+w,y+.9],[x+w+1,y+h],[x-1,y+h-1]],color,seed,outline)}
 text(text,x,y,size=40,color=C.ink,font='Patrick Hand',align='left',reveal=1){
  if(this.measuring)return;let c=this.ctx;c.save();c.font=`${size}px "${font}"`;let total=c.measureText(text).width,dx=align==='center'?-total/2:align==='right'?-total:0;
  const visible=text.length*clamp(reveal);
  for(let i=0;i<text.length;i++){
   const advance=c.measureText(text[i]).width,q=clamp(visible-i);
   if(q>0){
    c.save();c.translate(x+dx,y+(hash(i,71)-.5)*1.2);c.rotate((hash(i,18)-.5)*.025);c.fillStyle=color;c.globalAlpha=.99;
    if(q>=1||!waxFonts.has(font)){
     c.fillText(text[i],0,0);this.letters.setTransform(c.getTransform());this.letters.font=c.font;this.letters.fillStyle=color;this.letters.globalAlpha=.82;this.letters.fillText(text[i],0,0);
    }else{
     const key=font+'/'+size+'/'+text[i];let glyph=glyphCache.get(key);
     if(!glyph){
      const path=waxFonts.get(font).getPath(text[i],0,0,size),segments=[];let current=[0,0],first=current,total=0;
      const add=p=>{const length=Math.hypot(p[0]-current[0],p[1]-current[1]);segments.push({a:current,b:p,length});total+=length;current=p;};
      for(const cmd of path.commands){
       if(cmd.type==='M'){current=[cmd.x,cmd.y];first=current;}
       if(cmd.type==='L')add([cmd.x,cmd.y]);
       if(cmd.type==='Z')add(first);
       if(cmd.type==='Q'||cmd.type==='C'){
        const a=current;for(let k=1;k<=12;k++){const u=k/12,v=1-u;
         add(cmd.type==='Q'?[v*v*a[0]+2*v*u*cmd.x1+u*u*cmd.x,v*v*a[1]+2*v*u*cmd.y1+u*u*cmd.y]:[v*v*v*a[0]+3*v*v*u*cmd.x1+3*v*u*u*cmd.x2+u*u*u*cmd.x,v*v*v*a[1]+3*v*v*u*cmd.y1+3*v*u*u*cmd.y2+u*u*u*cmd.y]);}
       }
      }
      glyph={path,segments,total};glyphCache.set(key,glyph);
     }
     let length=glyph.total*clamp(q/.55);c.strokeStyle=color;c.lineWidth=Math.max(.75,size*.025);c.lineCap='round';
     c.beginPath();for(const seg of glyph.segments){if(length<=0)break;const u=Math.min(1,length/Math.max(.001,seg.length));c.moveTo(...seg.a);c.lineTo(seg.a[0]+(seg.b[0]-seg.a[0])*u,seg.a[1]+(seg.b[1]-seg.a[1])*u);length-=seg.length;}c.stroke();
     if(q>.55){
      c.save();c.beginPath();for(const cmd of glyph.path.commands){if(cmd.type==='M')c.moveTo(cmd.x,cmd.y);if(cmd.type==='L')c.lineTo(cmd.x,cmd.y);if(cmd.type==='Q')c.quadraticCurveTo(cmd.x1,cmd.y1,cmd.x,cmd.y);if(cmd.type==='C')c.bezierCurveTo(cmd.x1,cmd.y1,cmd.x2,cmd.y2,cmd.x,cmd.y);if(cmd.type==='Z')c.closePath();}c.clip();
      c.lineWidth=2.8;for(let yy=-size;yy<size*.3*((q-.55)/.45)-size*(1-(q-.55)/.45);yy+=2){c.beginPath();c.moveTo(-2,yy);c.lineTo(advance+2,yy+2);c.stroke();}c.restore();
     }
    }
    c.restore();
   }dx+=advance;
  }c.restore();
 }
}
export function composite(wax,paper,out,cameraScale=1,cameraCenterX=W/2,cameraCenterY=H/2){
 const c=out.getContext('2d'),ink=wax.ctx.getImageData(0,0,W,H).data,im=c.createImageData(W,H),d=im.data,p=paper.p,t=paper.tooth;
 const pigmentLift=wax.pigmentLift??0,pigmentResidue=clamp(wax.pigmentResidue??0);
 const xx=Float32Array.from({length:W},(_,x)=>clamp((x-W/2)/cameraScale+cameraCenterX,0,W-1)),yy=Float32Array.from({length:H},(_,y)=>clamp((y-H/2)/cameraScale+cameraCenterY,0,H-1));
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let i=y*W+x,j=i*4,sx=xx[x],sy=yy[y],x0=Math.floor(sx),y0=Math.floor(sy),u=sx-x0,v=sy-y0;
  const i0=y0*W+x0,i1=y0*W+Math.min(W-1,x0+1),i2=Math.min(H-1,y0+1)*W+x0,i3=Math.min(H-1,y0+1)*W+Math.min(W-1,x0+1);
  const sample=(arr,k,stride=1)=>(arr[i0*stride+k]*(1-u)+arr[i1*stride+k]*u)*(1-v)+(arr[i2*stride+k]*(1-u)+arr[i3*stride+k]*u)*v;
  const a=ink[j+3]/255;
  // Additional pigment pressure affects coloured wax, not indigo contours or
  // paper-white features. Its reveal still comes from actual hatch strokes.
  const peak=Math.max(ink[j],ink[j+1],ink[j+2]),chroma=peak-Math.min(ink[j],ink[j+1],ink[j+2]);
  const coloured=peak>110&&chroma>35,lift=coloured?pigmentLift:0,tooth=sample(coloured?(paper.pigmentTooth??t):t,0);
  const threshold=.97-a*.86-lift;let cover=ease((tooth-threshold+.07)/.14)*Math.min(1,a*1.65);
  // A thin wax deposit remains in low fibres only where a coloured stroke
  // has already passed. Blank paper and indigo/white marks are unchanged.
  if(coloured&&pigmentResidue>0)cover+=(1-cover)*a*pigmentResidue;
  // Pigment is deposited on raised fibres. Wax never erases the paper relief.
  for(let k=0;k<3;k++){const pigment=ink[j+k]*(.92+tooth*.12);d[j+k]=sample(p,k,4)*(1-cover)+pigment*cover;}
  d[j+3]=255;
 }
 c.putImageData(im,0,0);c.drawImage(wax.letterCanvas,0,0);return out;
}
