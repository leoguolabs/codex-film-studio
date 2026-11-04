import {polygon, renderMaterialLayers} from '../tools/runtime/layers.mjs';

function screen(ctx, layer, profile) {
  const {points, pitch = 12} = layer;
  if (!Number.isFinite(pitch) || pitch < 2) throw Error('screen.pitch must be at least 2 pixels');
  polygon(ctx, points, layer.fill ?? profile.accent, layer.stroke ?? profile.ink, layer.width ?? 4);
  ctx.clip();
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.min(...xs), top = Math.min(...ys);
  const right = Math.max(...xs), bottom = Math.max(...ys);
  ctx.fillStyle = layer.ink ?? profile.ink;
  ctx.beginPath();
  for (let row = 0, y = top; y <= bottom + pitch; row++, y += pitch) {
    const radius = pitch * (.09 + .31 * (y - top) / Math.max(1, bottom - top));
    for (let x = left - (row % 2) * pitch / 2; x <= right + pitch; x += pitch) {
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

function stamp(ctx, layer, state) {
  const {text, size = 36, contactFrame = 0} = layer;
  if (!text || !(size > 0) || !Number.isInteger(contactFrame) || contactFrame < 0)
    throw Error('stamp needs text, a positive size and a nonnegative local contactFrame');
  const t = (state.localFrame - contactFrame) / state.plan.fps;
  if (t < 0) return;
  const bounce = .13 * Math.exp(-t * 15) * Math.cos(t * 36);
  ctx.scale(1 + bounce, 1 - bounce);
  ctx.font = `${size}px "Alfa Slab One"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(text).width + size * .9;
  ctx.fillStyle = ctx.strokeStyle = layer.ink ?? '#b92748';
  ctx.lineWidth = size * .1;
  ctx.strokeRect(-width / 2, -size * .8, width, size * 1.6);
  ctx.fillText(text, 0, 0);
}

function draw(ctx, layer, state) {
  if (layer.type === 'screen') return screen(ctx, layer, state.profile);
  if (layer.type === 'stamp') return stamp(ctx, layer, state);
  throw Error(`Unknown dossier layer: ${layer.type}`);
}

export function materialStudy() {
  return [
    {type: 'screen', x: 82, y: 70, points: [[0, 0], [300, -12], [350, 130], [28, 170]],
      pitch: 10, motion: {from: [72, 80], to: [104, 72]}},
    {type: 'stamp', x: 462, y: 226, rotation: -.12, text: 'A / 01', contactFrame: 14}
  ];
}

export const drawStyle = (ctx, state) => renderMaterialLayers(ctx, state, materialStudy, draw);
