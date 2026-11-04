import test from 'node:test';
import assert from 'node:assert/strict';
import {Ink, smallFigureStroke} from '../lib/ink.mjs';
import {createTimeline, drawingIndex} from '../lib/timeline.mjs';

const points = [[0, 0], [50, 10], [25, 80]];

test('held contours remain identical across all frames and arbitrary seeks', () => {
  const path = frame => new Ink(null, frame).path(points, {seed: 7});
  assert.deepEqual(path(0), path(1));
  assert.deepEqual(path(99), path(99));
  assert.deepEqual(path(0), path(6));
  for (const frame of [2, 3, 5, 24, 99, 7888]) assert.deepEqual(path(0), path(frame));
  assert.notDeepEqual(path(0), new Ink(null, 0).path(points, {seed: 8}));
});

test('panning and zooming cannot resample or slide the contour texture', () => {
  const shape = [[0, 0], [90, 0]];
  const base = new Ink(null, 0).path(shape, {closed: false, seed: 7});
  for (const scale of [0.99, 1, 1.01, 2]) {
    const ink = new Ink(null, 1234);
    ink.push(37, 81, scale);
    const moved = ink.path(shape, {closed: false, seed: 7});
    assert.equal(moved.length, base.length);
    moved.forEach(([x, y], i) => {
      assert.ok(Math.abs(x - (37 + base[i][0] * scale)) < 1e-10);
      assert.ok(Math.abs(y - (81 + base[i][1])) < 1e-10);
    });
  }
});

test('camera transforms geometry while screen stroke remains constant', () => {
  const widths = [], positions = [], transforms = [];
  const context = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {},
    moveTo(...point) { positions.push(point); }, lineTo() {},
    setTransform(...matrix) { transforms.push(matrix); },
    stroke() { widths.push(this.lineWidth); },
  };
  const ink = new Ink(context, 0);
  ink.poly(points, {boil: 0});
  ink.push(100, 60, 3);
  ink.poly(points, {boil: 0});
  assert.deepEqual(widths, [7, 7]);
  assert.deepEqual(positions, [[0, 0], [100, 60]]);
  assert.deepEqual(transforms, [[1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 0]]);
  ink.pop();
  assert.deepEqual(ink.point([2, 3]), [2, 3]);
  assert.throws(() => ink.pop(), /Unbalanced/);
});

test('tiny pose scaling is bounded and restored even if drawing fails', () => {
  const ink = new Ink(null, 0);
  assert.equal(smallFigureStroke(1), 1);
  assert.equal(smallFigureStroke(0), 0.12);
  assert.ok(smallFigureStroke(0.3) < 1);
  assert.throws(() => ink.withStrokeScale(0.2, () => {
    assert.equal(ink.strokeScale, 0.2);
    throw new Error('drawing failed');
  }), /drawing failed/);
  assert.equal(ink.strokeScale, 1);
  assert.throws(() => smallFigureStroke(-1), RangeError);
});

function valid() {
  return {fps: 24, duration_frames: 12, draft: false, shots: [
    {id: 'a', scene_type: 'two-shot', start: 0, end: 5},
    {id: 'b', scene_type: 'reaction', start: 5, end: 12},
  ]};
}

test('shot lookup respects exact half-open boundaries and independent seeks', () => {
  const source = valid(), timeline = createTimeline(source);
  assert.equal(timeline.shotAt(11).id, 'b');
  assert.equal(timeline.shotAt(0).id, 'a');
  assert.equal(timeline.shotAt(4).id, 'a');
  assert.equal(timeline.shotAt(5).id, 'b');
  source.shots[0].end = 10;
  assert.equal(timeline.shotAt(5).id, 'b');
  for (const frame of [-1, 12, 0.5]) assert.throws(() => timeline.shotAt(frame), RangeError);
  assert.equal(drawingIndex(1), 0);
  assert.equal(drawingIndex(2), 1);
  assert.equal(drawingIndex(24), 12);
  assert.equal(createTimeline({...valid(), fps: '24000/1001'}).fps, 24000 / 1001);
});

test('drafts, duplicate IDs, gaps, overlaps and incomplete coverage are rejected', () => {
  const blank = {fps: 24, duration_frames: null, draft: true, shots: []};
  assert.throws(() => createTimeline(blank), /non-draft/);
  for (const change of [
    value => { value.shots[1].id = 'a'; },
    value => { value.shots[1].start = 6; },
    value => { value.shots[1].start = 4; },
    value => { value.duration_frames = 13; },
    value => { value.shots[0].scene_type = ''; },
    value => { value.fps = '24/0'; },
  ]) {
    const input = valid(); change(input);
    assert.throws(() => createTimeline(input));
  }
});
