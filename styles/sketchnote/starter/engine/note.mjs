// SPDX-License-Identifier: MIT
// Drawing primitives adapted from Lemomo (LemoLab). See LICENSE-MIT.txt.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCanvas, Path2D, GlobalFonts } from '@napi-rs/canvas';

const fontPath = name => fileURLToPath(new URL('../fonts/' + name, import.meta.url));
GlobalFonts.registerFromPath(fontPath('Kalam-Bold.ttf'), 'KB');
GlobalFonts.registerFromPath(fontPath('PatrickHand-Regular.ttf'), 'PH');
const glyphs = JSON.parse(fs.readFileSync(fontPath('glyphs.json'), 'utf8'));
export function prepareFilm(film, captions = []) {
const W = 1920, H = 1080, FPS = 24;
const cv = createCanvas(W, H), ctx = cv.getContext('2d');
const OC = createCanvas(W, H), octx = OC.getContext('2d');
// ---------- palette: paper, one fineliner, grey marker in three strengths, one yellow ----------
// The accent (yellow) is a multiply marker; the volume colour (grey) is the same marker laid in three strengths.
const PL = { paper: '#fbfaf6', ink: [30, 30, 34], ink2: '#5b5852',
  acc: [255, 205, 40], accA: 0.80, accD: [245, 170, 0], accS: [232, 140, 0],
  shd: [100, 100, 110], shd2: [80, 80, 92], shd3: [52, 52, 64], dot: [150, 144, 132], ...film.palette };
const rgba = (c, a) => `rgba(${c.map(v => Math.round(v)).join(',')},${a})`;
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const PAPER = PL.paper, DOT = rgba(PL.dot || PL.shd.map(v => v * 0.5 + 95), 0.55);
const INK = hex(PL.ink), INK2 = PL.ink2;                       // pen, secondary pen (small notes)
const YEL = rgba(PL.acc, PL.accA), YELD = rgba(PL.accD, 0.95), YELS = rgba(PL.accS, 0.22);   // the one accent colour
const GRY = rgba(PL.shd, 0.16), GRY2 = rgba(PL.shd2 || PL.shd.map(v => v * 0.8), 0.28), GRYD = rgba(PL.shd3 || PL.shd.map(v => v * 0.52), 0.45);
const INKM = a => rgba(PL.ink, a);                             // solid ink
const TAU = Math.PI * 2;

// ---------- seeded randomness ----------
let SEED = 1, BOIL = 0;
function rnd() { SEED |= 0; SEED = SEED + 0x6D2B79F5 | 0; let t = Math.imul(SEED ^ SEED >>> 15, 1 | SEED); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const BO = [0, 1, -0.8];   // boil offsets: three drawings, cycled on twos

// ---------- geometry ----------
function resample(pts, step = 3) {
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 1; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}
function plen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
function noiseFn(amp) {   // static shape + a small boil phase shift
  const ks = [[amp, rr(0.003, 0.008), rr(0, TAU), rr(0.35, 0.7)], [amp * 0.5, rr(0.012, 0.022), rr(0, TAU), rr(0.35, 0.7)], [amp * 0.22, rr(0.035, 0.06), rr(0, TAU), rr(0.35, 0.7)]];
  const b = BO[BOIL];
  return s => ks.reduce((a, [A, f, p, d]) => a + A * Math.sin(f * s + p + d * b), 0);
}
function jitter(pts, amp) {
  const P = resample(pts, 3), n = noiseFn(amp), out = []; let s = 0;
  for (let i = 0; i < P.length; i++) {
    if (i) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const d = n(s); out.push([P[i][0] - ty * d, P[i][1] + tx * d]);
  }
  return out;
}
const line = (x1, y1, x2, y2) => [[x1, y1], [x2, y2]];
function ell(cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 90, rot = 0) { const p = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, x = rx * Math.cos(a), y = ry * Math.sin(a); p.push([cx + x * c - y * s, cy + x * s + y * c]); } return p; }
function rrect(x, y, w, h, r) {
  const p = [];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 8; i++) { const a = a0 + Math.PI / 2 * i / 8; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  return p;
}
function bez(p0, p1, p2, p3, n = 40) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
function hexPts(cx, cy, r, rot = 0) { const p = []; for (let i = 0; i < 6; i++) { const a = rot + i / 6 * TAU; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; }
function pathOf(pts, close = true) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (close) p.closePath(); return p; }
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; }

