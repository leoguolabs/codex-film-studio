// Rasterize the visible paper once per sample. Adjacent strips share a surface;
// they must not add separate antialiased edges or repeatedly shade their seams.
export function rasterizeLeaf(strips,front,back,{width,height,samples=4,shadeColor=[56,42,35]}={}){
 if(![width,height,samples].every(Number.isInteger)||width<1||height<1||samples<1||samples>4)
  throw new Error('Invalid raster dimensions or sample count');
 for(const t of [front,back])if(!t||!Number.isInteger(t.width)||!Number.isInteger(t.height)
  ||t.width<1||t.height<1||t.data.length!==t.width*t.height*4)throw new Error('Invalid paper texture');
 if(shadeColor.length!==3||!shadeColor.every(v=>Number.isFinite(v)&&v>=0&&v<=255))throw new Error('Invalid shade colour');
 const out=new Uint8ClampedArray(width*height*4),columns=Array.from({length:width*samples},()=>[]);
 for(const strip of strips){
  const {a,b,u,v,shade,front:isFront}=strip,dx=b.x-a.x;
  if(![a.x,a.y,a.height,a.z,b.x,b.y,b.height,b.z,u,v,shade].every(Number.isFinite)
   ||a.height<=0||b.height<=0)throw new Error('Invalid projected strip');
  if(Math.abs(dx)<1e-10)continue;
  const lo=Math.max(0,Math.ceil(Math.min(a.x,b.x)*samples-.5));
  const hi=Math.min(width*samples,Math.ceil(Math.max(a.x,b.x)*samples-.5));
  for(let sx=lo;sx<hi;sx++){
   const t=((sx+.5)/samples-a.x)/dx,one=1-t;
   // Height is proportional to perspective scale, so it also supplies 1/w.
   const q=one*a.height+t*b.height;
   const material=(one*u*a.height+t*v*b.height)/q;
   columns[sx].push({top:one*a.y+t*b.y,height:q,
    depth:(one*a.z*a.height+t*b.z*b.height)/q,
    u:isFront?material:1-material,shade,texture:isFront?front:back});
  }
 }
 for(const column of columns)column.sort((a,b)=>b.depth-a.depth);
 const clamp=(v,hi)=>Math.max(0,Math.min(hi,v));
 const n=samples*samples;
 for(let x=0;x<width;x++){
  const bands=columns.slice(x*samples,(x+1)*samples).flat();
  if(!bands.length)continue;
  const y0=Math.max(0,Math.floor(Math.min(...bands.map(b=>b.top))));
  const y1=Math.min(height,Math.ceil(Math.max(...bands.map(b=>b.top+b.height))));
  for(let y=y0;y<y1;y++){
   let red=0,green=0,blue=0,alpha=0;
   for(let sx=0;sx<samples;sx++)for(let sy=0;sy<samples;sy++){
    const yy=y+(sy+.5)/samples;
    const b=columns[x*samples+sx].find(b=>yy>=b.top&&yy<b.top+b.height);
    if(!b)continue;
    const tex=b.texture,xx=clamp(b.u*tex.width-.5,tex.width-1);
    const ty=clamp((yy-b.top)/b.height*tex.height-.5,tex.height-1);
    const ix=Math.floor(xx),iy=Math.floor(ty),fx=xx-ix,fy=ty-iy;
    const jx=Math.min(tex.width-1,ix+1),jy=Math.min(tex.height-1,iy+1);
    const ids=[(iy*tex.width+ix)*4,(iy*tex.width+jx)*4,(jy*tex.width+ix)*4,(jy*tex.width+jx)*4];
    const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
    let aa=0,r=0,g=0,bl=0;
    for(let j=0;j<4;j++){
     const i=ids[j],w=weights[j]*tex.data[i+3]/255;
     aa+=w;r+=tex.data[i]*w;g+=tex.data[i+1]*w;bl+=tex.data[i+2]*w;
    }
    const shade=Math.max(0,Math.min(1,b.shade));
    alpha+=aa;red+=r*(1-shade)+shadeColor[0]*shade*aa;
    green+=g*(1-shade)+shadeColor[1]*shade*aa;blue+=bl*(1-shade)+shadeColor[2]*shade*aa;
   }
   if(alpha){const i=(y*width+x)*4;out[i]=red/alpha;out[i+1]=green/alpha;out[i+2]=blue/alpha;out[i+3]=255*alpha/n;}
  }
 }
 return out;
}
