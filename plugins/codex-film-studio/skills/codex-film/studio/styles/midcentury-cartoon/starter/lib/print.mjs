// Original Canvas 2D primitives; no film, character, font or renderer dependencies.
import {frameClock} from './timeline.mjs';

export const PALETTE = Object.freeze({
  paper: '#F4EAD5', cream: '#FBF6EA', ink: '#2B2420', coral: '#E4613F',
  mustard: '#E8B43A', teal: '#3FA7A0', blue: '#7F9CC0', olive: '#A7AE5B', pink: '#F0B4A8',
});

// Integer hashing avoids global RNG state and makes random seeking reproducible.
function noise(seed) {
  let n = seed | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function plateOffset(frame, {seed = 1, fps = 24, drawingsPerSecond = 12,
  x = 5.5, y = 3.5, jitter = 1.25} = {}) {
  const {poseFrame} = frameClock(frame, fps, drawingsPerSecond);
  if (![seed, x, y, jitter].every(Number.isFinite) || jitter < 0) throw new RangeError('Invalid registration');
  return [x + (noise(poseFrame * 31 + seed) * 2 - 1) * jitter,
    y + (noise(poseFrame * 31 + seed + 101) * 2 - 1) * jitter];
}

function pointsValid(points, minimum = 2) {
  if (!Array.isArray(points) || points.length < minimum ||
      points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
    throw new TypeError('Expected finite [x, y] points');
  }
}

// Pressure and ink loss follow arc length, so segment subdivision does not reset them.
export function inkSegments(points, {width = 4, seed = 1, closed = false,
  step = 2, gapFraction = 0.15, cycle = 110} = {}) {
  pointsValid(points);
  if (![width, seed, step, gapFraction, cycle].every(Number.isFinite) ||
      width <= 0 || step <= 0 || cycle <= 0 || gapFraction < 0 || gapFraction >= 1) {
    throw new RangeError('Invalid ink parameters');
  }
  const edges = [], count = points.length - (closed ? 0 : 1);
  let total = 0;
  for (let i = 0; i < count; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length) edges.push({a, b, start: total, end: total + length});
    total += length;
  }
  if (!total) return [];
  const phase = noise(seed) * cycle, segments = [];
  for (const edge of edges) {
    let s = edge.start;
    while (s < edge.end) {
      const next = Math.min(edge.end, (Math.floor(s / step) + 1) * step);
      if (next <= s) break;
      const mid = (s + next) / 2;
      if ((mid + phase) % cycle >= gapFraction * cycle) {
        const point = distance => {
          const t = (distance - edge.start) / (edge.end - edge.start);
          return [edge.a[0] + (edge.b[0] - edge.a[0]) * t,
            edge.a[1] + (edge.b[1] - edge.a[1]) * t];
        };
        const pressure = 1 + 0.24 * Math.sin(mid * 0.031 + seed) + 0.13 * Math.sin(mid * 0.084 + seed * 2);
        segments.push({from: point(s), to: point(next), width: width * pressure});
      }
      s = next;
    }
  }
  return segments;
}

export function drawInk(c, points, {color = PALETTE.ink, ...options} = {}) {
  const segments = inkSegments(points, options);
  c.save();
  try {
    c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const segment of segments) {
      c.lineWidth = segment.width; c.beginPath();
      c.moveTo(...segment.from); c.lineTo(...segment.to); c.stroke();
    }
  } finally { c.restore(); }
}

export function drawCel(c, points, fill, frame, options = {}) {
  pointsValid(points, 3);
  const offset = options.register === false ? [0, 0] : plateOffset(frame, options);
  c.save();
  try {
    c.translate(...offset); c.beginPath(); c.moveTo(...points[0]);
    for (const p of points.slice(1)) c.lineTo(...p);
    c.closePath(); c.fillStyle = fill; c.fill();
  } finally { c.restore(); }
  if (options.width !== 0) drawInk(c, points, {...options, closed: true});
  return offset;
}

export function starPoints(x, y, radius, tips = 4, inner = 0.3, rotation = 0) {
  if (![x, y, radius, inner, rotation].every(Number.isFinite) || radius <= 0 ||
      !Number.isSafeInteger(tips) || tips < 3 || inner <= 0 || inner >= 1) throw new RangeError('Invalid star');
  return Array.from({length: tips * 2}, (_, i) => {
    const angle = rotation - Math.PI / 2 + i * Math.PI / tips;
    const r = radius * (i % 2 ? inner : 1);
    return [x + r * Math.cos(angle), y + r * Math.sin(angle)];
  });
}

export function drawPaper(c, width, height, {seed = 1, density = 0.008, alpha = 0.035} = {}) {
  if (![width, height, seed, density, alpha].every(Number.isFinite) || width <= 0 || height <= 0 ||
      density < 0 || density > 1 || alpha < 0 || alpha > 1) throw new RangeError('Invalid paper');
  c.save();
  try {
    c.globalAlpha *= alpha;
    for (let i = 0; i < Math.floor(width * height * density); i++) {
      c.fillStyle = i % 2 ? PALETTE.ink : PALETTE.cream;
      c.fillRect(noise(seed + i * 3) * width, noise(seed + i * 3 + 1) * height,
        0.5 + noise(seed + i * 3 + 2), 1);
    }
  } finally { c.restore(); }
}