// ---------- pen (fineliner) ----------
function inkDraw(pts, o, prog) {
  let { w = 3, amp = 1.5, passes = 2, col = INK, closed = false, alpha = 1, dash = null } = o;
  w *= 1.2; let base;
  if (closed) {   // overshoot the join a little, start at a random point
    base = resample(pts.concat([pts[0]]), 3);
    const st = Math.floor(rr(0, base.length)); base = base.slice(st).concat(base.slice(1, st + 1));
    base = base.concat(base.slice(1, 2 + Math.floor(base.length * rr(0.02, 0.05))));
  } else base = resample(pts, 3);
  ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    const P = jitter(base, amp * (p ? 1.4 : 1)); const n = Math.max(2, Math.floor(P.length * prog));
    const wn = noiseFn(0.22); ctx.globalAlpha = alpha * (p ? 0.5 : 0.94);
    let s = 0;
    for (let i = 0; i < n - 1; i += 6) {
      let on = true;
      if (dash) on = (s % (dash[0] + dash[1])) < dash[0];
      const end = Math.min(n - 1, i + 6);
      for (let j = i + 1; j <= end; j++) s += Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]);
      if (!on) continue;
      ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); for (let j = i + 1; j <= end; j++) ctx.lineTo(P[j][0], P[j][1]);
      ctx.lineWidth = w * (p ? 0.62 : 1) * (1 + wn(i * 3)); ctx.stroke();
    }
  }
  ctx.restore();
}
// ---------- marker (semi-transparent, multiply, streaky) ----------
function markerDraw(clips, o, prog) {
  const { col = GRY, w = 18, ang = -0.55, gap = 0.62, amp = 2.2, edge = true, op = 'multiply' } = o;
  const region = jitter(clips[0].concat([clips[0][0]]), amp);
  const [x0, y0, x1, y1] = bbox(region), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + w;
  const strokes = []; for (let o2 = -R; o2 < R; o2 += w * gap * rr(0.85, 1.15)) strokes.push([o2, w * rr(0.9, 1.08), rr(-4, 4), rr(-6, 6), rr(-6, 6), rr(-2, 2)]);
  ctx.save();
  ctx.clip(pathOf(region));
  if (clips.length > 1) { const p = pathOf(region); for (let i = 1; i < clips.length; i++) p.addPath(pathOf(clips[i])); ctx.clip(p, 'evenodd'); }
  ctx.globalCompositeOperation = op; ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.translate(cx, cy); ctx.rotate(ang);
  const stop = -R + 2 * R * prog;
  for (const [o2, lw, bow, a, b, c] of strokes) {
    if (o2 >= stop) break;
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-R + a, o2); ctx.quadraticCurveTo(0, o2 + bow, R + b, o2 + c); ctx.stroke();
  }
  ctx.restore();
  if (edge && prog >= 1) { ctx.save(); ctx.clip(pathOf(region)); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 4; ctx.stroke(pathOf(region)); ctx.restore(); }
}
function mstrokeDraw(pts, o, prog) {   // a single marker stroke (rays, swashes)
  const { col = YEL, w = 8, amp = 1 } = o; const P = jitter(pts, amp); const n = Math.max(2, Math.ceil(P.length * prog));
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(pathOf(P.slice(0, n), false)); ctx.restore();
}

// ---------- hand lettering, written stroke by stroke along glyph skeletons ----------
const GLY = glyphs;

