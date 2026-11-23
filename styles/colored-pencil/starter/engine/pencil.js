// SPDX-License-Identifier: MIT
// Pencil material and drawing primitives © 2026 Lemomo (LemoLab). Adapted as a topic-independent compiler.
import * as THREE from 'three';

const W = 1920, H = 1080, SS = 2, FPS = 24;  // post runs at 2x, then a 2x2 box downsample
const QS = new URLSearchParams(location.search);
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.autoClear = false;

// ---------------------------------------------------------------- random & noise (JS)
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vn2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm1 = (x, s = 0) => { let r = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { r += a * (vn2(x * f, s + i * 7.3) - 0.5); f *= 2.1; a *= 0.5; } return r; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- geometry builder
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.t = []; this.ao = []; this.r = []; this.i = []; this.rv = -100; }
  get vc() { return this.p.length / 3; }
  v(p, n, c, t, ao = 1, rv = this.rv) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.c.push(c[0], c[1], c[2]); this.t.push(t.x, t.y, t.z); this.ao.push(ao); this.r.push(rv); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('acol', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('atan', new THREE.Float32BufferAttribute(this.t, 3));
    g.setAttribute('aao', new THREE.Float32BufferAttribute(this.ao, 1));
    g.setAttribute('arev', new THREE.Float32BufferAttribute(this.r, 1));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

// tube with per-point radius; rfn(i, angle) optional radius multiplier; cfn(i, k) colour
function tube(b, pts, rad, sides, cfn, rfn, aofn, rvfn) {
  const n = pts.length; if (n < 2) return;
  const base = b.vc;
  let T = pts[1].clone().sub(pts[0]).normalize();
  let N = Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)];
    T = c.clone().sub(a).normalize();
    N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
    const B = T.clone().cross(N);
    for (let k = 0; k < sides; k++) {
      const ang = k / sides * Math.PI * 2;
      const d = N.clone().multiplyScalar(Math.cos(ang)).add(B.clone().multiplyScalar(Math.sin(ang)));
      const r = rad[i] * (rfn ? rfn(i, ang, d) : 1);
      b.v(pts[i].clone().add(d.clone().multiplyScalar(r)), d, cfn(i, k, d), T, aofn ? aofn(i, d) : 1, rvfn ? rvfn(i) : b.rv);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) {
    const k2 = (k + 1) % sides, a = base + i * sides + k, b1 = base + i * sides + k2, c = a + sides, d = b1 + sides;
    b.i.push(a, b1, c, b1, d, c);
  }
}
// append a three geometry with matrix + colour (fn of world pos & normal)
function append(b, geo, m, cfn, tan = UP, aofn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pa = g.attributes.position, na = g.attributes.normal;
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  const base = b.vc;
  for (let i = 0; i < pa.count; i++) {
    const p = V(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
    const n = V(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(nm).normalize();
    b.v(p, n, cfn(p, n), tan, aofn ? aofn(p, n) : 1);
    b.i.push(base + i);
  }
}
function chaikin(pts, rad, it = 1) {
  for (let r = 0; r < it; r++) {
    const P = [pts[0]], R = [rad[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      P.push(pts[i].clone().lerp(pts[i + 1], 0.25), pts[i].clone().lerp(pts[i + 1], 0.75));
      R.push(lerp(rad[i], rad[i + 1], 0.25), lerp(rad[i], rad[i + 1], 0.75));
    }
    P.push(pts[pts.length - 1]); R.push(rad[rad.length - 1]);
    pts = P; rad = R;
  }
  return [pts, rad];
}

// ---------------------------------------------------------------- materials
const SHARED = { uPass: { value: 0 }, uTime: { value: 0 }, uWindT: { value: 0 }, uRefVP: { value: new THREE.Matrix4() }, uOut: { value: new THREE.Vector2(W, H) } };
const VS = /* glsl */`
attribute vec3 acol; attribute vec3 atan; attribute float aao; attribute float arev;
uniform float uWind, uWindT;
varying vec3 vN, vW, vC, vT; varying float vZ, vAO, vRev;
void main(){
  vec4 wp = modelMatrix*vec4(position,1.0);
  if(uWind > 0.5 && wp.z > -9.0 && wp.y > 0.0){   // grass and flowers lean in the wind (time stepped at 12 drawings a second)
    float g = 0.7*sin(uWindT*1.7 + wp.x*0.9 + wp.z*0.6) + 0.3*sin(uWindT*2.9 + wp.x*2.3 - wp.z*1.1);
    wp.x += 0.10*wp.y*wp.y*(0.35 + g);
  }
  vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal); vC = acol; vT = normalize(mat3(modelMatrix)*atan); vAO = aao; vRev = arev;
  vec4 mv = viewMatrix*wp; vZ = -mv.z;
  gl_Position = projectionMatrix*mv;
}`;
const FS = /* glsl */`
uniform mat4 projectionMatrix;
uniform float uTip, uPass, uId, uKind, uDirMode, uAngle, uOutline, uDens, uAspect, uTime, uDisc, uRevMode, uRevT, uRevD;
uniform vec3 uColor; uniform mat4 uRefVP; uniform vec2 uOut;
varying vec3 vN, vW, vC, vT; varying float vZ, vAO, vRev;
float h31(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm3(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vn3(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
vec2 vor3(vec3 p){ vec3 i=floor(p), f=fract(p); float d1=9.0, d2=9.0; float id=0.0;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 g=vec3(x,y,z); vec3 o=vec3(h31(i+g), h31(i+g+11.3), h31(i+g+27.1));
    float d=length(g+o-f); if(d<d1){ d2=d1; d1=d; id=h31(i+g+5.7);} else if(d<d2) d2=d; }
  return vec2(d2-d1, id); }
vec3 albedo(){
  vec3 c = uColor*vC;
  if(uKind==1.0){            // soil: clods, grit, faint banding
    float n = fbm3(vW*vec3(2.2,3.5,2.2));
    c *= 0.78+0.44*n;
    // round grains (sand, dark crumbs, grey grit) on the cut face
    for(int k=0;k<2;k++){
      float sc = k==0 ? 26.0 : 11.0;
      vec2 q = vW.xy*sc + vec2(vW.z*7.0, float(k)*17.0);
      vec2 ci = floor(q), cf = fract(q);
      float hh = h31(vec3(ci, float(k)*3.1));
      vec2 o = 0.32 + 0.36*vec2(h31(vec3(ci,5.0+float(k))), h31(vec3(ci,9.0+float(k))));
      float rr = (0.10 + 0.17*h31(vec3(ci,13.0)))*(k==0?1.0:0.8);
      vec2 dd = (cf - o)*vec2(1.0, 1.25);
      float m = 1.0 - smoothstep(rr*0.75, rr, length(dd));
      if(k==0){ if(hh>0.90) c = mix(c, vec3(0.86,0.72,0.50), 0.75*m); else if(hh<0.08) c = mix(c, c*0.5, m); }
      else if(hh>0.93) c = mix(c, vec3(0.64,0.62,0.60), 0.8*m);
    }
    c *= 0.92+0.08*sin(vW.y*26.0+n*7.0);
  } else if(uKind==2.0){     // bark ridges + moss
    float s = fbm3(vec3(vW.x*7.0, vW.y*0.9, vW.z*7.0));
    c *= 0.72+0.56*s;
    float m = fbm3(vW*2.6+4.0);
    if(m>0.56 && vW.y<1.4) c = mix(c, vec3(0.46,0.56,0.22), smoothstep(0.56,0.64,m)*0.8);
  } else if(uKind==3.0){     // foliage: leaf cells
    vec2 v = vor3(vW*6.5);
    c *= 0.78+0.42*v.y;
    c = mix(c, c*vec3(1.15,1.12,0.7), step(0.82, v.y)*0.6);
    c *= mix(0.62, 1.0, smoothstep(0.02, 0.14, v.x));
  } else if(uKind==4.0){     // ground surface
    c *= 0.82+0.36*fbm3(vW*vec3(1.4,1.0,2.5));
  } else if(uKind==5.0){     // stone: mottling + speckle
    c *= 0.85+0.3*fbm3(vW*9.0);
    if(h31(floor(vW*60.0))>0.94) c*=0.75;
  }
  return clamp(c, 0.0, 1.0);
}
float revealTime(){
  if(uRevMode < 0.5) return vRev;
  // a sweep across the cut face, left to right, with a ragged front
  float x = clamp((vW.x + 6.0)/14.0, 0.0, 1.0);
  return uRevT + uRevD*x + 0.10*(fbm3(vec3(vW.x*1.3, vW.y*2.0, 0.0)) - 0.5);
}
void main(){
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  vec3 vn = normalize((viewMatrix*vec4(N,0.0)).xyz);
  float rt = revealTime() + uTip*length(vn.xy);    // uTip: the middle of a root leads its edges → a rounded growing tip
  if(uDisc > 0.5 && uTime < rt) discard;          // not drawn yet: leave what is behind
  if(uPass > 2.5){                                 // pass 3: anchor (reference-camera pixel) + reveal time
    vec4 c = uRefVP*vec4(vW,1.0);
    vec2 px = (c.xy/c.w*0.5 + 0.5)*uOut;
    gl_FragColor = vec4(px, rt, 1.0); return;
  }
  if(uPass < 0.5){ gl_FragColor = vec4(albedo(), uId/255.0); return; }
  if(uPass < 1.5){
    vec3 L = normalize(vec3(-0.5,0.78,0.45));
    float d = dot(N,L);
    float l = 0.30 + 0.12*N.y + 0.66*smoothstep(-0.15, 0.85, d);
    if(uKind==3.0) l *= mix(0.62, 1.0, smoothstep(1.3, 3.4, vW.y));
    if(uKind==6.0) l = 1.0;           // mycelium: never shaded
    l *= vAO;
    gl_FragColor = vec4(clamp(l,0.0,1.0), vZ, vn.xy*0.5+0.5); return;
  }
  // pass 2: hatch direction (doubled angle), outline weight, density
  vec2 fx = vec2(cos(2.0*uAngle), sin(2.0*uAngle));
  vec2 dv = fx;
  if(uDirMode > 0.5 && uDirMode < 1.5){
    vec4 a = projectionMatrix*viewMatrix*vec4(vW,1.0);
    vec4 b = projectionMatrix*viewMatrix*vec4(vW+vT*0.05,1.0);
    vec2 s = (b.xy/b.w - a.xy/a.w)*vec2(uAspect,1.0);
    if(length(s) > 1e-6){ float an = atan(s.y, s.x); dv = vec2(cos(2.0*an), sin(2.0*an)); }
  } else if(uDirMode > 1.5){
    float k = clamp(length(vn.xy)*1.3, 0.0, 1.0);
    float an = atan(vn.y, vn.x) + 1.5708;
    dv = normalize(mix(fx, vec2(cos(2.0*an), sin(2.0*an)), k*0.75) + 1e-4);
  }
  gl_FragColor = vec4(dv*0.5+0.5, uOutline, uDens);
}`;
function mat({ id, kind = 0, color = [1, 1, 1], dir = 0, angle = 0.8, outline = 1, dens = 1, side = THREE.FrontSide, disc = 0, wind = 0, rev = null, tip = 0 }) {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side,
    uniforms: {
      uPass: SHARED.uPass, uTime: SHARED.uTime, uWindT: SHARED.uWindT, uRefVP: SHARED.uRefVP, uOut: SHARED.uOut,
      uDisc: { value: disc }, uWind: { value: wind }, uTip: { value: tip },
      uRevMode: { value: rev ? 1 : 0 }, uRevT: { value: rev ? rev[0] : 0 }, uRevD: { value: rev ? rev[1] : 0 },
      uId: { value: id }, uKind: { value: kind }, uDirMode: { value: dir },
      uAngle: { value: angle }, uOutline: { value: outline }, uDens: { value: dens },
      uAspect: { value: W / H }, uColor: { value: new THREE.Color(...color) },
    },
  });
}
const scene = new THREE.Scene();
const add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.frustumCulled = false; scene.add(o); return o; };
// ---------------------------------------------------------------- G-buffer targets
const IW = W * SS, IH = H * SS;
const mkRT = (type, filter) => new THREE.WebGLRenderTarget(IW, IH, { type, minFilter: filter, magFilter: filter, depthBuffer: true, generateMipmaps: false });
const rtA = mkRT(THREE.HalfFloatType, THREE.NearestFilter), rtL = mkRT(THREE.HalfFloatType, THREE.NearestFilter), rtD = mkRT(THREE.HalfFloatType, THREE.NearestFilter);
const rtR = mkRT(THREE.FloatType, THREE.NearestFilter);      // anchor pixel (full float: values up to ~3000 px) + reveal time
const rtP1 = mkRT(THREE.UnsignedByteType, THREE.LinearFilter), rtP2 = mkRT(THREE.UnsignedByteType, THREE.LinearFilter), rtC = mkRT(THREE.UnsignedByteType, THREE.LinearFilter);
const camera = new THREE.PerspectiveCamera(34, W / H, 0.02, 400);
const refCam = new THREE.PerspectiveCamera(34, W / H, 0.02, 400);
const PITCH = -0.06;                          // fixed orientation everywhere: inside a shot the camera only translates (strokes stay anchored)
const CQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(PITCH, 0, 0, 'YXZ'));
const TANP = Math.tan(-PITCH);

