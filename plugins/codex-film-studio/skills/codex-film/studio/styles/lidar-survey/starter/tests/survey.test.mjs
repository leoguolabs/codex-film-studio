import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSurvey,project,proofSurvey} from '../lib/survey.mjs';
test('Survey validation preserves measured coordinates and rejects bad topology',()=>{
  const data=proofSurvey(),copy=structuredClone(data);validateSurvey(data);assert.deepEqual(data,copy);
  assert.throws(()=>validateSurvey({points:[[0,0,NaN]]}));
  assert.throws(()=>validateSurvey({points:[[0,0,0]],triangles:[[0,1,2]]}));
});
test('Camera projection centres its target and is independent of seek order',()=>{
  const camera={target:[20,30,40],distance:200,azimuth:.2,elevation:.4};
  assert.deepEqual(project([20,30,40],camera,1920,1080),[960,540,200]);
  const point=[22,35,42],a=project(point,camera,1920,1080);project(point,{...camera,azimuth:3},1920,1080);
  assert.deepEqual(project(point,camera,1920,1080),a);assert.deepEqual(point,[22,35,42]);
});
