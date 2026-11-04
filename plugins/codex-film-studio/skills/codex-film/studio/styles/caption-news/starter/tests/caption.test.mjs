import test from 'node:test';
import assert from 'node:assert/strict';
import { captionPose, progress } from '../lib/caption.mjs';

test('Seeking directly gives the same state, with exact settled geometry', () => {
  const cue = { start: 10, duration: 8, scaleFrom: 1.4, travelY: 12 };
  const middle = captionPose(14, cue);
  captionPose(30, cue);
  captionPose(0, cue);
  assert.deepEqual(captionPose(14, cue), middle);
  assert.equal(captionPose(9, cue).visible, false);
  assert.deepEqual(captionPose(18, cue), { visible: true, scale: 1, offsetY: 0, highlight: 1 });
  assert.deepEqual(captionPose(300, cue), captionPose(18, cue));
});

test('Highlight stays bounded and invalid clocks are rejected', () => {
  const values = [-2, 0, 3, 6, 8].map(frame => progress(frame, 0, 6));
  assert.deepEqual(values, [0, 0, 0.5, 1, 1]);
  for (const duration of [0, -1, 0.5, Infinity]) {
    assert.throws(() => progress(0, 0, duration), RangeError);
  }
  assert.throws(() => captionPose(0, { start: 0, duration: 1, scaleFrom: NaN }), RangeError);
});
