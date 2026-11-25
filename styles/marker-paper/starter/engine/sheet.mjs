import fs from 'node:fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import * as nib from './pen.mjs';
import { clamp, lerp, eio, eo, ei, mulberry } from './math.mjs';

const { W,H,Ink,reseed,setBoil,setGlyphs,makePaper,paperCanvas,composeOn }=nib;
for (const weight of ['Regular','Bold']) GlobalFonts.registerFromPath('fonts/Kalam-'+weight+'.ttf','Kalam');
setGlyphs(JSON.parse(fs.readFileSync('fonts/glyphs.json','utf8')));
const itemLength=mark=>mark.T?mark.T.L:mark.len;
const paperPoint=(origin,direction,length)=>origin.map((v,i)=>v+direction[i]*length);
const fullCanvas=()=>createCanvas(W,H);

// Retain one nib path for both sides of a detail cut, including its sampling and ink pools.
function placeStroke(source,x,y,scale=1){
  if(!Number.isFinite(scale)||scale<=0)throw Error('A placed stroke needs positive scale.');
  const point=v=>[x+v[0]*scale,y+v[1]*scale];
  return {source,x,y,scale,len:source.len*scale,start:point(source.start),end:point(source.end),color:source.color};
}

function camera(keys,t){
  let i=1;
  while(i<keys.length&&keys[i][0]<t)i++;
  if(t<=keys[0][0])return keys[0];
  if(i===keys.length)return keys[i-1];
  const a=keys[i-1],b=keys[i];
  const ease={in:ei,out:eo,linear:clamp}[b[4]]||eio;
  const u=ease((t-a[0])/(b[0]-a[0]));
  return [t,lerp(a[1],b[1],u),lerp(a[2],b[2],u),Math.exp(lerp(Math.log(a[3]),Math.log(b[3]),u))];
}
function matrix([,x,y,z]){
  const hw=W/(2*z),hh=H/(2*z);
  return [z,0,0,z,W/2-z*clamp(x,hw,W-hw),H/2-z*clamp(y,hh,H-hh)];
}

// Fold the sheet across a moving diagonal, exposing a shaded back and the next sheet below.
function fold(ctx,top,under,t){
  const diag=Math.hypot(W,H), n=[-W/diag,-H/diag], tangent=[-n[1],n[0]];
  const foot=paperPoint([W,H],n,lerp(-20,diag+260,eio(t)));
  const distance=p=>(p[0]-foot[0])*n[0]+(p[1]-foot[1])*n[1];
  const region=sign=>{
    const a=paperPoint(foot,tangent,-4000),b=paperPoint(foot,tangent,4000);
    polygon([a,b,paperPoint(b,n,4000*sign),paperPoint(a,n,4000*sign)]);
  };
  const polygon=points=>{
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(const p of points.slice(1))ctx.lineTo(...p);
    ctx.closePath();
  };
  ctx.drawImage(under,0,0);
  ctx.save();region(-1);ctx.clip();
  const shadow=ctx.createLinearGradient(...foot,...paperPoint(foot,n,-46));
  shadow.addColorStop(0,'rgba(70,63,51,.14)');shadow.addColorStop(1,'rgba(70,63,51,0)');
  ctx.fillStyle=shadow;ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.save();region(1);ctx.clip();ctx.drawImage(top,0,0);ctx.restore();
  const corner=[[0,0],[W,0],[W,H],[0,H]], flap=[];
  corner.forEach((p,i)=>{
    const q=corner[(i+1)%4], dp=distance(p),dq=distance(q);
    if(dp<0)flap.push(p);
    if((dp<0)!==(dq<0)){
      const u=dp/(dp-dq);
      flap.push([lerp(p[0],q[0],u),lerp(p[1],q[1],u)]);
    }
  });
  if(flap.length<3)return;
  ctx.save();polygon(flap.map(p=>paperPoint(p,n,-1.72*distance(p))));
  const shade=ctx.createLinearGradient(...foot,...paperPoint(foot,n,520));
  shade.addColorStop(0,'#e2e0d9');shade.addColorStop(.35,'#efede8');shade.addColorStop(1,'#f7f6f2');
  ctx.shadowColor='rgba(60,52,40,.16)';ctx.shadowBlur=18;ctx.shadowOffsetX=-4;ctx.shadowOffsetY=-3;
  ctx.fillStyle=shade;ctx.fill();ctx.restore();
  ctx.save();ctx.strokeStyle='rgba(150,142,128,.35)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
}

function caption(ctx,cue,t){
  const lines=cue.caption||[cue.text];
  const sizes=lines.length===1?[40]:[39,33];
  ctx.save();ctx.globalAlpha=clamp(Math.min((t-cue.start)/.12,(cue.end-t)/.12));
  const widths=lines.map((s,i)=>{ctx.font='400 '+sizes[i]+'px Kalam';return ctx.measureText(s).width;});
  const width=Math.max(...widths)+72;
  if(width>W-80)throw Error('Caption too wide: '+cue.text);
  const left=(W-width)/2, top=lines.length===1?965:948,bottom=1058;
  const rng=mulberry(String(cue.id).split('').reduce((v,c)=>v*3+c.charCodeAt(0),9));
  ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left+width,top);
  for(let y=top;y<=bottom;y+=7)ctx.lineTo(left+width+(rng()-.5)*7,y);
  ctx.lineTo(left,bottom);
  for(let y=bottom;y>=top;y-=7)ctx.lineTo(left+(rng()-.5)*7,y);
  ctx.closePath();ctx.fillStyle='rgba(251,250,247,.96)';ctx.fill();
  ctx.strokeStyle='rgba(70,63,51,.16)';ctx.lineWidth=1;ctx.stroke();
  ctx.textAlign='center';
  lines.forEach((s,i)=>{
    ctx.font='400 '+sizes[i]+'px Kalam';ctx.fillStyle=i?'rgba(27,28,32,.78)':'#1b1c20';
    ctx.fillText(s,W/2,lines.length===1?1027:(i?1037:997));
  });
  ctx.restore();
}

