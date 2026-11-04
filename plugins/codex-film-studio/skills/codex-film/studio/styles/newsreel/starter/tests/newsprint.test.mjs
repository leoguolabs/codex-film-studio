import test from 'node:test';
import assert from 'node:assert/strict';
import {montagePose,paperTurn} from '../lib/newsprint.mjs';
test('Montage seeking is deterministic and all cards settle before the flip',()=>{
  const expected=montagePose(8,100);montagePose(0,4);assert.deepEqual(montagePose(8,100),expected);
  assert.equal(montagePose(8,64).visible,true);assert.equal(expected.enter,1);
  assert.throws(()=>montagePose(9,0));assert.throws(()=>montagePose(0,0,{fps:0}));
});
test('The left-spine turn keeps its hinge through the edge-on frame',()=>{
  assert.equal(paperTurn(0,200).edge,200);assert.ok(Math.abs(paperTurn(.5,200).edge)<1e-10);
  assert.equal(paperTurn(1,200).edge,-200);assert.equal(paperTurn(.75,200).back,true);
});
