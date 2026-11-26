import {makeComp,layerSet} from '../engine/comp.js';
import {materialProof,inscription,W,H} from '../engine/studio.js';
import * as film from '../film.js';
export async function ready(proof){
  await Promise.all([document.fonts.load('italic 500 42px Inscription'),document.fonts.load('600 44px Capitals')]);
  const [config,cues]=await Promise.all(['narration','cues'].map(n=>fetch('/content/'+n+'.json').then(r=>r.json())));
  if(!proof && !(config.duration>0))throw Error('Set the duration in content/narration.json');
  const A=layerSet(W,H),B=layerSet(W,H),canvas=document.querySelector('canvas'),compose=makeComp(canvas);
  if(!proof)await film.setup();
  window.framesToEncode=Math.round(24*config.duration);
  window.pictureCanvas=canvas;
  window.drawFrame=t=>{
    A.clear();B.clear();
    const o=proof?(materialProof(A),{}):(film.draw(A,B,t)||{});
    for(const [i,c] of cues.entries()){
      if(t<c.start||t>c.end)continue;
      const a=Math.min(1,(t-c.start)/.3,(c.end-t)/.35);
      const where=film.captionPosition?.(i,t)||config.lines[i].pos||[150,875,46];
      for(const ctx of [A.cw,A.cd,A.cc])ctx.setTransform(1,0,0,1,0,0);
      inscription(A,c.caption,...where,a);
    }
    compose(A,B,{bleed:5,rim:1,...o});
  };
}
