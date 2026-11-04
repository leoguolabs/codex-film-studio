import {cubicPoint} from './worlds.mjs';
import {renderMaterialLayers} from '../tools/runtime/layers.mjs';

function light(ctx, x, y, radius, color) {
  if (!Number.isFinite(radius) || radius <= 0) throw Error('Light radius must be positive');
  const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
  halo.addColorStop(0, color);
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx, layer, state) {
  const {profile, plan} = state;
  if (layer.type === 'field') {
    const {width = plan.width, height = plan.height} = layer;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, layer.sky ?? profile.background);
    gradient.addColorStop(1, layer.horizon ?? '#356985');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (layer.type === 'route') {
    const [x, y] = cubicPoint(layer.points, state.progress);
    const [a, b, c, d] = layer.points;
    ctx.strokeStyle = layer.stroke ?? profile.accent;
    ctx.lineWidth = layer.width ?? 3;
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.bezierCurveTo(...b, ...c, ...d);
    ctx.stroke();
    light(ctx, x, y, layer.radius ?? 8, layer.emission ?? profile.ink);
  } else throw Error(`Unknown luminous layer: ${layer.type}`);
}

export function materialStudy() {
  return [
    {type: 'field', width: 640, height: 360, sky: '#182045', horizon: '#327d8e'},
    {type: 'shape', fill: '#285573', points: [[0, 240], [160, 124], [294, 222], [438, 166], [640, 238], [640, 360], [0, 360]]},
    {type: 'route', points: [[110, 218], [215, 26], [398, 290], [530, 112]],
      stroke: '#83e3ce', emission: '#ffe391'},
    {type: 'shape', fill: '#172c4e', points: [[0, 237], [124, 289], [318, 249], [490, 276], [640, 214], [640, 360], [0, 360]]}
  ];
}

export const drawStyle = (ctx, state) => renderMaterialLayers(ctx, state, materialStudy, draw);
