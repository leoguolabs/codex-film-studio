// Generic frame clocks and shot boundaries; no scenes, dialogue or country data.
function positiveRate(value) {
  let rate = value;
  if (typeof value === 'string' && /^\d+\/\d+$/.test(value)) {
    const [numerator, denominator] = value.split('/').map(Number);
    rate = numerator / denominator;
  }
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('Frame rate must be positive');
  }
  return rate;
}

export function drawingIndex(frame, fps = 24, drawingsPerSecond = 12) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError('Invalid frame');
  return Math.floor(frame * positiveRate(drawingsPerSecond) / positiveRate(fps));
}

export function createTimeline(input) {
  const fps = positiveRate(input.fps), duration = input.duration_frames;
  if (input.draft !== false || !Number.isSafeInteger(duration) || duration <= 0 ||
      !Array.isArray(input.shots) || input.shots.length === 0) {
    throw new Error('A complete, non-draft shot timeline is required');
  }
  let end = 0;
  const ids = new Set();
  const shots = input.shots.map(shot => {
    if (typeof shot.id !== 'string' || !shot.id.trim() || ids.has(shot.id) ||
        typeof shot.scene_type !== 'string' || !shot.scene_type.trim() ||
        !Number.isSafeInteger(shot.start) || !Number.isSafeInteger(shot.end) ||
        shot.start !== end || shot.end <= shot.start) {
      throw new Error('Shots need unique IDs, scene types and contiguous positive ranges');
    }
    ids.add(shot.id); end = shot.end;
    return Object.freeze({...shot});
  });
  if (end !== duration) throw new Error('Shot coverage differs from duration_frames');
  return Object.freeze({
    fps, durationFrames: duration, shots: Object.freeze(shots),
    shotAt(frame) {
      if (!Number.isSafeInteger(frame) || frame < 0 || frame >= duration) {
        throw new RangeError('Frame is outside the half-open film interval');
      }
      let low = 0, high = shots.length - 1;
      while (low <= high) {
        const middle = (low + high) >> 1, shot = shots[middle];
        if (frame < shot.start) high = middle - 1;
        else if (frame >= shot.end) low = middle + 1;
        else return shot;
      }
      throw new Error('Unreachable shot interval');
    },
  });
}
