// Stateless frame clock. All shot intervals are [start, end).
function rate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError('Frame rate must be a positive number');
  }
  return value;
}

function validFrame(frame) {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError('Invalid frame');
}

export function frameClock(frame, fps = 24, drawingsPerSecond = 12) {
  validFrame(frame); rate(fps); rate(drawingsPerSecond);
  if (drawingsPerSecond > fps) throw new RangeError('Drawing rate exceeds output rate');
  const poseFrame = Math.floor(frame * drawingsPerSecond / fps);
  return Object.freeze({frame, time: frame / fps, poseFrame, poseTime: poseFrame / drawingsPerSecond});
}

export function readingHoldSeconds(text, speechSeconds = 0, charsPerSecond = 12) {
  if (typeof text !== 'string' || !Number.isFinite(speechSeconds) || speechSeconds < 0) {
    throw new RangeError('Text and non-negative speech duration required');
  }
  rate(charsPerSecond);
  return Math.max(1.8, speechSeconds + 0.6, [...text].length / charsPerSecond + 1);
}

export function createTimeline(input) {
  const fps = rate(input.fps);
  const duration = input.duration_frames;
  if (input.draft !== false || !Number.isSafeInteger(duration) || duration <= 0 ||
      !Array.isArray(input.shots) || input.shots.length === 0) {
    throw new Error('A complete, non-draft timeline is required');
  }
  let end = 0;
  const ids = new Set();
  const shots = input.shots.map(source => {
    if (typeof source.id !== 'string' || !source.id.trim() || ids.has(source.id) ||
        typeof source.scene_type !== 'string' || !source.scene_type.trim() ||
        typeof source.headline !== 'string' || !Number.isSafeInteger(source.start) ||
        !Number.isSafeInteger(source.end) || source.start !== end || source.end <= source.start) {
      throw new Error('Shots require unique IDs, scene types, headlines and contiguous positive intervals');
    }
    const cues = {...(source.cues ?? {})};
    for (const frame of Object.values(cues)) {
      if (!Number.isSafeInteger(frame) || frame < source.start || frame >= source.end) {
        throw new Error('Action cues must be absolute frames inside their shot');
      }
    }
    ids.add(source.id); end = source.end;
    return Object.freeze({...source, cues: Object.freeze(cues)});
  });
  if (end !== duration) throw new Error('Shot coverage differs from duration_frames');
  return Object.freeze({
    fps, durationFrames: duration, shots: Object.freeze(shots),
    shotAt(frame) {
      validFrame(frame);
      if (frame >= duration) throw new RangeError('Frame outside film');
      let low = 0, high = shots.length - 1;
      while (low <= high) {
        const middle = (low + high) >> 1, shot = shots[middle];
        if (frame < shot.start) high = middle - 1;
        else if (frame >= shot.end) low = middle + 1;
        else return shot;
      }
      throw new Error('No shot for frame');
    },
  });
}
