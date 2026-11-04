import {iso, palette, polygon, prism} from './atlas.mjs';
import {ease, renderMaterialLayers} from '../tools/runtime/layers.mjs';

function tiles(ctx, layer, progress) {
  const {cells, unit = 36} = layer;
  if (!Array.isArray(cells) || !Number.isFinite(unit) || unit <= 0)
    throw Error('tiles needs a cells array and a positive unit');
  const point = (x, y, z) => iso(x, y, z, {scale: unit});
  // Back-to-front in projected ground space, independent of input order.
  for (const cell of [...cells].sort((a, b) => (a.x + a.y) - (b.x + b.y))) {
    const {x, y, height = 1, heightTo = height} = cell;
    if (![x, y, height, heightTo].every(Number.isFinite) || Math.min(height, heightTo) < 0)
      throw Error('Tile coordinates and heights must be finite, with nonnegative heights');
    const z = height + (heightTo - height) * ease(progress);
    const top = [point(x, y, z), point(x + 1, y, z), point(x + 1, y + 1, z), point(x, y + 1, z)];
    const front = point(x + 1, y + 1, 0);
    polygon(ctx, [top[2], top[3], point(x, y + 1, 0), front], cell.left ?? palette.violet);
    polygon(ctx, [top[1], top[2], front, point(x + 1, y, 0)], cell.right ?? palette.teal);
    polygon(ctx, top, cell.top ?? palette.cyan);
  }
}

function draw(ctx, layer, state) {
  if (layer.type === 'prism') return prism(ctx, {...layer, rotation: layer.facetAngle ?? 0});
  if (layer.type === 'tiles') return tiles(ctx, layer, state.progress);
  throw Error(`Unknown atlas layer: ${layer.type}`);
}

export function materialStudy() {
  const cells = Array.from({length: 16}, (_, i) => {
    const x = i % 4, y = Math.floor(i / 4), selected = x === 2 && y === 2;
    return {x, y, height: .4 + .18 * y, heightTo: selected ? 2.8 : .4 + .18 * y,
      top: selected ? palette.gold : (x + y) % 2 ? palette.cyan : palette.highlight};
  });
  return [{type: 'tiles', x: 320, y: 100, unit: 46, cells}];
}

export const drawStyle = (ctx, state) => renderMaterialLayers(ctx, state, materialStudy, draw);