export function prepareFilm(film,cues=[]){
  const ink=new Ink(),sounds=[],writing=[];
  const sheets=film.sheets.map((spec,index)=>{
    const cels=[];
    const seed=spec.seed??7+index*13;
    for(let cel=0;cel<3;cel++){
      reseed(seed*101);setBoil(cel);
      const acts=[];
      const T=(s,x,y,opts={})=>({T:ink.layout(s,x,y,opts)});
      const parts=(runs,x,y,opts={})=>runs.map(([s,color])=>{
        const it=T(s,x,y,{...opts,color});
        x+=it.T.w;return it;
      });
      const E=(start,end,kind,marks)=>{
        if(!(end>start))throw Error('A pen action needs positive duration.');
        const items=[marks].flat(Infinity);
        if(!items.length)return;
        const lengths=items.map(itemLength);
        const total=lengths.reduce((a,b)=>a+b,0)+22*(items.length-1);
        if(!Number.isFinite(total)||total<=0)throw Error('Malformed drawing or empty lettering.');
        acts.push({start,end,items,lengths,total});
        if(cel!==0)return;
        let done=0;
        for(const [j,it] of items.entries()){
          const at=start+(end-start)*done/total, dur=(end-start)*lengths[j]/total;
          if(it.T)writing.push({text:it.T.str,x:it.T.x,y:it.T.y,w:it.T.w,size:it.T.size,sheet:index,start,end});
          const glyphs=it.T?.gl;
          const segments=glyphs?glyphs.map(g=>[at+dur*g.L0/it.T.L,dur*g.len/it.T.L*.9]):[[at,dur]];
          const x=it.T?it.T.x:(it.start[0]+it.end[0])/2;
          if(start>=spec.at-.001 && end-start>.025)for(const [t,d] of segments)
            sounds.push({t,d,type:kind,col:it.T?.color||it.color,v:lengths[j]/Math.max(.001,dur),pan:clamp(x/W*2-1,-1,1)});
          done+=lengths[j]+22;
        }
      };
      const page=(num,t)=>{
        E(t,t+.2,'line',nib.circle(1806,104,34,{w:5,a0:-2.6,lap:.3}));
        E(t+.21,t+.30,'write',T(String(num),1806,124,{size:52,align:'center',jit:.3}));
      };
      spec.draw({...nib,T,parts,E,page,placeStroke,random:mulberry(seed),W,H});
      cels.push(acts);
    }
    const p=paperCanvas(makePaper(seed));
    if(spec.peel)sounds.push({t:spec.at,d:spec.peel,type:'peel'});
    return {...spec,cels,paper:p,keys:spec.camera||[[spec.at,960,540,1]]};
  });
  sounds.push(...(film.sounds||[]));
  const surface=fullCanvas(),px=surface.getContext('2d');
  const canvas=fullCanvas(),X=canvas.getContext('2d');
  const im=X.createImageData(W,H), cache=[fullCanvas(),fullCanvas()], cacheKey=['',''];
  function draw(s,t,slot){
    const tick=Math.floor(t*12+1e-7),acts=s.cels[tick%3],M=matrix(camera(s.keys,t));
    const progress=acts.map(a=>clamp((tick/12-a.start)/(a.end-a.start)));
    const key=[s.at,tick%3,M[0],M[4],M[5],...progress].join('|');
    if(cacheKey[slot]===key)return cache[slot];
    ink.clear();ink.setCamera(M);
    acts.forEach((act,i)=>{
      const p=progress[i];let length=p>=1?Infinity:p*act.total;
      for(let j=0;j<act.items.length&&length>0;j++){
        const it=act.items[j];
        if(it.T)ink.write(it.T,length);
        else if(it.source){
          ink.setCamera([M[0]*it.scale,0,0,M[3]*it.scale,M[4]+it.x*M[0],M[5]+it.y*M[3]]);
          ink.stroke(it.source,length/it.scale);ink.setCamera(M);
        }else ink.stroke(it,length);
        length-=act.lengths[j]+22;
      }
    });
    px.setTransform(1,0,0,1,0,0);px.fillStyle='#f8f7f3';px.fillRect(0,0,W,H);
    px.setTransform(...M);px.drawImage(s.paper,0,0);px.setTransform(1,0,0,1,0,0);
    composeOn(px.getImageData(0,0,W,H).data,ink,im);
    cache[slot].getContext('2d').putImageData(im,0,0);cacheKey[slot]=key;
    return cache[slot];
  }
  return {sounds,writing,render(t){
    const idx=sheets.findLastIndex(s=>s.at<=t);
    if(idx<0)throw Error('Start the first sheet at zero.');
    const s=sheets[idx];
    if(idx&&s.peel&&t<s.at+s.peel)fold(X,draw(sheets[idx-1],s.at,1),draw(s,t,0),(t-s.at)/s.peel);
    else X.drawImage(draw(s,t,0),0,0);
    const cue=cues.find(c=>t>=c.start&&t<c.end);
    if(cue)caption(X,cue,t);
    return canvas;
  }};
}
