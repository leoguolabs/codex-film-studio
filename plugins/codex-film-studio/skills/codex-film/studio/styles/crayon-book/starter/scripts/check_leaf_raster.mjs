import assert from 'node:assert/strict';
import {leafStrips} from '../lib/book-motion.mjs';
import {rasterizeLeaf} from '../lib/leaf-raster.mjs';
const width=320,height=180,checks=[];
const check=(name,fn)=>{fn();checks.push({name,passed:true});};
const texture=(r,g,b)=>{const data=new Uint8ClampedArray(128*96*4);for(let i=0;i<data.length;i+=4)data.set([r,g,b,255],i);return {width:128,height:96,data};};
const white=texture(220,220,220),red=texture(220,0,0),blue=texture(0,0,220);
const page={x:20.25,y:20.25,width:279.5,height:139.5};
const flat=leafStrips(0,page).map(s=>({...s,shade:.2}));
check('constant material has no internal strip seams or opacity holes',()=>{
 const d=rasterizeLeaf(flat,white,white,{width,height});
 const expected=[187,184,183,255];
 for(let y=22;y<158;y++)for(let x=22;x<298;x++)assert.deepEqual([...d.slice((y*width+x)*4,(y*width+x)*4+4)],expected);
 assert.equal(d[(20*width+20)*4+3],143);
});
check('surface coverage is independent of strip subdivision',()=>{
 const a=rasterizeLeaf(leafStrips(0,page,{segments:32}),white,white,{width,height});
 const b=rasterizeLeaf(leafStrips(0,page,{segments:240}),white,white,{width,height});
 assert.deepEqual(a,b);
});
check('nearest opaque sheet occludes farther sheet without double shading',()=>{
 const far=leafStrips(0,page).map(s=>({...s,front:true,shade:0,a:{...s.a,z:1},b:{...s.b,z:1}}));
 const near=leafStrips(0,{...page,x:80,y:45,width:160,height:90}).map(s=>({...s,front:false,shade:0,a:{...s.a,z:10},b:{...s.b,z:10}}));
 const d=rasterizeLeaf([...near,...far],red,blue,{width,height});
 assert.deepEqual([...d.slice((90*width+160)*4,(90*width+160)*4+4)],[0,0,220,255]);
 assert.deepEqual([...d.slice((30*width+30)*4,(30*width+30)*4+4)],[220,0,0,255]);
});
check('reverse texture returns to its upright left-to-right orientation',()=>{
 const back=texture(255,0,0);for(let y=0;y<96;y++)for(let x=64;x<128;x++)back.data.set([0,0,255,255],(y*128+x)*4);
 const d=rasterizeLeaf(leafStrips(1,{x:300,y:20,width:280,height:140}),white,back,{width,height});
 assert.deepEqual([...d.slice((90*width+50)*4,(90*width+50)*4+4)],[255,0,0,255]);
 assert.deepEqual([...d.slice((90*width+270)*4,(90*width+270)*4+4)],[0,0,255,255]);
});
check('curved surface is deterministic, bounded and does not mutate textures',()=>{
 const before=Buffer.from(white.data),s=leafStrips(.45,{x:160,y:40,width:140,height:100});
 const a=rasterizeLeaf(s,white,white,{width,height});
 assert.deepEqual(a,rasterizeLeaf(s,white,white,{width,height}));assert.deepEqual(before,Buffer.from(white.data));
 assert.ok(a.some(v=>v>0));
});
check('invalid raster settings and empty surfaces are handled',()=>{
 assert.throws(()=>rasterizeLeaf([],white,white,{width,height,samples:0}));
 assert.throws(()=>rasterizeLeaf([],{},white,{width,height}));
 assert.ok(rasterizeLeaf([],white,white,{width,height}).every(v=>v===0));
});
console.log('Six synthetic leaf raster checks passed; visual review remains separate.');
