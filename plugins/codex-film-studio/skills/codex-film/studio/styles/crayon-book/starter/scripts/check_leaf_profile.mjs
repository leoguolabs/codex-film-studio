// Synthetic profile and visibility checks, without production inputs.
import assert from 'node:assert/strict';
import {leafStrips} from '../lib/book-motion.mjs';
import {rasterizeLeaf} from '../lib/leaf-raster.mjs';
const page={x:240,y:80,width:210,height:120},near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
for(let i=0;i<=100;i++){
 const t=i/100,strips=leafStrips(t,page,{profile:'hinge'}).sort((a,b)=>a.u-b.u);
 near(strips[0].a.x,page.x);near(strips[0].a.y,page.y);
 for(const s of strips){assert.ok(Object.values(s.a).every(Number.isFinite));assert.ok(s.b.z>=s.a.z);}
 if(i===0||i===100){near(strips.at(-1).b.x,page.x+(i===0?1:-1)*page.width);near(strips.at(-1).b.height,page.height);}
 assert.deepEqual(leafStrips(t,page),leafStrips(t,page,{profile:'rounded'}));
}
const tex=c=>({width:2,height:2,data:Uint8ClampedArray.from(Array(4).fill(c).flat())});
const d=rasterizeLeaf(leafStrips(.6,page,{profile:'hinge'}),tex([255,0,0,255]),tex([0,0,255,255]),{width:480,height:300,samples:2});
let front=0,back=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>200){if(d[i]>d[i+2]*2)front++;if(d[i+2]>d[i]*2)back++;}
assert.ok(front>1000&&back>1000);
assert.throws(()=>leafStrips(.5,page,{profile:'unknown'}));
console.log('Profile defaults, fixed hinge, endpoints, projection, visible faces and invalid input checks passed.');
