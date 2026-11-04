import test from 'node:test';
import assert from 'node:assert/strict';
import {background,indexPixelBuffer,pixelPalette} from './materials.mjs';

test('pixel ground retains separate surface and alternating stipple colours',()=>{
 const cells=[];const g={fillStyle:null,fillRect(x,y,w,h){cells.push({x,y,w,h,colour:this.fillStyle})}};
 background(g,'pixel',null,new Map());
 const row=cells.filter(c=>c.y===736&&c.w===4);
 assert.ok(row.length>0&&row.length<135,'a stipple row must leave alternating base cells exposed');
 const nextRow=cells.filter(c=>c.y===740&&c.w===4);
 assert.ok(nextRow.length>0);
 assert.ok(nextRow.every(c=>!row.some(a=>a.x===c.x)),'adjacent sparse rows alternate their filled columns');
 assert.ok(cells.some(c=>c.y===720&&c.h===4),'ground starts at the contact surface');
 assert.ok(new Set(cells.filter(c=>c.y>=720).map(c=>c.colour)).size>=3);
});

test('indexed pixel output contains only palette colours and preserves alpha',()=>{
 const data=new Uint8ClampedArray(256*4);
 for(let i=0;i<256;i++)data.set([i,255-i,(i*37)%256,i],i*4);
 const g={canvas:{width:256,height:1},getImageData:()=>({data}),putImageData:()=>{}};
 indexPixelBuffer(g);
 for(let i=0;i<256;i++){
  const hex='#'+[...data.slice(i*4,i*4+3)].map(v=>v.toString(16).padStart(2,'0')).join('');
  assert.ok(pixelPalette.includes(hex));assert.equal(data[i*4+3],i);
 }
 const first=data.slice();indexPixelBuffer(g);assert.deepEqual(data,first);
});

test('material response covers a landscape buffer and isolates its grain cache',async()=>{
 const {materialPass}=await import('./materials.mjs'),cache=new Map();
 for(const [width,height]of [[96,54],[54,96]]){
  const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4)data.set([20,30,40,173],i);
  let written=false;const g={getImageData(x,y,w,h){assert.equal(w,width);assert.equal(h,height);return {data}},putImageData(img,x,y){assert.equal(img.data.length,width*height*4);assert.equal(x,0);assert.equal(y,0);written=true}};
  materialPass(g,'crayon',cache,{width,height});assert.ok(written);
  for(const i of [0,(width-1)*4,(width*height-1)*4]){assert.notDeepEqual([...data.slice(i,i+3)],[20,30,40]);assert.equal(data[i+3],173)}
 }
 assert.notStrictEqual(cache.get('grain-field-96x54'),cache.get('grain-field-54x96'));
});