function textLayout(s, x, y, size, o = {}) {
  const { f = 'PH', align = 'left', jit = 1, sp = 0.98, rot = 0 } = o;
  ctx.save(); ctx.font = `${size}px ${f}`;
  const ch = [...s], ws = ch.map(c => ctx.measureText(c).width * sp); ctx.restore();
  const tot = ws.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? -tot / 2 : align === 'right' ? -tot : 0;
  const G = GLY[f], chars = []; let L = 0;
  ch.forEach((c, i) => {
    const dy = rr(-1, 1) * jit * size * 0.03, r = rr(-1, 1) * jit * 0.045, k = rr(-1, 1);
    const sk = (G.g[c] || []).map(a => { const P = []; for (let j = 0; j < a.length; j += 2) P.push([a[j] * size, a[j + 1] * size]); return P; });
    const lens = sk.map(plen); const len = lens.reduce((a, b) => a + b, 0) + sk.length * size * 0.12;
    chars.push({ c, ox: cx, dy, r, sk, lens, len, L0: L }); L += len;
    cx += ws[i] * (1 + k * 0.02);
  });
  return { s, x, y, size, f, rot, chars, L, hw: G.hw * size, tot, col: o.col || INK };
}
function textDraw(T, prog) {
  const target = prog * T.L;
  ctx.save(); ctx.translate(T.x, T.y); ctx.rotate(T.rot);
  ctx.font = `${T.size}px ${T.f}`; ctx.fillStyle = T.col; ctx.textBaseline = 'alphabetic';
  for (const C of T.chars) {
    if (C.L0 >= target) break;
    const part = target - C.L0;
    ctx.save(); ctx.translate(C.ox, C.dy); ctx.rotate(C.r);
    if (part >= C.len || !C.sk.length) { ctx.fillText(C.c, 0, 0); ctx.restore(); continue; }
    // partial glyph: draw it on the side canvas, keep only what the pen has covered
    const m = ctx.getTransform();
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f); octx.font = ctx.font; octx.fillStyle = T.col; octx.textBaseline = 'alphabetic';
    octx.fillText(C.c, 0, 0);
    octx.globalCompositeOperation = 'destination-in'; octx.lineCap = 'round'; octx.lineJoin = 'round'; octx.lineWidth = T.hw * 2.9 + 1.5; octx.strokeStyle = '#000';
    let left = part;
    octx.beginPath();
    for (let k = 0; k < C.sk.length && left > 0; k++) {
      const P = C.sk[k]; octx.moveTo(P[0][0], P[0][1]); if (P.length === 1) octx.lineTo(P[0][0] + 0.1, P[0][1]);
      for (let j = 1; j < P.length && left > 0; j++) {
        const d = Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]);
        if (d <= left) { octx.lineTo(P[j][0], P[j][1]); left -= d; }
        else { const u = left / d; octx.lineTo(P[j - 1][0] + (P[j][0] - P[j - 1][0]) * u, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * u); left = 0; }
      }
      left -= T.size * 0.12;
    }
    octx.stroke(); octx.globalCompositeOperation = 'source-over';
    ctx.restore(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(OC, 0, 0); ctx.restore();
  }
  ctx.restore();
}

// ---------- timeline of strokes ----------
// Each element = one pen/marker action with a start time and a duration; drawn in registration order (z).
const EL = [];
let BSEED = 1000;
function addEl(t0, d, kind, draw, wx) { EL.push({ t0, d: Math.max(d, 1 / FPS), kind, draw, seed: (BSEED += 7919), wx }); return t0 + d; }
const cen = pts => { const b = bbox(pts); return (b[0] + b[2]) / 2; };
const INK_ = (pts, o, t0, d) => addEl(t0, d, 'pen', p => inkDraw(pts, o, p), cen(pts));
const MRK = (clips, o, t0, d) => addEl(t0, d, 'marker', p => markerDraw(clips, o, p), cen(clips[0]));
const MST = (pts, o, t0, d) => addEl(t0, d, 'marker', p => mstrokeDraw(pts, o, p), cen(pts));
const FILL = (pts, t0) => addEl(t0, 0, 'fill', () => { ctx.save(); ctx.fillStyle = PAPER; ctx.fill(pathOf(pts)); ctx.restore(); }, cen(pts));
const PAGE_TEXTS = [];   // every written text, for window.TEXTS (reading-time check)
function TXT(s, x, y, size, o, t0, d) {
  const T = textLayout(s, x, y, size, o);
  const end = addEl(t0, d == null ? T.L / (o.cps || 2200) : d, 'write', p => textDraw(T, p), x + (o.align === 'center' ? 0 : T.tot / 2));
  PAGE_TEXTS.push({ T, t0: EL[EL.length - 1].t0 });
  return end;
}

