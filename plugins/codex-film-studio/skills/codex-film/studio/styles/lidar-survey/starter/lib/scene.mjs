import {renderSurvey,proofSurvey} from './survey.mjs';
import {layers,polygon} from '../tools/runtime/layers.mjs';
export async function drawStyle(c,s){
  const w=s.plan.width,h=s.plan.height;
  if(s.shot.proof)renderSurvey(c,proofSurvey(),{camera:{azimuth:-.6+s.progress*.12,elevation:.55,distance:380},scan:-130+s.progress*260,surface:true},w,h);
  else await layers(c,s,(c,l)=>{
    if(l.type==='survey'){
      const data=s.assets.get(l.file);if(!data)throw Error(`Undeclared survey: ${l.file}`);
      const camera={...l.camera};if(l.cameraTo)for(const k of ['azimuth','elevation','distance','focal'])if(k in l.cameraTo)camera[k]=(camera[k]??l.cameraTo[k])+(l.cameraTo[k]-(camera[k]??l.cameraTo[k]))*s.progress;
      renderSurvey(c,data,{...l,camera,scan:l.scanTo===undefined?l.scan:(l.scan??0)+(l.scanTo-(l.scan??0))*s.progress},w,h);
    }else polygon(c,l.points,l.fill,l.stroke,1);
  });
}
