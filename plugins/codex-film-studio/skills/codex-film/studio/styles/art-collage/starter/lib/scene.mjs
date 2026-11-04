import {loadImage} from '@napi-rs/canvas';
import {drawPaper,seededRandom} from './paper.mjs';
import {layers,proofLayers,polygon} from '../tools/runtime/layers.mjs';
const texture=await loadImage(new URL('../materials/paper-fibre.png',import.meta.url));
function paper(){return texture;}
export async function drawStyle(c,s){
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  c.drawImage(paper(),0,0,s.plan.width,s.plan.height);
  await layers(c,{...s,shot},(c,l)=>{
    if(l.type==='paper')drawPaper(c,paper(),0,0,l.width,l.height,l);
    else {c.shadowColor='#30281940';c.shadowBlur=12;c.shadowOffsetY=9;polygon(c,l.points,l.fill,l.stroke,2);c.shadowColor='transparent';c.save();c.clip();c.globalCompositeOperation='multiply';c.globalAlpha=.25;c.drawImage(paper(),0,0,s.plan.width,s.plan.height);c.restore();}
  });
}
