// Synthetic geometry checks only; no story, production timing or acceptance.
import assert from 'node:assert/strict';
import {bookMotion,leafStrips} from '../lib/book-motion.mjs';
import {bookCamera} from '../lib/book-camera.mjs';
const page={x:800,y:220,width:640,height:360};
const timing={start:10,revealEnd:46,turnStart:52,settle:76,pushStart:84,pushEnd:120};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
for(let frame=46;frame<=84;frame++){
 const m=bookMotion(frame,timing),c=bookCamera(m.progress,{width:1600,height:900,page,revealEnd:m.revealEnd,pushStart:m.pushStart});
 near(c.scale,1);near(c.translateX,0);near(c.translateY,0);
}
assert.deepEqual(bookMotion(140,timing),bookMotion(120,timing));
assert.equal(bookMotion(52,timing).turn,0);assert.equal(bookMotion(76,timing).turn,1);
for(const turn of [0,1]){
 const s=leafStrips(turn,page).sort((a,b)=>a.u-b.u);
 near(s[0].a.x,page.x);near(s[0].a.y,page.y);
 near(s.at(-1).b.x,page.x+(turn===0?1:-1)*page.width);
 near(s.at(-1).b.height,page.height);
}
const middle=leafStrips(.5,page);
assert.ok(middle.some(s=>s.front)&&middle.some(s=>!s.front));
for(let n=0;n<=100;n++){
 const strips=leafStrips(n/100,page),hinge=strips.find(s=>s.u===0).a;
 near(hinge.x,page.x);near(hinge.y,page.y);
 assert.deepEqual(strips,leafStrips(n/100,page));
 for(let i=0;i<strips.length;i++){
  const s=strips[i];assert.ok(Object.values(s.a).every(Number.isFinite));assert.ok(s.a.height>0);
  if(i)assert.ok(strips[i-1].depth<=s.depth);
 }
}
assert.throws(()=>bookMotion(0,{...timing,turnStart:timing.settle}));
assert.throws(()=>leafStrips(.5,{...page,width:0}));
assert.throws(()=>leafStrips(.5,page,{curl:2}));
console.log('Book timing, endpoint, hinge, face, depth and determinism checks passed; visual review remains separate.');