function setCamera(v) {
  const orientation=v.pitch===undefined?CQ:new THREE.Quaternion().setFromEuler(new THREE.Euler(v.pitch,0,0,'YXZ'));
  camera.position.copy(v.pos); camera.quaternion.copy(orientation); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  refCam.position.copy(v.ref); refCam.quaternion.copy(orientation); refCam.updateMatrixWorld(); refCam.updateProjectionMatrix();
  SHARED.uRefVP.value.multiplyMatrices(refCam.projectionMatrix, refCam.matrixWorldInverse);
}
const proj = (v, cam = camera) => { const p = v.clone().project(cam); return [(p.x * 0.5 + 0.5) * W, (0.5 - p.y * 0.5) * H]; };
// ---------------------------------------------------------------- overlay canvases: paper (tags, slips), graphite, coloured pencil
const tagC = document.createElement('canvas'), inkC = document.createElement('canvas'), colC = document.createElement('canvas'), OC = document.createElement('canvas');
for (const c of [tagC, inkC, colC, OC]) { c.width = W; c.height = H; }
const tg = tagC.getContext('2d'), ik = inkC.getContext('2d'), cl = colC.getContext('2d'), octx = OC.getContext('2d');
const tagT = new THREE.CanvasTexture(tagC), inkT = new THREE.CanvasTexture(inkC), colT = new THREE.CanvasTexture(colC);
const FONT = 'WK';
let GLY = null, BOIL = 0;
const hsh = (a, b = 0, c = 0) => h2(a * 1.731 + c * 0.377, b * 2.113 + c * 1.913);
const plen = P => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
function textLayout(s, size, seed, o = {}) {
  const { jit = 1 } = o;
  ik.save(); ik.font = `${size}px ${FONT}`;
  const ch = [...s], ws = ch.map(c => ik.measureText(c).width); ik.restore();
  const R = mulberry(seed), rr = () => R() * 2 - 1;
  let cx = 0, L = 0; const chars = [], G = GLY.WK;
  ch.forEach((c, i) => {
    const dy = rr() * jit * size * 0.025, r = rr() * jit * 0.035;
    const sk = (G.g[c] || []).map(a => { const P = []; for (let j = 0; j < a.length; j += 2) P.push([a[j] * size, a[j + 1] * size]); return P; });
    const len = sk.map(plen).reduce((a, b) => a + b, 0) + sk.length * size * 0.12;
    chars.push({ c, ox: cx, dy, r, sk, len, L0: L }); L += len; cx += ws[i];
  });
  return { s, size, chars, L, hw: G.hw * size, tot: cx };
}
function textDraw(T, x, y, prog, alpha = 1) {   // write T at (x, y) (left, baseline) along its glyph skeletons up to prog
  const target = prog * T.L; if (target <= 0) return;
  ik.save(); ik.translate(x, y); ik.globalAlpha = alpha;
  ik.font = `${T.size}px ${FONT}`; ik.fillStyle = '#000'; ik.textBaseline = 'alphabetic';
  for (const C of T.chars) {
    if (C.L0 >= target) break;
    const part = target - C.L0;
    ik.save(); ik.translate(C.ox, C.dy); ik.rotate(C.r);
    if (part >= C.len || !C.sk.length) { ik.fillText(C.c, 0, 0); ik.restore(); continue; }
    const m = ik.getTransform();
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    octx.setTransform(m); octx.font = ik.font; octx.fillStyle = '#000'; octx.textBaseline = 'alphabetic';
    octx.fillText(C.c, 0, 0);
    octx.globalCompositeOperation = 'destination-in'; octx.lineCap = 'round'; octx.lineJoin = 'round'; octx.lineWidth = T.hw * 2.9 + 1.5; octx.strokeStyle = '#000';
    let left = part; octx.beginPath();
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
    ik.restore(); ik.save(); ik.setTransform(1, 0, 0, 1, 0, 0); ik.globalAlpha = alpha; ik.drawImage(OC, 0, 0); ik.restore();
  }
  ik.restore();
}
// a pencil line: fixed jitter per point (seeded) + a small boil (3 drawings); drawn up to prog of its length
function pline(c, pts, prog, w, seed, alpha = 1, col = '#000', dash = null) {
  if (prog <= 0 || pts.length < 2) return;
  const L = plen(pts);
  for (let pass = 0; pass < 2; pass++) {
    c.save(); c.globalAlpha = alpha * (pass ? 0.8 : 1); c.strokeStyle = col; c.lineWidth = w * (pass ? 0.65 : 1); c.lineCap = 'round'; c.lineJoin = 'round';
    if (dash) c.setLineDash(dash);
    c.beginPath(); let rem = prog * L;
    for (let i = 0; i < pts.length; i++) {
      const jx = (hsh(seed, i, pass) - 0.5) * 1.3 + (hsh(seed + 7, i, BOIL + 3 * pass) - 0.5) * 0.7;
      const jy = (hsh(seed + 3, i, pass) - 0.5) * 1.3 + (hsh(seed + 11, i, BOIL + 3 * pass) - 0.5) * 0.7;
      let [x, y] = pts[i];
      if (i) {
        const d = Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
        if (d > rem) { const u = rem / d; x = pts[i - 1][0] + (x - pts[i - 1][0]) * u; y = pts[i - 1][1] + (y - pts[i - 1][1]) * u; c.lineTo(x + jx, y + jy); break; }
        rem -= d; c.lineTo(x + jx, y + jy);
      } else c.moveTo(x + jx, y + jy);
    }
    c.stroke(); c.restore();
  }
}
const curve = (x0, y0, x1, y1, bend, n = 24) => {
  const pts = [], mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
  for (let i = 0; i <= n; i++) { const s = i / n, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s; pts.push([a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1]); }
  return pts;
};
const seg = (t, a, d) => clamp((t - a) / d, 0, 1);