// ---------- composite parts ----------
function dropShadow(pts, dx, dy, t0, d = 0.12, o = {}) { MRK([shift(pts, dx, dy), pts], { col: GRY2, w: 12, ...o }, t0, d); }
function box(x, y, w, h, t0, d = 0.32) {
  const p = rrect(x, y, w, h, 28);
  dropShadow(p, 9, 10, t0 + d * 0.9);
  return INK_(p, { closed: true, w: 3.2, amp: 1.6 }, t0, d) + 0.12;
}
function ribbon(cx, cy, w, h, label, size, t0, o = {}) {
  const { fill = YEL, arc = 3, f = 'KB', d = 0.3 } = o;
  const dy = h * 0.34, tl = h * 0.95;
  for (const sd of [-1, 1]) {
    const xe = cx + sd * w / 2;
    const tp = [[xe - sd * h * 0.4, cy - h / 2 + dy], [xe + sd * tl, cy - h / 2 + dy], [xe + sd * (tl - h * 0.36), cy + dy], [xe + sd * tl, cy + h / 2 + dy], [xe - sd * h * 0.4, cy + h / 2 + dy]];
    FILL(tp, t0 + d * 0.5); MRK([tp], { col: GRY2, w: 14, ang: 0.9 }, t0 + d * 0.7, d * 0.3);
    INK_(tp, { closed: true, w: 2.8, amp: 0.9 }, t0 + d * 0.5, d * 0.35);
    const fold = [[xe, cy + h / 2 - 2], [xe, cy + h / 2 + dy], [xe - sd * h * 0.4, cy + h / 2 + dy]];
    MRK([fold], { col: GRYD, w: 8, edge: false }, t0 + d * 0.8, d * 0.2);
  }
  const body = []; const N = 40;
  for (let i = 0; i <= N; i++) { const u = i / N; body.push([cx - w / 2 + w * u, cy - h / 2 - arc * Math.sin(Math.PI * u)]); }
  for (let i = N; i >= 0; i--) { const u = i / N; body.push([cx - w / 2 + w * u, cy + h / 2 - arc * Math.sin(Math.PI * u)]); }
  FILL(body, t0);
  if (fill) MRK([body], { col: fill, w: 20 }, t0 + d * 0.55, d * 0.45);
  INK_(body, { closed: true, w: 3.2, amp: 1 }, t0, d * 0.6);
  let end = t0 + d;
  if (label) end = TXT(label, cx, cy + size * 0.36 - arc, size, { f, align: 'center', jit: 0.7 }, t0 + d * 0.8, o.td);
  return end;
}
function fatArrow(x1, y, x2, t0, o = {}) {
  const h = o.h || 30, hh = o.hh || 36, hl = o.hl || 36, d = o.d || 0.22;
  const p = [[x1, y - h / 2], [x2 - hl, y - h / 2 - 2], [x2 - hl + 2, y - hh], [x2, y], [x2 - hl + 2, y + hh], [x2 - hl, y + h / 2 + 2], [x1, y + h / 2]];
  dropShadow(p, 5, 6, t0 + d, 0.08, { w: 10 });
  FILL(p, t0); MRK([p], { col: YEL, w: 14 }, t0 + d * 0.6, d * 0.5);
  return INK_(p, { closed: true, w: 3, amp: 0.9 }, t0, d * 0.7) + d * 0.4;
}
function arrowHead(x, y, ang, s, o, t0, d = 0.05) {
  return INK_([[x + Math.cos(ang + 2.6) * s, y + Math.sin(ang + 2.6) * s], [x, y], [x + Math.cos(ang - 2.6) * s, y + Math.sin(ang - 2.6) * s]], { w: 3, amp: 0.5, passes: 1, ...o }, t0, d);
}
function inkArrow(pts, o, t0, d) {
  const P = resample(pts, 3); const e = INK_(P, o, t0, d);
  const a = P[P.length - 1], b = P[Math.max(0, P.length - 6)];
  return arrowHead(a[0], a[1], Math.atan2(a[1] - b[1], a[0] - b[0]), o.head || 14, { w: o.w || 3 }, e);
}
function sparks(cx, cy, r1, r2, angs, t0, d = 0.12) {
  angs.forEach((a, i) => MST(line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2), { w: 6, col: YELD }, t0 + i * d * 0.25, d * 0.5));
  return t0 + d;
}
function bullet(x, y, t0) { const c = ell(x, y, 8, 8, 0, TAU, 20); MRK([c], { col: YEL, w: 8 }, t0 + 0.04, 0.05); return INK_(c, { closed: true, w: 2.2, amp: 0.3, passes: 1 }, t0, 0.06); }
function keyCam(t) {
  const K = camera;
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  if (b[0] <= a[0]) return { x: b[1], y: b[2], z: b[3] };
  let u = clamp((t - a[0]) / (b[0] - a[0]));
  u = b[4] === 'whip' ? (u < 0.5 ? 16 * u ** 5 : 1 - Math.pow(-2 * u + 2, 5) / 2) : eio(u);
  const z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u));
  // big zoom changes: move the centre in step with 1/zoom so the target doesn't swing
  const wa = 1 / a[3], wb = 1 / b[3], k = Math.abs(wa - wb) < 1e-6 ? u : (1 / z - wa) / (wb - wa);
  const kk = Math.abs(Math.log(a[3] / b[3])) > 0.5 ? k : u;
  return { x: lerp(a[1], b[1], kk), y: lerp(a[2], b[2], kk), z };
}
// ---------- paper ----------
let GRAIN = null; const GX0 = -400, GY0 = -300, GS = 1.6;
function makeGrain() {
  GRAIN = createCanvas(Math.round(2720 * GS), Math.round(1680 * GS));
  const g = GRAIN.getContext('2d'); SEED = 9;
  for (let i = 0; i < 60000; i++) { g.fillStyle = `rgba(90,80,60,${rr(0.015, 0.05)})`; g.fillRect(rr(0, GRAIN.width), rr(0, GRAIN.height), rr(0.8, 2.6), rr(0.8, 2.6)); }
}
function paper(c) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(c.z, 0, 0, c.z, W / 2 - c.x * c.z, H / 2 - c.y * c.z);
  ctx.drawImage(GRAIN, GX0, GY0, GRAIN.width / GS, GRAIN.height / GS);
  const x0 = c.x - W / 2 / c.z, x1 = c.x + W / 2 / c.z, y0 = c.y - H / 2 / c.z, y1 = c.y + H / 2 / c.z;
  ctx.fillStyle = DOT; const st = 26;
  for (let y = Math.floor((y0 - 13) / st) * st + 13; y < y1 + st; y += st) for (let x = Math.floor((x0 - 13) / st) * st + 13; x < x1 + st; x += st) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill(); }
}

