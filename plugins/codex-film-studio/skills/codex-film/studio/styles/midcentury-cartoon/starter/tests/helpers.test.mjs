import test from 'node:test';
import assert from 'node:assert/strict';
import {frameClock, createTimeline, readingHoldSeconds} from '../lib/timeline.mjs';
import {plateOffset, inkSegments, drawCel, drawPaper, starPoints} from '../lib/print.mjs';

test('pose and registration hold on twos while camera time advances', () => {
  for (let frame = 0; frame < 120; frame += 2) {
    assert.equal(frameClock(frame).poseTime, frameClock(frame + 1).poseTime);
    assert.notEqual(frameClock(frame).time, frameClock(frame + 1).time);
    assert.deepEqual(plateOffset(frame), plateOffset(frame + 1));
    assert.notDeepEqual(plateOffset(frame), plateOffset(frame + 2));
  }
  assert.throws(() => frameClock(-1));
  assert.throws(() => frameClock(1.5));
  assert.throws(() => frameClock(0, 0));
  assert.throws(() => frameClock(0, 12, 24));
});

test('arbitrary seek order cannot affect material, and jitter stays bounded', () => {
  const reference = plateOffset(90, {seed: 17});
  for (const frame of [77, 2, 1001, 90, 0]) {
    const [x, y] = plateOffset(frame, {seed: 17});
    assert.ok(x >= 4.25 && x <= 6.75 && y >= 2.25 && y <= 4.75);
  }
  assert.deepEqual(plateOffset(90, {seed: 17}), reference);
  assert.notDeepEqual(reference, plateOffset(90, {seed: 18}));
  assert.throws(() => plateOffset(0, {jitter: -1}));
});

function edit() {
  return {draft: false, fps: 24, duration_frames: 48, shots: [
    {id: 'a', scene_type: 'action', headline: '', start: 0, end: 24, cues: {contact: 23}},
    {id: 'b', scene_type: 'detail', headline: '', start: 24, end: 48},
  ]};
}

test('shot boundaries, complete coverage and source cue mutation are safe', () => {
  const input = edit(), timeline = createTimeline(input);
  input.shots[0].cues.contact = 99;
  assert.equal(timeline.shots[0].cues.contact, 23);
  assert.equal(timeline.shotAt(23).id, 'a');
  assert.equal(timeline.shotAt(24).id, 'b');
  assert.equal(timeline.shotAt(47).id, 'b');
  assert.throws(() => timeline.shotAt(48));
  assert.throws(() => timeline.shotAt(-1));
  for (const change of [x => {x.draft = true;}, x => {x.shots = [];},
    x => {x.shots[1].start = 25;}, x => {x.shots[1].start = 23;},
    x => {x.shots[1].id = 'a';}, x => {x.duration_frames = 49;},
    x => {x.shots[0].cues.contact = 24;}]) {
    const bad = edit(); change(bad); assert.throws(() => createTimeline(bad));
  }
});

test('reading hold accounts for speech tail and text length', () => {
  assert.equal(readingHoldSeconds('', 0), 1.8);
  assert.equal(readingHoldSeconds('Short', 5), 5.6);
  assert.equal(readingHoldSeconds('x'.repeat(60), 1), 6);
  assert.throws(() => readingHoldSeconds('text', -1));
  assert.throws(() => readingHoldSeconds('text', 1, 0));
});

test('ink retains gaps and pressure without introducing non-finite geometry', () => {
  const line = [[0, 0], [400, 0]];
  const ink = inkSegments(line), solid = inkSegments(line, {gapFraction: 0});
  assert.ok(ink.length > 0 && ink.length < solid.length);
  assert.ok(new Set(ink.map(s => s.width)).size > 10);
  assert.deepEqual(ink, inkSegments(line));
  const subdivided = inkSegments([[0, 0], [200, 0], [400, 0]]);
  assert.equal(ink.length, subdivided.length);
  ink.forEach((segment, i) => {
    const other = subdivided[i];
    assert.equal(segment.width, other.width);
    [...segment.from, ...segment.to].forEach((value, j) =>
      assert.ok(Math.abs(value - [...other.from, ...other.to][j]) < 1e-10));
  });
  assert.deepEqual(inkSegments([[0, 0], [0, 0]]), []);
  for (const s of ink) assert.ok([...s.from, ...s.to, s.width].every(Number.isFinite));
  assert.throws(() => inkSegments([[NaN, 0], [1, 2]]));
  assert.throws(() => inkSegments(line, {step: 0}));
});

function recorder() {
  const commands = [], stack = [];
  const c = {commands, globalAlpha: 1,
    save() {stack.push(this.globalAlpha); commands.push(['save']);},
    restore() {this.globalAlpha = stack.pop(); commands.push(['restore']);},
  };
  for (const method of ['translate', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'fillRect']) {
    c[method] = (...args) => commands.push([method, ...args]);
  }
  return c;
}

test('fill offset is isolated from ink, and paper stays fixed across drawing calls', () => {
  const c = recorder();
  drawCel(c, [[0, 0], [100, 0], [50, 100]], '#fff', 8);
  const translation = c.commands.findIndex(x => x[0] === 'translate');
  const firstStroke = c.commands.findIndex(x => x[0] === 'stroke');
  assert.ok(translation > 0 && firstStroke > translation);
  assert.ok(c.commands.slice(translation, firstStroke).some(x => x[0] === 'restore'));
  const a = recorder(), b = recorder();
  drawPaper(a, 100, 100); drawPaper(b, 100, 100);
  assert.deepEqual(a.commands, b.commands);
  assert.equal(a.globalAlpha, 1);
  assert.throws(() => drawPaper(a, 0, 100));
  assert.equal(starPoints(0, 0, 100).length, 8);
});
