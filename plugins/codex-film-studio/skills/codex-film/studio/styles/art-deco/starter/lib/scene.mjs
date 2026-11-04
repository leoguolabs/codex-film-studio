import {gold,person,fan,arch} from './material.mjs';
import {layers,proofLayers,polygon} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const shot=s.shot.proof?{...s.shot,layers:proofLayers(s)}:s.shot;
  await layers(c,{...s,shot},(c,l)=>{
    if(l.type==='person')person(c,0,0,l.height||600,s.seconds,l.options||{});
    else if(l.type==='fan')fan(c,0,0,l.radius||120,l.opening??s.progress,0,l.fill||s.profile.secondary,l.options||{});
    else {polygon(c,l.points,l.fill,'#6f5220',7);polygon(c,l.points,null,gold(c,0,0,s.plan.width,s.plan.height,s.seconds),2);}
  });
}
