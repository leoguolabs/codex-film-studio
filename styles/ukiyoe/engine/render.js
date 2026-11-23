import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { GlobalFonts, loadImage } from '@napi-rs/canvas';
import { film } from '../film.js';
import {
  mk,
  W,
  H,
  FR,
  PAL,
  TX,
  buildTextures,
  inkify,
  stampLayer,
  cartouche,
  sealCanvas,
} from './print.js';
import { ss, clamp, lerp } from './lib.js';

const fps = 24,
  gap = 260,
  stride = W + gap;
const args = process.argv.slice(2);
const opt = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback);
const frames = film.sheets.reduce((a, s) => a + Math.round(s.seconds * fps), 0);
if (!frames) throw Error('Author the sheets in film.js first.');
const times = [];
let elapsed = 0;
for (const [i, s] of film.sheets.entries()) {
  times[i] = elapsed;
  elapsed += Math.round(s.seconds * fps) / fps;
}
const cues = JSON.parse(fs.readFileSync('content/cues.json'));
for (const c of cues)
  if (c.end > elapsed || c.end <= c.start)
    throw Error('Caption timing outside film: ' + JSON.stringify(c));
GlobalFonts.registerFromPath('fonts/shippori.ttf', 'Shippori');
GlobalFonts.registerFromPath('fonts/shippori.ttf', 'Yuji');
buildTextures();
const raster = async (c) => loadImage(c.toBuffer('image/png'));

// A production can animate articulated performances on ones while retaining
// the held drawings of an existing print in other shots.
function poseTime(time, rate) {
  return Math.floor(time * rate + 1e-7) / rate;
}

const offsets = [
  [0, 0],
  [2.2, -1.3],
  [-1.8, 1.9],
  [1.5, 2.2],
];
const width = Number(opt('--width', W)),
  height = (width * H) / W;
const output = mk(width, height),
  ctx = output.getContext('2d');
const plates = [],
  introLayers = new Map(),
  keys = new Map();
const slot = (i) => (film.sheets.length - 1 - i) * stride;
const clip = (x) => {
  x.beginPath();
  x.rect(FR.x0, FR.y0, FR.x1 - FR.x0, FR.y1 - FR.y0);
  x.clip();
};
function rule(x) {
  x.strokeStyle = PAL.sumi;
  x.lineWidth = 3.4;
  x.strokeRect(44, 38, 1832, 1004);
  x.lineWidth = 1.3;
  x.strokeRect(35, 29, 1850, 1022);
}
function slip(x, s, index) {
  const cx = s.side === 'left' ? 127 : 1793,
    y = 76;
  const r = cartouche(x, cx, y, s.name.toUpperCase(), {
    series: String(index + 1).padStart(2, '0'),
    w: 78,
    size: 38,
    ssize: 23,
  });
  x.drawImage(sealCanvas(film.seal || 'S', 45, { seed: 20 + index }), cx - 28, r.y0 + r.h + 5);
}
for (const [index, s] of film.sheets.entries()) {
  const sheet = mk(),
    x = sheet.getContext('2d');
  x.drawImage(TX.paper, 0, 0);
  const keep = index === 0 || s.reprint,
    blocks = [];
  x.save();
  clip(x);
  for (const [j, l] of s.layers.entries()) {
    const c = mk(),
      b = c.getContext('2d');
    b.save();
    l.draw(b);
    b.restore();
    const group = l.g ?? 1;
    inkify(c, {
      grain: l.grain ?? (group ? 0.07 : 0),
      speck: l.speck ?? (group ? 0.34 : 0.14),
      baren: l.baren ?? (group ? 0.33 : 0.1),
      gx: -130 + j * 43,
      bx: -80 + j * 22,
    });
    const img = await raster(c);
    x.drawImage(img, ...offsets[group]);
    if (keep) blocks.push({ img, group });
  }
  x.restore();
  rule(x);
  x.drawImage(TX.fiber, 0, 0);
  const base = await raster(sheet);
  if (keep) {
    introLayers.set(index, blocks);
    // Make a separate black impression from the boundaries of the authored blocks.
    // Ignore the small color changes produced by paper fibres and mottling.
    const rgb = sheet.data(),
      key = mk(),
      kx = key.getContext('2d'),
      mask = kx.createImageData(W, H);
    const light = new Uint8Array(W * H);
    for (let n = 0; n < light.length; n++)
      light[n] = (rgb[4 * n] * 54 + rgb[4 * n + 1] * 183 + rgb[4 * n + 2] * 19) >> 8;
    for (let y = 41; y < 1039; y++)
      for (let col = 47; col < 1873; col++) {
        const n = y * W + col,
          center = light[n];
        const contrast =
          Math.max(light[n - 2], light[n + 2], light[n - W * 2], light[n + W * 2]) - center;
        if (contrast < 26) continue;
        mask.data[4 * n] = 35;
        mask.data[4 * n + 1] = 31;
        mask.data[4 * n + 2] = 28;
        mask.data[4 * n + 3] = Math.min(218, (contrast - 25) * 2.5);
      }
    kx.putImageData(mask, 0, 0);
    keys.set(index, await raster(key));
  }
  const rep =
    s.representAt ?? (index === film.sheets.length - 1 ? s.seconds - 7.2 : s.seconds * 0.58);
  const proof = mk(),
    p = proof.getContext('2d');
  p.drawImage(base, 0, 0);
  p.save();
  clip(p);
  s.motion?.(p, poseTime(rep, s.motionFps ?? film.motionFps ?? 8), s.seconds);
  s.weather?.(p, poseTime(rep, s.weatherFps ?? film.weatherFps ?? 12), s.seconds);
  p.restore();
  slip(p, s, index);
  s.escape?.(p, poseTime(rep, s.weatherFps ?? film.weatherFps ?? 12), s.seconds);
  const thumb = mk(640, 360);
  thumb.getContext('2d').drawImage(proof, 0, 0, 640, 360);
  plates.push({ base, thumb: await raster(thumb) });
}
const paper = await raster(TX.paper);
const fabric = mk(128, 128),
  fx = fabric.getContext('2d');