function drawRing(ir) {
  if (!ir || ir.ringA <= 0.01) return;
  const n = 140, pts = [], pts2 = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI * 0.6 + i / n * Math.PI * 2; pts.push([ir.cx + Math.cos(a) * ir.r, ir.cy + Math.sin(a) * ir.r]); pts2.push([ir.cx + Math.cos(a + 0.05) * (ir.r + 7), ir.cy + Math.sin(a + 0.05) * (ir.r + 7)]); }
  tg.save(); tg.globalAlpha = 0.5 * ir.ringA; pline(tg, pts, ir.ring, 12, 301); tg.restore();
  pline(ik, pts, ir.ring, 3.2, 311, 0.95 * ir.ringA);
  pline(ik, pts2, ir.ring, 1.6, 321, 0.55 * ir.ringA);
}
const POST_FS = /* glsl */`
uniform sampler2D tA, tL, tD, tR, tFoc; uniform vec2 uRes, uRdC; uniform float uSS, uTime, uBoil, uRdT, uRdK;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n*17.31+3.7)); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=0.5; } return s; }
// paper tooth: fine grain + laid fibres + soft cockling
float tooth(vec2 p){
  float a = vn(p*0.68);
  vec2 q = mat2(0.94,-0.34,0.34,0.94)*p;
  float b = vn(q*vec2(0.11,0.85));
  float c = vn(p*0.23+3.1);
  return clamp(0.48*a + 0.3*b + 0.22*c, 0.0, 1.0);
}
float cov(float pr, float t){ return smoothstep(t-0.17, t+0.17, pr); }
float ramp(float e, float a, float b){ return clamp((e-a)/(b-a), 0.0, 1.0); }
// one pencil layer: patches of short parallel strokes, each patch slightly re-angled.
// amt (0..1) = how much of the layer has been drawn so far: each stroke has its own turn.
float hatch(vec2 p, float ang, float sp, float cs, float seed, float jit, float amt){
  if(amt <= 0.0) return 0.0;
  vec2 g = floor(p/cs); float acc = 0.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 c = g + vec2(float(i), float(j)); vec2 h = h22(c + seed*7.13);
    vec2 ctr = (c + 0.15 + 0.7*h)*cs;
    float a0 = ang + (h.x-0.5)*jit;
    vec2 d = vec2(cos(a0), sin(a0)), n = vec2(-d.y, d.x);
    vec2 q = p - ctr; float u = dot(q,d), v = dot(q,n);
    v += u*u*(h.y-0.5)*0.006;
    float w = 1.0 - smoothstep(cs*0.45, cs*0.92, length(q));
    float k = floor(v/sp), f = fract(v/sp);
    float r = h21(vec2(k, dot(c, vec2(7.0,13.0)) + seed));
    float r2 = h21(vec2(k*1.7 + seed, c.x - c.y*3.0));
    if(amt < 1.0){ float turn = h21(vec2(k*0.61 + seed*3.3, dot(c, vec2(3.1, 5.7)))); w *= step(turn, amt); }
    float L = cs*(0.75 + 0.7*r);
    float uu = u - (r2-0.5)*cs*0.7;
    float taper = smoothstep(-L*0.5, -L*0.5 + L*0.2, uu) * (1.0 - smoothstep(L*0.5 - L*0.3, L*0.5, uu));
    float hw = sp*(0.26 + 0.2*r2);
    float dd = abs(f-0.5)*sp;
    float prof = 1.0 - smoothstep(hw-0.55, hw+0.55, dd);
    float press = (0.72 + 0.28*r) * (0.85 + 0.15*sin(uu*0.08 + r*6.0));
    acc = max(acc, w*prof*taper*press);
  }
  return acc;
}
vec4 gA(vec2 uv){ return texture2D(tA, uv); }
void main(){
  vec2 p = gl_FragCoord.xy / uSS;              // output-pixel coordinates (y up), fixed to the screen
  vec4 A = gA(vUv), Lb = texture2D(tL, vUv), Db = texture2D(tD, vUv), Rb = texture2D(tR, vUv);
  float id = floor(A.a*255.0 + 0.5);
  vec3 alb = A.rgb; float light = Lb.r, vz = Lb.g;
  float ang = atan(Db.g*2.0-1.0, Db.r*2.0-1.0)*0.5;
  float ow = Db.b, dens = Db.a;
  float yN = vUv.y;
  vec2 pa = p; float ev = 100.0;                // anchor coords (strokes stick to surfaces) and time since this surface was drawn
  if(id > 0.5){ pa = Rb.rg; ev = uTime - Rb.b; }
  if(uRdT > -50.0) ev = min(ev, uTime - (uRdT + uRdK*length(p - uRdC)));   // a fresh drawing (the magnifier) spreads out from its centre
  float fo = texture2D(tFoc, vec2((id + 0.5)/32.0, 0.5)).r;            // focus: 1 = fully drawn, lower = a light wash behind
  // things that grow in (roots, worms, stones, hyphae, leaves) arrive already half coloured and finish fast,
  // so the growing tip never reads as a blank white stick on the soil
  if(id > 10.5 && id < 21.5 && id != 14.0 && id != 16.0 && id != 17.0 && id != 19.0) ev = ev*2.2 + 0.32;
  if(id < 0.5){                                 // sky: loose blue wash, clouds left as paper
    float cl = smoothstep(0.52, 0.72, fbm(p*vec2(0.0032, 0.008) + vec2(2.0, 5.0)));
    alb = mix(vec3(0.70,0.83,0.90), vec3(0.42,0.63,0.86), smoothstep(0.72, 1.0, yN));
    alb = mix(alb, vec3(0.97,0.96,0.93), cl*0.85);
    light = 0.93; ang = 0.32; ow = 0.0; dens = 0.85*(1.0 - cl*0.75); vz = 0.0;
  }
  float t = tooth(pa);
  alb = mix(mix(vec3(dot(alb, vec3(0.333))), alb, 0.6)*0.35 + vec3(0.62), alb, mix(0.25, 1.0, fo));
  dens *= mix(0.55, 1.0, fo);
  float lum = dot(alb, vec3(0.299, 0.587, 0.114));
  float dark = clamp(1.0 - light, 0.0, 1.0);
  float fog = smoothstep(22.0, 150.0, vz)*0.6;
  vec3 paper = vec3(0.972, 0.955, 0.918) * (0.965 + 0.035*fbm(p*0.006));
  alb = mix(alb, vec3(0.74, 0.82, 0.84), fog*0.35);
  dark *= 1.0 - fog*0.6;
  vec3 pig = clamp(sqrt(alb/paper), 0.0, 1.0);
  vec3 col = paper;
  float hi = smoothstep(0.78, 0.98, light);
  // how far each of the four layers has been drawn on this surface
  float r0 = ramp(ev, 0.0, 0.42), r1 = ramp(ev, 0.10, 0.62)*mix(0.6, 1.0, fo), r2 = ramp(ev, 0.30, 0.90)*fo, r3 = ramp(ev, 0.50, 1.15)*fo*fo;
  vec2 bq = mat2(0.8,-0.6,0.6,0.8)*pa;
  float g0 = smoothstep(0.0, 0.14, r0*1.2 - vn(bq*vec2(0.03, 0.11)));
  // L0 underlayer: soft side-of-the-lead fill
  float c0 = cov((0.52 + 0.28*(1.0-lum) - 0.22*hi) * dens * (1.0 - 0.25*fog), t) * g0;
  col *= mix(vec3(1.0), pig, c0);
  // L1 local colour, strokes along the hatch direction
  float h1 = hatch(pa, ang, 4.4, 40.0, 1.0, 0.55, r1);
  float c1 = cov(h1 * (0.82 + 0.4*(1.0-lum) - 0.25*hi) * dens * (1.0 - 0.35*fog), t*0.92);
  col *= mix(vec3(1.0), pig, c1);
  // L2 shading: cross strokes in a darker, cooler version of the colour
  vec3 sh = clamp(alb*alb*vec3(0.95, 0.92, 1.08) + vec3(0.0, 0.0, 0.03), 0.0, 1.0);
  float h2 = hatch(pa, ang + 1.0, 3.8, 34.0, 2.0, 0.6, r2);
  float c2 = cov(h2 * smoothstep(0.1, 0.6, dark) * 1.3 * dens, t);
  col *= mix(vec3(1.0), sqrt(sh), c2);
  // L3 deepest accents: sepia/indigo, a third angle
  float h3 = hatch(pa, ang - 0.55, 3.2, 26.0, 3.0, 0.4, r3);
  float c3 = cov(h3 * smoothstep(0.42, 0.85, dark) * 1.15 * dens, t*1.05);
  col *= mix(vec3(1.0), mix(vec3(0.46, 0.36, 0.34), vec3(0.36, 0.38, 0.5), 0.35), c3);

  // contour lines: id / depth / normal breaks, sampled through a wobble anchored to the surface,
  // plus a small boil (a new drawing every 2 frames, 3 drawings cycled)
  vec2 px = 1.0/uRes;
  vec2 bo = vec2(uBoil*3.7, uBoil*1.9);
  vec2 wob = (vec2(vn(pa*0.045), vn(pa*0.045 + 9.3)) - 0.5) * 2.0 + (vec2(vn(pa*0.07 + bo), vn(pa*0.07 + 5.1 + bo)) - 0.5) * 1.5;
  vec2 uv0 = vUv + wob*uSS*px;
  vec4 A0 = gA(uv0), L0 = texture2D(tL, uv0); float ow0 = texture2D(tD, uv0).b;
  float id0 = floor(A0.a*255.0 + 0.5);
  float e = 0.0;
  for(int k=0;k<4;k++){
    vec2 o = k==0 ? vec2(1,0) : k==1 ? vec2(-1,0) : k==2 ? vec2(0,1) : vec2(0,-1);
    vec2 uv1 = uv0 + o*1.25*uSS*px;
    vec4 A1 = gA(uv1), L1 = texture2D(tL, uv1); float ow1 = texture2D(tD, uv1).b;
    float id1 = floor(A1.a*255.0 + 0.5);
    float de = step(0.5, abs(id1 - id0));
    float z0 = max(L0.g, 1e-3), z1 = max(L1.g, 1e-3);
    if(id0 < 0.5) z0 = 400.0; if(id1 < 0.5) z1 = 400.0;
    de = max(de, smoothstep(0.012, 0.035, abs(z1 - z0)/min(z0, z1)));
    de = max(de, 0.6*smoothstep(0.35, 0.75, length(L1.ba - L0.ba)*2.0));
    float wgt = (z1 < z0) ? ow1 : ow0;     // the nearer surface owns the line
    e = max(e, de * wgt);
  }
  // lines appear with their surface; soil horizons are pencilled in faintly from the start
  float ev0 = id0 > 0.5 ? uTime - texture2D(tR, uv0).b : 100.0;
  if(uRdT > -50.0) ev0 = min(ev0, uTime - (uRdT + uRdK*length(p - uRdC)) + 0.1);
  float fo0 = texture2D(tFoc, vec2((id0 + 0.5)/32.0, 0.5)).r;
  float lg = smoothstep(0.0, 0.12, ramp(ev0, -0.05, 0.3)*1.15 - vn(pa*0.035 + 2.0));
  if(id0 > 5.5 && id0 < 10.5) lg = max(lg, 0.4);
  e *= lg * (1.0 - fog*0.55) * mix(0.3, 1.0, fo0);
  vec3 lineCol = mix(alb*0.32, vec3(0.20, 0.14, 0.11), 0.55);
  float lc = cov(e * (0.62 + 0.38*vn(pa*0.11 + 4.0)), t*0.72);
  col *= mix(vec3(1.0), lineCol, lc*0.82);

  float lu = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(lu), col, 1.12), 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;
const COMP_FS = /* glsl */`
uniform sampler2D tV1, tV2, tTag, tInk, tCol; uniform vec4 uIris; uniform vec2 uLabOff; uniform float uSS, uLabS;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float tooth(vec2 p){
  float a = vn(p*0.68); vec2 q = mat2(0.94,-0.34,0.34,0.94)*p; float b = vn(q*vec2(0.11,0.85)); float c = vn(p*0.23+3.1);
  return clamp(0.48*a + 0.3*b + 0.22*c, 0.0, 1.0);
}
float cov(float pr, float t){ return smoothstep(t-0.17, t+0.17, pr); }
void main(){
  vec2 p = gl_FragCoord.xy / uSS;                         // output pixels, y up
  vec3 col = texture2D(tV1, vUv).rgb;
  if(uIris.w > 0.5){                                      // the magnifier: inside the ring, the other view
    vec2 c = vec2(uIris.x, ${H}.0 - uIris.y);
    float d = length(p - c);
    col = mix(texture2D(tV2, vUv).rgb, col, smoothstep(uIris.z - 0.8, uIris.z + 0.8, d));
  }
  vec2 pl = p*uLabS + uLabOff; float tl = tooth(pl);
  // coloured pencil (amber path), paper (tags, slips, halos), graphite (writing, lines)
  vec4 cc = texture2D(tCol, vUv);
  if(cc.a > 0.0) col *= mix(vec3(1.0), cc.rgb/max(cc.a, 1e-3), cc.a*(0.75 + 0.25*cov(0.85, tl)));
  float tag = texture2D(tTag, vUv).a, ink = texture2D(tInk, vUv).a;
  if(tag + ink > 0.0){
    vec3 tp = vec3(0.975, 0.95, 0.88) * (0.955 + 0.045*tl);
    col = mix(col, tp, tag);
    col *= mix(vec3(1.0), vec3(0.22, 0.17, 0.14), ink * (0.82 + 0.18*cov(0.8, tl*0.6)));
  }
  gl_FragColor = vec4(col, 1.0);
}`;
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const qScene = new THREE.Scene(); qScene.add(quad);
const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const QVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const focData = new Float32Array(32 * 4), focTex = new THREE.DataTexture(focData, 32, 1, THREE.RGBAFormat, THREE.FloatType);
focTex.minFilter = focTex.magFilter = THREE.NearestFilter;
const postMat = new THREE.ShaderMaterial({
  vertexShader: QVS, fragmentShader: POST_FS,
  uniforms: { tA: { value: rtA.texture }, tL: { value: rtL.texture }, tD: { value: rtD.texture }, tR: { value: rtR.texture }, tFoc: { value: focTex },
    uRes: { value: new THREE.Vector2(IW, IH) }, uSS: { value: SS }, uTime: SHARED.uTime, uBoil: { value: 0 },
    uRdT: { value: -100 }, uRdC: { value: new THREE.Vector2() }, uRdK: { value: 0 } },
});
const compMat = new THREE.ShaderMaterial({
  vertexShader: QVS, fragmentShader: COMP_FS,
  uniforms: { tV1: { value: rtP1.texture }, tV2: { value: rtP2.texture }, tTag: { value: tagT }, tInk: { value: inkT }, tCol: { value: colT },
    uIris: { value: new THREE.Vector4() }, uLabOff: { value: new THREE.Vector2() }, uLabS: { value: 1 }, uSS: { value: SS } },
});
const downMat = new THREE.ShaderMaterial({
  vertexShader: QVS, uniforms: { tP: { value: rtC.texture }, uPx: { value: new THREE.Vector2(1 / IW, 1 / IH) } },
  fragmentShader: `uniform sampler2D tP; uniform vec2 uPx; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tP, vUv).rgb*0.5 + 0.125*(texture2D(tP, vUv+vec2(uPx.x*1.5,0.)).rgb + texture2D(tP, vUv-vec2(uPx.x*1.5,0.)).rgb + texture2D(tP, vUv+vec2(0.,uPx.y*1.5)).rgb + texture2D(tP, vUv-vec2(0.,uPx.y*1.5)).rgb);
  gl_FragColor = vec4(c, 1.0); }`,
});

// ---------------------------------------------------------------- render
function pass(n, rt, clear) {
  SHARED.uPass.value = n;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(new THREE.Color(clear[0], clear[1], clear[2]), clear[3]);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);
}
function renderView(v, out) {
  setCamera(v);
  const hide = v.hide || [];
  for (const o of scene.children) o.visible = o.userData.active !== false && !hide.includes(o.material.uniforms.uId.value);
  focData.fill(1); for (const [k, f] of Object.entries(v.focus || {})) focData[+k * 4] = f;
  focTex.needsUpdate = true;
  const rd = v.redraw; postMat.uniforms.uRdT.value = rd ? rd.t : -100;
  if (rd) { postMat.uniforms.uRdC.value.set(rd.cx, H - rd.cy); postMat.uniforms.uRdK.value = rd.k; }
  pass(0, rtA, [0, 0, 0, 0]);
  pass(1, rtL, [1, 400, 0.5, 0.5]);
  pass(2, rtD, [Math.cos(0.64) * 0.5 + 0.5, Math.sin(0.64) * 0.5 + 0.5, 0, 0.6]);
  pass(3, rtR, [0, 0, -100, 0]);
  const dbg = QS.get('dbg');
  if (dbg) { quad.material = downMat; downMat.uniforms.tP.value = [rtA, rtL, rtD, rtR][+dbg].texture; renderer.setRenderTarget(out); renderer.render(qScene, qCam); downMat.uniforms.tP.value = rtC.texture; return; }
  quad.material = postMat; renderer.setRenderTarget(out); renderer.render(qScene, qCam);
}
function labelTooth(v) {                      // paper tooth for overlay marks: the page plane seen by the reference vs the current camera
  setCamera(v);
  const P0 = V(camera.position.x, camera.position.y, 0.3), P1 = P0.clone().add(V(1, 1, 0));
  const a0 = P0.clone().project(refCam), b0 = P0.clone().project(camera), a1 = P1.clone().project(refCam), b1 = P1.clone().project(camera);
  const sc = (a1.x - a0.x) / (b1.x - b0.x);
  compMat.uniforms.uLabS.value = sc;
  compMat.uniforms.uLabOff.value.set((a0.x * 0.5 + 0.5) * W - sc * (b0.x * 0.5 + 0.5) * W, (a0.y * 0.5 + 0.5) * H - sc * (b0.y * 0.5 + 0.5) * H);
}

export { THREE, W, H, V, Builder, mat, tube, append, add, mulberry, vn2, fbm1, lerp, ss, clamp };
const white = () => [1, 1, 1];
export function rgb(hex) {
  const n = parseInt(hex.replace('#',''),16);
  return [(n>>16)/255, ((n>>8)&255)/255, (n&255)/255];
}
export function mesh(geometry, options, matrix = new THREE.Matrix4()) {
  const b = new Builder();
  append(b, geometry, matrix, white);
  return add(b.geo(), mat({side:THREE.DoubleSide,...options}));
}
export function view(x,y,z,anchor,focus={},hide=[]) {
  const pos=V(x, y+z*TANP, z);
  return {pos,ref:anchor?V(anchor[0],anchor[1]+anchor[2]*TANP,anchor[2]):pos.clone(),focus,hide};
}
export function project(v,world) {
  setCamera(v);
  return proj(Array.isArray(world)?V(...world):world);
}
export function lens(wide,detail,world,time,start,duration=2,closing=false,detailWorld=world) {
  const phase=clamp((time-start)/duration,0,1);
  const q=closing?1-phase:phase;
  if(q===0) return {main:wide};
  if(q===1) return {main:detail};
  const a=project(wide,world), b=project(detail,detailWorld);
  const u=ss((q-.22)/.78);
  const cx=lerp(a[0],b[0],u),cy=lerp(a[1],b[1],u);
  const ir={cx,cy,r:lerp(70,2300,u*u),inner:u>0,ring:ss(q/.22),ringA:1-ss((u-.55)/.4)};
  const inset={...detail,pos:detail.pos.clone()};
  // Move the inset camera until the subject is precisely under the graphite ring.
  const z=Array.isArray(detailWorld)?detailWorld[2]:detailWorld.z;
  const d=(detail.pos.z-z)*2*Math.tan(17*Math.PI/180)/H;
  inset.pos.x+=(b[0]-cx)*d; inset.pos.y+=(cy-b[1])*d;
  if(!closing)inset.redraw={t:start+duration*.22-.1,cx,cy,k:.0006};
  return {main:wide,inset:u>0?inset:null,iris:ir};
}
const layouts=new Map();
function letters(text,size) {
  const key=size+'|'+text;
  if(!layouts.has(key))layouts.set(key,textLayout(text,size,19));
  return layouts.get(key);
}
function slip(text,t,age) {
  const x=92, bottom=H-62, pad=25, size=35;
  ik.font=size+'px WK';
  const words=text.split(/\s+/),lines=[''];
  for(const word of words){
    const i=lines.length-1,s=[lines[i],word].filter(Boolean).join(' ');
    if(lines[i] && ik.measureText(s).width>1390)lines.push(word);else lines[i]=s;
  }
  const w=Math.max(...lines.map(s=>ik.measureText(s).width))+2*pad;
  const h=lines.length*44+14, y=bottom-h;
  tg.save();tg.fillStyle='rgba(255,255,255,.95)';tg.beginPath();
  tg.moveTo(x,y+3);tg.lineTo(x+w,y);tg.lineTo(x+w-2,bottom);tg.lineTo(x+2,bottom-2);tg.fill();tg.restore();
  pline(ik,[[x+2,bottom-2],[x+w-2,bottom]],1,1.5,43,.5);
  ik.save();ik.beginPath();ik.rect(x,y,(w+5)*ss(age/.16),h+3);ik.clip();ik.fillStyle='#000';
  lines.forEach((s,i)=>ik.fillText(s,x+pad,y+39+i*44));ik.restore();
}
function tag(spec,t,v) {
  const {text,x,y,at,start=0,size=36}=spec;
  const T=letters(text,size),w=T.tot+38,h=size+23;
  if(at){
    const [ax,ay]=project(v,at), ox=clamp(ax,x+8,x+w-8),oy=ay>y?y+h/2:y-h/2;
    const pts=curve(ox,oy,ax,ay,.065);
    pline(tg,pts,ss((t-start)/.36),8,3,.6);pline(ik,pts,ss((t-start)/.36),2,4,.86);
  }
  tg.fillStyle='#fff';tg.beginPath();tg.roundRect(x,y-h/2,w,h,5);tg.fill();
  pline(ik,[[x,y-h/2],[x+w,y-h/2+1],[x+w-1,y+h/2],[x,y+h/2-1],[x,y-h/2]],ss((t-start)/.4),1.8,71,.8);
  textDraw(T,x+19,y+size*.35,ss((t-start-.15)/(.35+text.length*.045)));
}
export async function prepare(){
  await document.fonts.load('40px WK','English lettering');
  GLY=await (await fetch('/fonts/glyphs.json')).json();
}
export function proof(){
  mesh(new THREE.SphereGeometry(1,42,28),{id:4,kind:5,dir:2,color:rgb('#b78148')});
  return ()=>({main:view(0,0,5)});
}
export function draw(frame,t){
  BOIL=Math.floor(Math.round(t*24)/2)%3;
  postMat.uniforms.uBoil.value=BOIL;SHARED.uTime.value=t;SHARED.uWindT.value=Math.floor(t*12)/12;
  renderView(frame.main,rtP1);
  if(frame.inset)renderView(frame.inset,rtP2);
  const ir=frame.iris;
  compMat.uniforms.uIris.value.set(ir?.cx||0,ir?.cy||0,ir?.r||0,ir?.inner&&frame.inset?1:0);
  for(const ctx of [tg,ik,cl])ctx.clearRect(0,0,W,H);
  drawRing(ir);
  if(frame.label)tag(frame.label,t,frame.main);
  if(frame.title){
    const {text,x,y,start,size=78}=frame.title,T=letters(text,size),q=ss((t-start)/1.8);
    textDraw(T,x,y,q);pline(ik,[[x,y+13],[x+T.tot*.45,y+16],[x+T.tot,y+11]],ss((t-start-1.4)/.7),2.6,51,.8);
  }
  if(frame.caption)slip(frame.caption.text,t,t-frame.caption.start);
  tagT.needsUpdate=inkT.needsUpdate=colT.needsUpdate=true;
  labelTooth(frame.main);
  quad.material=compMat;renderer.setRenderTarget(rtC);renderer.render(qScene,qCam);
  quad.material=downMat;downMat.uniforms.tP.value=rtC.texture;renderer.setRenderTarget(null);renderer.render(qScene,qCam);
}
