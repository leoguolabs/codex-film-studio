import test from 'node:test';import assert from 'node:assert/strict';
import {solveLimb,roundedJointPath,motionPhase,poseBoundary} from '../lib/performance.mjs';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
test('both IK branches preserve bone lengths and endpoint; reflection reverses world bend',()=>{
 for(const tip of [[6,3],[0,8],[-6,3],[8,0]])for(const bend of [-1,1]){
  const p=solveLimb({root:[0,0],tip,lengths:[5,4],bend});assert(Math.abs(distance(p[0],p[1])-5)<1e-9);assert(Math.abs(distance(p[1],p[2])-4)<1e-9);assert.deepEqual(p[2],tip);
  const mirrored=solveLimb({root:[0,0],tip:[-tip[0],tip[1]],lengths:[5,4],bend:-bend});assert(Math.abs(mirrored[1][0]+p[1][0])<1e-9);assert(Math.abs(mirrored[1][1]-p[1][1])<1e-9);
 }
});
test('unreachable targets fail explicitly rather than stretching',()=>{
 assert.throws(()=>solveLimb({root:[0,0],tip:[10,0],lengths:[5,4]}),RangeError);
 assert.throws(()=>solveLimb({root:[0,0],tip:[.5,0],lengths:[5,4]}),RangeError);
});
test('joint rounding stays within the segment triangle and preserves endpoints',()=>{
 const p=roundedJointPath([[0,0],[5,0],[5,4]]);assert.deepEqual(p[0],[0,0]);assert.deepEqual(p.at(-1),[5,4]);for(const [x,y] of p){assert(x>=0&&x<=5);assert(y>=0&&y<=4);}
});
test('phase holds endpoints and progresses monotonically; pose clock shares event boundary',()=>{
 assert.equal(motionPhase(0,1,2),0);assert.equal(motionPhase(3,1,2),1);let old=0;for(let i=0;i<=100;i++){const q=motionPhase(1+i/100,1,2);assert(q>=old);old=q;}assert.equal(poseBoundary(13.2),14);assert.equal(poseBoundary(14),14);assert.throws(()=>motionPhase(1,2,2),RangeError);
});
