import {makeCamera,logDistance} from './geo.mjs';
import {preparePlate,drawTerrain,drawGeographicLine} from './terrain.mjs';
import {layers,polygon} from '../tools/runtime/layers.mjs';
const cache=new Map();
export async function drawStyle(c,s){
  const camera=makeCamera({lat:0,lon:0,distance:logDistance(16000,10000,s.progress),...s.shot.camera,width:s.plan.width,height:s.plan.height});
  if(s.shot.plates?.length){
    const plates=s.shot.plates.map(p=>{const key=JSON.stringify(p);if(!cache.has(key)){const image=s.assets.get(p.file);if(!image)throw Error(`Undeclared terrain image: ${p.file}`);cache.set(key,preparePlate(image,p.bounds,s.createCanvas));}return cache.get(key);});
    drawTerrain(c,camera,plates,{sampleStep:s.shot.sampleStep||1});
  }
  if(s.shot.proof){
    for(let lat=-60;lat<=60;lat+=20)drawGeographicLine(c,camera,Array.from({length:181},(_,i)=>[lat,-180+i*2]),'#7396a7');
    for(let lon=-180;lon<180;lon+=20)drawGeographicLine(c,camera,Array.from({length:91},(_,i)=>[-90+i*2,lon]),'#7396a7');
  }
  for(const line of s.shot.geoLines||[])drawGeographicLine(c,camera,line.coordinates,line.color);
  await layers(c,s,(c,l)=>polygon(c,l.points,l.fill,l.stroke));
}
