import * as WC from './index.js';
import { clamp, mulberry } from './math.js';

// height-field canvas
export class Sculpt {
  constructor(w, h) { this.w = w; this.h = h; this.H = new Float32Array(w * h).fill(-1); this.id = new Int16Array(w * h).fill(-1); this.mat = []; }
  // tapered capsule a→b, radii ra→rb, zs = height scale, z0 = base height offset
  capsule(a, b, ra, rb, { zs = 1, z0 = 0, mat = 0, smooth = 6 } = {}) {
    const [ax, ay] = a, [bx, by] = b, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const x0 = Math.max(0, Math.floor(Math.min(ax - ra, bx - rb))), x1 = Math.min(this.w - 1, Math.ceil(Math.max(ax + ra, bx + rb)));
    const y0 = Math.max(0, Math.floor(Math.min(ay - ra, by - rb))), y1 = Math.min(this.h - 1, Math.ceil(Math.max(ay + ra, by + rb)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = clamp(((x - ax) * dx + (y - ay) * dy) / L2), px = ax + dx * u - x, py = ay + dy * u - y, d = Math.hypot(px, py), r = ra + (rb - ra) * u;
      if (d >= r) continue;
      this.put(x, y, z0 + Math.sqrt(r * r - d * d) * zs, mat, smooth);
    }
  }
  blob(cx, cy, rx, ry, rot, { zs = 1, z0 = 0, mat = 0, smooth = 8 } = {}) {
    const c = Math.cos(rot), s = Math.sin(rot), R = Math.max(rx, ry);
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(this.h - 1, Math.ceil(cy + R)); y++) for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(this.w - 1, Math.ceil(cx + R)); x++) {
      const u = ((x - cx) * c + (y - cy) * s) / rx, v = (-(x - cx) * s + (y - cy) * c) / ry, q = u * u + v * v;
      if (q >= 1) continue;
      this.put(x, y, z0 + Math.sqrt(1 - q) * Math.min(rx, ry) * zs, mat, smooth);
    }
  }
  // a plank: polygon with a bevelled edge of width bev, flat top at z
  plank(P, z, bev = 10, mat = 2) {
    const [cv, q] = WC.canvas(this.w, this.h); q.fillStyle = '#fff'; q.beginPath(); WC.pathOf(q, P); q.fill();
    const reg = new WC.Region([P], { res: 1 });
    const a = q.getImageData(0, 0, this.w, this.h).data;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (a[(y * this.w + x) * 4 + 3] < 128) continue; const d = reg.dist(x, y); this.put(x, y, z * Math.min(1, Math.sqrt(clamp(d / bev))), mat, 0, true); }
  }
  put(x, y, z, mat, smooth, hard = false) {
    const i = y * this.w + x, o = this.H[i];
    if (o < 0 || hard) { if (hard && o > z) return; this.H[i] = z; this.id[i] = mat; return; }
    if (smooth > 0) { const k = smooth, h = clamp(.5 + .5 * (z - o) / k); const v = o * (1 - h) + z * h + k * h * (1 - h); if (v > o) { this.H[i] = v; if (z > o) this.id[i] = mat; } }
    else if (z > o) { this.H[i] = z; this.id[i] = mat; }
  }
  // ripple creases across a joint (lines perpendicular to dir), dents the surface
  creases(cx, cy, dir, rad, n = 4, depth = 1.6, gap = 4.5) {
    const c = Math.cos(dir), s = Math.sin(dir);
    for (let y = Math.max(0, Math.floor(cy - rad)); y < Math.min(this.h, cy + rad); y++) for (let x = Math.max(0, Math.floor(cx - rad)); x < Math.min(this.w, cx + rad); x++) {
      const i = y * this.w + x; if (this.H[i] < 0) continue;
      const along = (x - cx) * c + (y - cy) * s, across = -(x - cx) * s + (y - cy) * c, f = clamp(1 - Math.hypot(along * 1.4, across) / rad);
      if (Math.abs(along) > n * gap * .5) continue;
      this.H[i] -= depth * f * Math.max(0, Math.cos(along / gap * Math.PI * 2)) ** 3 * (1 + .4 * Math.sin(across * .3));
    }
  }
  noise(amp, seed = 1) { const r = mulberry(seed); for (let i = 0; i < this.H.length; i++) if (this.H[i] >= 0) this.H[i] += (r() - .5) * amp; }
  // light it → grayscale canvas (alpha = inside)
  shade(L, { amb = .08, spec = .25, mats = {} } = {}) {
    const { w, h, H } = this, [cv, q] = WC.canvas(w, h), img = q.createImageData(w, h), d = img.data;
    const Hs = H;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (Hs[i] < 0) continue;
      const hx = (Math.max(0, Hs[i + 1]) - Math.max(0, Hs[i - 1])) * .5, hy = (Math.max(0, Hs[i + w]) - Math.max(0, Hs[i - w])) * .5;
      const l = Math.hypot(hx, hy, 1), nx = -hx / l, ny = -hy / l, nz = 1 / l;
      const m = mats[this.id[i]] || {}, dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      const hv = [L[0], L[1], L[2] + 1], hl = Math.hypot(...hv), sp = Math.pow(Math.max(0, (nx * hv[0] + ny * hv[1] + nz * hv[2]) / hl), m.shin ?? 18) * (m.spec ?? spec);
      const v = clamp((m.amb ?? amb) + (m.k ?? 1) * dif * (m.alb ?? 1) + sp);
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v * 255; d[i * 4 + 3] = 255;
    }
    q.putImageData(img, 0, 0);
    return cv;
  }
}
