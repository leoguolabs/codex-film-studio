import {createCanvas} from '@napi-rs/canvas';
import fs from 'node:fs';
import {Wax,paperTexture,composite,W,H} from './material.mjs';
import {layers,proofLayers} from '../tools/runtime/layers.mjs';
import {leafStrips} from './book-motion.mjs';
import {rasterizeLeaf} from './leaf-raster.mjs';
let wax,paper,surface;
const textures=new Map();
export async function drawStyle(c,s){
  wax??=new Wax();Object.assign(wax,s.profile.wax||{});
  if(!paper){const bytes=fs.readFileSync(new URL('../materials/paper-relief.f32',import.meta.url));
    paper=paperTexture({reliefMap:new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),...s.profile.paper});}
  surface??=createCanvas(W,H);
  wax.begin(s.frame);
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  // Wax uses a 1280×720 drawing space internally; its final surface is 1920×1080.
  await layers(c,{...s,shot:{...shot,layers:shot.layers.filter(l=>l.type!=='page-turn')}},(ctx,l)=>{
    const m=ctx.getTransform(),points=l.points.map(([x,y])=>[(m.a*x+m.c*y+m.e)*1280/s.plan.width,(m.b*x+m.d*y+m.f)*720/s.plan.height]);
    wax.reveal(l.id||JSON.stringify(l.points),l.reveal===false?1:s.progress,()=>wax.shape(points,l.fill,l.seed||1,true));
  });
  composite(wax,paper,surface);
  c.drawImage(surface,0,0,s.plan.width,s.plan.height);
  // Text/images are composited above the wax surface, never lost beneath it.
  await layers(c,{...s,shot:{...shot,layers:shot.layers.filter(l=>['text','image'].includes(l.type))}},()=>{});
  for(const l of shot.layers.filter(l=>l.type==='page-turn')){
    const texture=file=>{if(!textures.has(file)){const image=s.assets.get(file);if(!image)throw Error(`Undeclared page image: ${file}`);const a=createCanvas(image.width,image.height),g=a.getContext('2d');g.drawImage(image,0,0);textures.set(file,g.getImageData(0,0,a.width,a.height));}return textures.get(file);};
    const start=l.start??0,end=l.end??(s.shot.end-s.shot.start);
    if(!(end>start))throw Error('Page turn needs an increasing local frame interval');
    const turn=Math.max(0,Math.min(1,(s.localFrame-start)/(end-start)));
    const strips=leafStrips(turn,l,{profile:l.profile||'rounded',curl:l.curl??1,segments:80});
    const data=rasterizeLeaf(strips,texture(l.frontFile),texture(l.backFile),{width:s.plan.width,height:s.plan.height,samples:1});
    const leaf=createCanvas(s.plan.width,s.plan.height),g=leaf.getContext('2d'),pixels=g.createImageData(leaf.width,leaf.height);pixels.data.set(data);g.putImageData(pixels,0,0);c.drawImage(leaf,0,0);
  }
}
