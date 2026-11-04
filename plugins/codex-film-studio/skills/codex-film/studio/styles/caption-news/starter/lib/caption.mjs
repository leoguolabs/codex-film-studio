/** Pure entrance state; the production supplies frame timing and draws the text. */
export function progress(frame, start, duration) {
  if (![frame, start, duration].every(Number.isInteger) || duration <= 0) {
    throw new RangeError('Use integer frames and a positive entrance duration');
  }
  return Math.max(0, Math.min(1, (frame - start) / duration));
}

export function captionPose(frame, { start, duration, scaleFrom = 1.3, travelY = 0 }) {
  if (!Number.isFinite(scaleFrom) || scaleFrom <= 0 || !Number.isFinite(travelY)) {
    throw new RangeError('Caption scale and travel must be finite; scale must be positive');
  }
  const p = progress(frame, start, duration);
  const remaining = (1 - p) ** 3;
  return {
    visible: frame >= start,
    scale: 1 + (scaleFrom - 1) * remaining,
    offsetY: travelY * remaining,
    highlight: p,
  };
}
