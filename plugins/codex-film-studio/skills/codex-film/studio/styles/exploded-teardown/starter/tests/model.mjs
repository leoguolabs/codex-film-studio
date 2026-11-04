import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticModel,validateModel,lift} from '../lib/model.mjs';
test('assembly closes exactly and staggers separation',()=>{
 const model=validateModel(diagnosticModel());
 for(const p of model.parts){assert.equal(lift(0,p.delay),0);assert.equal(lift(1,p.delay),0);assert.ok(lift(.5,p.delay)>.9);}
 assert.ok(lift(.3,0)>lift(.3,.08));
});
test('malformed geometry cannot enter WebGL',()=>{
 for(const change of [m=>m.parts[0].position[1]=NaN,m=>m.parts[0].size[0]=-1,m=>m.parts[0].material.metalness=2,m=>m.parts.push(m.parts[0]),m=>m.parts[0].delay=.5,m=>m.parts[4].holes=[[0,0,-1]]]){
 const m=diagnosticModel();change(m);assert.throws(()=>validateModel(m));
 }
});
