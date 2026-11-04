import {ease, renderMaterialLayers} from '../tools/runtime/layers.mjs';

function wireframe(ctx, layer, state) {
  const {vertices, edges, yaw = 0, yawTo = yaw, pitch = .25} = layer;
  if (!vertices?.length || !Array.isArray(edges) ||
      !vertices.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)))
    throw Error('wireframe needs finite [x,y,z] vertices and indexed edges');
  const angle = yaw + (yawTo - yaw) * ease(state.progress);
  const points = vertices.map(([x, y, z]) => {
    const horizontal = x * Math.cos(angle) - z * Math.sin(angle);
    const depth = x * Math.sin(angle) + z * Math.cos(angle);
    return [horizontal, y * Math.cos(pitch) - depth * Math.sin(pitch),
      y * Math.sin(pitch) + depth * Math.cos(pitch)];
  });
  const depths = points.map(p => p[2]), min = Math.min(...depths), max = Math.max(...depths);
  ctx.strokeStyle = ctx.shadowColor = layer.ink ?? state.profile.accent;
  ctx.shadowBlur = layer.glow ?? 4;
  ctx.lineWidth = layer.width ?? 2;
  const segments = edges.map(edge => {
    if (!Array.isArray(edge) || edge.length !== 2 ||
        !edge.every(i => Number.isInteger(i) && i >= 0 && i < points.length))
      throw Error('wireframe edge index outside vertex array');
    return edge.map(i => points[i]);
  }).sort(([a,b], [c,d]) => (a[2] + b[2]) - (c[2] + d[2]));
  for (const [a, b] of segments) {
    ctx.globalAlpha = .28 + .72 * ((a[2] + b[2]) / 2 - min) / (max - min || 1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  if (layer.scan) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const top = Math.min(...ys), bottom = Math.max(...ys);
    const y = top + (bottom - top) * state.progress;
    const left = Math.min(...xs) - 8, right = Math.max(...xs) + 8;
    ctx.shadowBlur = 0;
    ctx.globalAlpha = .12;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(left, y - 7, right - left, 14);
    ctx.globalAlpha = .9;
    ctx.fillRect(left, y, right - left, 1.5);
  }
}

function draw(ctx, layer, state) {
  if (layer.type === 'wireframe') return wireframe(ctx, layer, state);
  if (layer.type !== 'projector') throw Error(`Unknown HUD layer: ${layer.type}`);
  ctx.strokeStyle = layer.ink ?? state.profile.accent;
  for (const ratio of [1, .94, .62]) {
    ctx.globalAlpha = ratio === .94 ? .55 : .25;
    ctx.beginPath();
    ctx.ellipse(0, 0, layer.radius * ratio, layer.radius * ratio * .19, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

export function materialStudy() {
  const vertices = [], edges = [];
  for (const [y, radius] of [[-67,46], [-16,102], [52,76]]) {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, index = vertices.length;
      vertices.push([radius * Math.cos(angle), y, radius * Math.sin(angle)]);
      edges.push([index, index - i + (i + 1) % 8]);
      if (index >= 8) edges.push([index - 8, index]);
    }
  }
  return [{type: 'projector', x: 320, y: 250, radius: 150},
    {type: 'wireframe', x: 320, y: 152, vertices, edges, yaw: -.6, yawTo: .85, scan: true}];
}

export const drawStyle = (ctx, state) => renderMaterialLayers(ctx, state, materialStudy, draw);
