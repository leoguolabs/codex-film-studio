import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {Wax,C} from '../lib/material.mjs';
const out=path.resolve(process.argv[2]??'review/gesture');fs.mkdirSync(out,{recursive:true});
const hash=canvas=>createHash('sha256').update(canvas.getContext('2d').getImageData(0,0,1920,1080).data).digest('hex');
const checks=[];const check=(name,fn)=>{fn();checks.push({name,passed:true});};
function draw(Type,{strength=0,colour=C.green,progress=1,small=false}={},instance=null){
 const w=instance??new Type();w.formedHatching=true;w.brokenHatching=1;w.strokeOcclusion=true;w.hatchOverlap=.5;w.protectSmallMarks=true;w.hatchGesture=strength;
 w.begin(48);w.reveal('shape',progress,()=>w.ellipse(240,240,small?8:130,small?10:110,colour,17));
 return hash(w.canvas);
}
check('large coloured gestures change visible pigment',()=>{
 for(const colour of [C.green,C.red,C.brown])assert.notEqual(draw(Wax,{colour}),draw(Wax,{colour,strength:.6}));
});
check('tiny marks and white and indigo surfaces remain exact',()=>{
 for(const colour of [C.ink,C.white])assert.equal(draw(Wax,{colour}),draw(Wax,{colour,strength:1}));
 for(const colour of [C.yellow,C.red,C.peach])assert.equal(draw(Wax,{colour,small:true}),draw(Wax,{colour,small:true,strength:1}));
});
check('empty and partial contour stages remain exact',()=>{
 for(const progress of [0,.15,.35])assert.equal(draw(Wax,{progress}),draw(Wax,{progress,strength:1}));
});
check('arbitrary seeking retains the partial pigment state',()=>{
 const w=new Wax(),a=draw(Wax,{strength:.6,progress:.72},w);
 draw(Wax,{strength:.6,progress:1},w);assert.equal(draw(Wax,{strength:.6,progress:.72},w),a);
});
check('independent reveal budgets advance through distinct strokes',()=>{
 const images=[0,.2,.45,.6,.8,1].map(progress=>draw(Wax,{strength:.6,progress}));
 assert.equal(new Set(images).size,images.length);
});
fs.writeFileSync(path.join(out,'gesture-checks.json'),JSON.stringify({checks,passed:true,scope:'Native raster invariants and seek checks; material quality and encoded motion require separate inspection.'},null,2)+'\n');
console.log(`${checks.length} gesture checks passed`);
