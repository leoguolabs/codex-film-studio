import {Ink} from './ink.mjs';
import {layers,proofLayers} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  await layers(c,{...s,shot},(c,l)=>{const ink=new Ink(c,s.frame),m=c.getTransform();ink.matrix=[m.a,m.b,m.c,m.d,m.e,m.f];ink.poly(l.points,{fill:l.fill,stroke:l.stroke,width:l.width||6,seed:l.seed||0});});
}
