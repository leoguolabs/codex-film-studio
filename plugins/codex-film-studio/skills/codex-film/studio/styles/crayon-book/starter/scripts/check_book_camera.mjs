import assert from 'node:assert/strict';
import {bookCamera} from '../lib/book-camera.mjs';

const geometry={width:1920,height:1080,page:{x:960,y:282,width:864,height:486}};
const checks=[];
const check=(name,fn)=>{fn();checks.push({name,passed:true});};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
check('initial right page exactly covers viewport',()=>{
 const c=bookCamera(0,geometry),p=geometry.page;
 near(p.x*c.scale+c.translateX,0);near(p.y*c.scale+c.translateY,0);
 near(p.width*c.scale,geometry.width);near(p.height*c.scale,geometry.height);
});
check('hold uses identity camera',()=>{
 for(const t of [.2,.4,.65]){const c=bookCamera(t,geometry);near(c.scale,1);near(c.translateX,0);near(c.translateY,0);}
});
check('pullback and push have smooth endpoints',()=>{
 const dt=1e-6;
 for(const t of [0,.2,.65,1])for(const key of ['scale','translateX','translateY']){
  const a=bookCamera(t,geometry)[key],b=bookCamera(t+dt,geometry)[key],c=bookCamera(t-dt,geometry)[key];
  assert.ok(Math.max(Math.abs(b-a),Math.abs(c-a))<1e-6);
 }
});
check('camera is finite, seek deterministic and covers canvas throughout',()=>{
 for(let i=0;i<=1000;i++){
  const t=i/1000,c=bookCamera(t,geometry);assert.deepEqual(bookCamera(t,geometry),c);
  assert.ok(Object.values(c).every(Number.isFinite));
  assert.ok(c.translateX<=1e-7&&c.translateY<=1e-7);
  assert.ok(c.translateX+geometry.width*c.scale>=geometry.width-1e-7);
  assert.ok(c.translateY+geometry.height*c.scale>=geometry.height-1e-7);
 }
});
check('invalid timing and page dimensions are rejected',()=>{
 assert.throws(()=>bookCamera(0,{...geometry,revealEnd:.7}));
 assert.throws(()=>bookCamera(0,{...geometry,page:{...geometry.page,width:0}}));
});
console.log(JSON.stringify({checks,passed:true,scope:'Geometry checks only; inspect encoded motion separately.'},null,2));
