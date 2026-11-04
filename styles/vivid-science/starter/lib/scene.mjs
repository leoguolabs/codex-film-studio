import {Path2D} from '@napi-rs/canvas';
import {cubicRibbonPath, ellipse, lerp, palette} from './vector.mjs';
import {ease, renderMaterialLayers} from '../tools/runtime/layers.mjs';

function draw(ctx, layer, state) {
  if (layer.type === 'body') {
    const {rx, ry, fill = palette.coral, shadow = palette.plum, highlight = palette.cream} = layer;
    if (![rx, ry].every(v => Number.isFinite(v) && v > 0)) throw Error('body needs positive rx and ry');
    ellipse(ctx, 0, 0, rx, ry, shadow);
    ctx.clip();
    ellipse(ctx, -rx * .09, -ry * .14, rx, ry, fill);
    ctx.rotate(-.38);
    ellipse(ctx, -rx * .18, -ry * .64, rx * .38, ry * .12, highlight);
  } else if (layer.type === 'ribbon') {
    let points = layer.points;
    if (layer.pointsTo) {
      if (![points, layer.pointsTo].every(path => Array.isArray(path) && path.length === 4 &&
          path.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))))
        throw Error('ribbon pose needs four pairs of coordinates at each endpoint');
      const t = ease(state.progress);
      points = points.map((p, i) => p.map((v, j) => lerp(v, layer.pointsTo[i][j], t)));
    }
    ctx.fillStyle = layer.fill ?? palette.cyan;
    ctx.fill(new Path2D(cubicRibbonPath(points, layer)));
  } else throw Error(`Unknown vivid layer: ${layer.type}`);
}

export function materialStudy() {
  return [
    {type: 'ribbon', x: 250, y: 160, rootWidth: 28, tipWidth: 4,
      points: [[0, 0], [110, -95], [150, 110], [255, 28]],
      pointsTo: [[0, 0], [105, 85], [170, -140], [255, -56]]},
    {type: 'body', x: 240, y: 156, rx: 80, ry: 65}
  ];
}

export const drawStyle = (ctx, state) => renderMaterialLayers(ctx, state, materialStudy, draw);
