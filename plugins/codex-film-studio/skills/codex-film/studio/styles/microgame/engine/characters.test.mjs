import test from 'node:test';
import assert from 'node:assert/strict';
import {localContact} from './characters.mjs';

test('a hand stays on its scene contact through leaning, scaling and jumping',()=>{
 for(const [x,y,scale,lean,jump] of [[137,675,1.48,.1,0],[235,675,1.48,-.15,0],[280,675,.8,.35,183],[104,728,1.1,-.3,0]]){
  for(const contact of [[304,411],[355,512],[330,637],[258,576]]){
   const [lx,ly]=localContact(contact,x,y,scale,lean,jump);
   const actual=[x+scale*(Math.cos(lean)*lx-Math.sin(lean)*ly),y-jump+scale*(Math.sin(lean)*lx+Math.cos(lean)*ly)];
   assert.ok(Math.hypot(actual[0]-contact[0],actual[1]-contact[1])<1e-9);
  }
 }
});