fx.fillStyle = PAL.mount;
fx.fillRect(0, 0, 128, 128);
for (let i = 0; i < 128; i += 4) {
  fx.fillStyle = 'rgba(92,65,32,.10)';
  fx.fillRect(i, 0, 0.8, 128);
  fx.fillStyle = 'rgba(245,230,195,.26)';
  fx.fillRect(0, i, 128, 1);
}
const weave = ctx.createPattern(fabric, 'repeat');
function backdrop(x) {
  x.fillStyle = '#191d24';
  x.fillRect(-40000, -15000, 80000, 30000);
  x.fillStyle = weave;
  x.fillRect(-120, -530, stride * plates.length - gap + 240, H + 1060);
  x.fillStyle = '#917950';
  x.fillRect(-120, -530, stride * plates.length - gap + 240, 16);
  x.fillRect(-120, H + 514, stride * plates.length - gap + 240, 16);
  const grad = x.createLinearGradient(-220, 0, -90, 0);
  grad.addColorStop(0, '#7a6447');
  grad.addColorStop(0.43, '#ddc89e');
  grad.addColorStop(1, '#887353');
  x.fillStyle = grad;
  x.fillRect(-220, -550, 130, H + 1100);
  x.fillStyle = '#48382c';
  x.fillRect(-190, -620, 70, 70);
  x.fillRect(-190, H + 550, 70, 70);
}
function drawSheet(x, i, t) {
  const s = film.sheets[i],
    local = Math.max(0, t - times[i]),
    beg = s.reprint ? 1.38 : 0.35;
  x.save();
  x.translate(slot(i), 0);
  if (introLayers.has(i) && local < beg + 2.39) {
    x.drawImage(paper, 0, 0);
    if (local > beg) {
      x.save();
      x.globalAlpha = ss((local - beg) / 0.25);
      rule(x);
      x.restore();
    }
    x.save();
    clip(x);
    stampLayer(x, keys.get(i), clamp((local - beg) / 0.34));
    for (const { img, group } of introLayers.get(i))
      stampLayer(
        x,
        img,
        clamp((local - beg - group * (s.reprint ? 0.51 : 0.64)) / 0.34),
        offsets[group],
      );
    x.restore();
  } else x.drawImage(plates[i].base, 0, 0);
  const visible = !introLayers.has(i) || local >= beg + 1.78;
  if (visible) {
    x.save();
    clip(x);
    s.motion?.(x, poseTime(local, s.motionFps ?? film.motionFps ?? 8), s.seconds);
    s.weather?.(x, poseTime(local, s.weatherFps ?? film.weatherFps ?? 12), s.seconds);
    x.restore();
    x.save();
    x.globalAlpha = ss((local - (introLayers.has(i) ? beg + 2.0 : 0.55)) / 0.3);
    const closing = s.cartoucheAt ?? s.seconds - (i === film.sheets.length - 1 ? 8.7 : 2.55);
    x.globalAlpha = ss((local - closing) / 0.28);
    if (x.globalAlpha > 0) {
      x.translate(0, 8 * (1 - x.globalAlpha));
      slip(x, s, i);
    }
    x.restore();
    s.escape?.(x, poseTime(local, s.weatherFps ?? film.weatherFps ?? 12), s.seconds);
  }
  x.restore();
}
const captionCache = new Map();
function caption(x, c, t) {
  if (!captionCache.has(c)) {
    const measure = mk(2, 2).getContext('2d');
    measure.font = '42px Shippori';
    let size = 42;
    const measured = measure.measureText(c.text).width;
    if (measured > 1580) size = Math.floor((42 * 1580) / measured);
    if (size < 31) throw Error('Split long subtitle: ' + c.text);
    measure.font = size + 'px Shippori';
    const w = Math.ceil(measure.measureText(c.text).width + 150);
    const box = mk(w + 6, 82),
      b = box.getContext('2d');
    b.translate(3, 3);
    b.fillStyle = 'rgba(243,231,198,.96)';
    b.fillRect(0, 0, w, 74);
    b.strokeStyle = PAL.sumi;
    b.lineWidth = 2.6;
    b.strokeRect(0, 0, w, 74);
    b.lineWidth = 1;
    b.strokeRect(5, 5, w - 10, 64);
    b.drawImage(sealCanvas(film.seal || 'S', 40, { seed: 7 }), 24, 10);
    b.fillStyle = PAL.sumi;
    b.font = size + 'px Shippori';
    b.textBaseline = 'middle';
    b.fillText(c.text, 96, 38);
    captionCache.set(c, box);
  }
  const box = captionCache.get(c),
    a = ss((t - c.start) / 0.18);
  x.save();
  x.globalAlpha = 1 - ss((t - c.end + 0.24) / 0.24);
  x.beginPath();
  x.rect((W - box.width) / 2, 929, box.width * a, 88);
  x.clip();
  x.drawImage(box, (W - box.width) / 2, 931);
  x.restore();
}
function frame(n) {
  const t = n / fps;
  let i = times.findLastIndex((v) => v <= t);
  const s = film.sheets[i],
    local = t - times[i];
  const pull = ss((t - (elapsed - 7.2)) / 3.5),
    track = slot(i);
  const slideLen = s.slide ?? film.slide ?? 1.12,
    slide =
      i < plates.length - 1 && !film.sheets[i + 1].reprint
        ? ss((local - (s.seconds - slideLen)) / slideLen)
        : 0;
  const view = s.camera?.(local, s.seconds) ?? {};
  let z = lerp(view.zoom ?? 1, 1, slide),
    cx = track + W / 2 + (view.x ?? 0) * (1 - slide) - stride * slide,
    cy = H / 2 + (view.y ?? 0) * (1 - slide);
  if (pull) {
    const fit = W / (stride * plates.length - gap + 600);
    z = lerp(z, fit, pull);
    cx = lerp(cx, (stride * plates.length - gap) / 2, pull);
    cy = lerp(cy, H / 2, pull);
  }
  const scale = width / W;
  ctx.resetTransform();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.scale(scale, scale);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
  backdrop(ctx);
  for (let k = 0; k < plates.length; k++) {
    if (slot(k) + W < cx - W / (2 * z) - 100 || slot(k) > cx + W / (2 * z) + 100) continue;
    if (pull > 0 && (k !== i || z < 0.45)) {
      ctx.drawImage(plates[k].thumb, slot(k), 0, W, H);
    } else drawSheet(ctx, k, pull > 0 ? elapsed - 7.2 : t);
  }
  ctx.restore();
  const c = cues.find((v) => v.start <= t && t < v.end);
  if (c) caption(ctx, c, t);
  if (pull > 0.82) {
    ctx.globalAlpha = ss((pull - 0.82) / 0.18);
    ctx.fillStyle = PAL.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '67px Shippori';
    ctx.fillText(film.title, W / 2, 274);
    ctx.font = '32px Shippori';
    ctx.fillText(film.subtitle || '', W / 2, 346);
    ctx.font = '35px Shippori';
    ctx.fillText('U K I Y O - E', W / 2, 795);
    ctx.drawImage(sealCanvas(film.seal || 'S', 58), W / 2 - 35, 848);
    ctx.globalAlpha = 1;
  }
}
fs.mkdirSync('media', { recursive: true });
if (args.includes('--stills')) {
  fs.mkdirSync('review/stills', { recursive: true });
  const selected = opt('--times', null);
  const list = selected
    ? selected.split(',').map(Number)
    : times.map((t, i) => t + film.sheets[i].seconds * 0.5).concat([elapsed - 1]);
  for (const t of list) {
    frame(Math.min(frames - 1, Math.round(t * fps)));
    fs.writeFileSync('review/stills/' + t.toFixed(2) + '.jpg', output.toBuffer('image/jpeg', 91));
  }
} else {
  const start = Number(opt('--start', 0)),
    end = Number(opt('--end', frames));
  const out = opt('--out', 'media/film.mp4'),
    sound = opt('--sound', 'media/mix.wav');
  if (!fs.existsSync(sound)) throw Error('Render the soundtrack to ' + sound);
  const target = path.join(path.dirname(out), '.' + path.basename(out) + '.partial.mp4');
  const ff = spawn(
    'python3',
    [
      'ffmpeg_serial.py',
      '--',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      width + 'x' + height,
      '-r',
      '24',
      '-i',
      'pipe:0',
      '-ss',
      String(start / fps),
      '-i',
      sound,
      '-t',
      String((end - start) / fps),
      '-c:v',
      'libx264',
      '-threads',
      '4',
      '-preset',
      'veryfast',
      '-crf',
      '17',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-metadata:s:a:0',
      'language=eng',
      '-movflags',
      '+faststart',
      target,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = once(ff, 'close');
  ff.stdin.on('error', (e) => {
    if (e.code !== 'EPIPE') throw e;
  });
  for (let n = start; n < end; n++) {
    frame(n);
    const raw = output.data();
    if (!ff.stdin.write(raw)) await once(ff.stdin, 'drain');
    if (n % 480 === 0) console.error('frame', n, '/', end);
  }
  ff.stdin.end();
  const [code] = await done;
  if (code !== 0) throw Error('Encoder exit ' + code);
  fs.renameSync(target, out);
}