function subtitles(t) {

  const L = captions.find(l => t >= l.c0 && t < l.c1); if (!L) return;
  const a = clamp(Math.min((t - L.c0) / 0.2, (L.c1 - t) / 0.2)), rise = (1 - eo(clamp((t - L.c0) / 0.3))) * 6;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
  ctx.font = '38px PH'; const we = ctx.measureText(L.text).width;
  const cw = we + 76, ch = 76, x0 = W / 2 - cw / 2, y0 = H - 24 - ch + rise;
  ctx.fillStyle = 'rgba(80,80,92,0.10)'; ctx.fill(pathOf(rrect(x0 + 4, y0 + 5, cw, ch, 10)));
  ctx.fillStyle = PAPER; ctx.globalAlpha = a * 0.95; ctx.fill(pathOf(rrect(x0, y0, cw, ch, 10)));
  // a strip of grey washi tape on the top-left corner
  ctx.globalAlpha = a; ctx.save(); ctx.translate(x0 + 30, y0 + 2); ctx.rotate(-0.16); ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = rgba(PL.shd, 0.22); ctx.fillRect(-34, -11, 68, 22); ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK; ctx.font = '38px PH'; ctx.fillText(L.text, W / 2, y0 + 51);
  ctx.restore();
}

const api = {INK_, MRK, MST, FILL, TXT, box, ribbon, fatArrow, inkArrow, arrowHead, sparks, bullet, dropShadow,
  line, bez, ell, rrect, shift, resample, plen, INK, INK2, YEL, YELD, GRY, GRY2, GRYD, INKM, PAPER, TAU};
const {camera, follow} = film.build(api, captions);
if (!camera || camera.length < 2) throw Error('Provide at least two camera keys.');
function cameraAt(t) {
  const base = keyCam(t);
  if (!follow || t < follow.at || t > follow.at + follow.duration) return base;
  const u = clamp((t - follow.at) / follow.duration);
  const path = follow.points;
  const along = u * (path.length - 1);
  const a = path[Math.floor(along)], b = path[Math.min(path.length - 1, Math.ceil(along))];
  const blend = eio(Math.min(u / .16, (1 - u) / .24, 1));
  return {x: lerp(base.x, lerp(a[0], b[0], along % 1), blend),
          y: lerp(base.y, lerp(a[1], b[1], along % 1) + (follow.offsetY || 0), blend),
          z: lerp(base.z, follow.zoom || base.z, blend)};
}
makeGrain();
return {
  camera, sounds: EL.filter(e => e.kind !== 'fill').map(e => {
    const c = cameraAt(e.t0 + e.d / 2);
    return {t:e.t0,d:e.d,type:e.kind,pan:clamp((e.wx-c.x)*c.z/(W/2),-1,1)};
  }), texts: PAGE_TEXTS.map(({T,t0})=>({text:T.s,x:T.x,y:T.y,size:T.size,width:T.tot,t0})),
  render(t) {
    BOIL = Math.floor(Math.round(t * FPS) / 2) % 3;
    paper(cameraAt(t));
    for (const e of EL) {
      if (t < e.t0) continue;
      SEED = e.seed;
      const phase = BOIL;
      if (e.kind !== 'pen') BOIL = 0;
      e.draw(clamp((t-e.t0)/e.d));
      BOIL = phase;
    }
    subtitles(t);
    return cv;
  }
};
}
