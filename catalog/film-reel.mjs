// Sample the same film frames as the screen, with stronger dispersion at the rim.
const vertex = `
  attribute vec2 position;
  varying vec2 point;
  void main() {
    point = vec2(position.x + 1.0, 1.0 - position.y) * 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;
const fragment = `
  precision mediump float;
  varying vec2 point;
  uniform sampler2D firstFrame;
  uniform sampler2D nextFrame;
  uniform vec2 center;
  uniform vec2 size;
  uniform float splice;

  vec3 sampleFilm(vec2 uv) {
    vec3 first = texture2D(firstFrame, uv).rgb;
    vec3 next = texture2D(nextFrame, uv).rgb;
    return mix(first, next, step(splice, uv.x));
  }

  void main() {
    vec2 offset = point - 0.5;
    float radius = min(length(offset) * 2.0, 1.0);
    float rim = radius * radius * radius;
    vec2 refracted = center + offset * size * (0.64 + 0.37 * rim);
    vec2 spectralShift = offset * size * rim * 0.085;
    vec3 light = vec3(
      sampleFilm(refracted + spectralShift).r,
      sampleFilm(refracted).g,
      sampleFilm(refracted - spectralShift).b
    );
    float edge = smoothstep(0.76, 0.98, radius);
    float highlight = max(0.0, dot(offset * 2.0, normalize(vec2(-0.80, -0.62))));
    light = mix(light, vec3(0.83, 0.95, 1.0), 0.025 + edge * highlight * 0.29);
    gl_FragColor = vec4(light, 1.0);
  }
`;

function createOptics(canvas, frames) {
  const gl = canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const program = gl.createProgram();
  for (const [kind, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(gl.getUniformLocation(program, 'firstFrame'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'nextFrame'), 1);
  const center = gl.getUniformLocation(program, 'center');
  const size = gl.getUniformLocation(program, 'size');
  const splice = gl.getUniformLocation(program, 'splice');
  const textures = new Map();

  function texture(index) {
    if (textures.has(index)) return textures.get(index);
    const frame = frames[index];
    if (!frame.complete || !frame.naturalWidth) return null;
    const image = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    textures.set(index, image);
    return image;
  }

  return (first, next, x, y, width, height, cut) => {
    if (gl.isContextLost()) return false;
    gl.activeTexture(gl.TEXTURE0);
    const front = texture(first);
    gl.activeTexture(gl.TEXTURE1);
    const back = texture(next);
    if (!front || !back) return false;
    gl.bindTexture(gl.TEXTURE_2D, back);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, front);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(center, x, y);
    gl.uniform2f(size, width, height);
    gl.uniform1f(splice, cut);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  };
}

const reel = document.querySelector('.film-reel');
const hero = reel.closest('.hero');
const screen = reel.querySelector('.reel-screen');
const lens = reel.querySelector('.reel-lens');
const canvas = lens.querySelector('canvas');
const frames = [...screen.querySelectorAll('.reel-frame')];
const links = [...reel.querySelectorAll('.reel-link')];
const controls = reel.querySelector('.reel-controls');
const buttons = [...controls.querySelectorAll('button')];
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const last = frames.length - 1;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
let active = 0, choice = 0, choiceAt = null;
let top, bottom, travel, lensWidth, lensHeight;
let optics, pending = 0, lastPosition = -1;

function show(position, moveLens) {
  const first = Math.floor(position);
  const next = Math.min(first + 1, last);
  const time = clamp((position - first - 0.1) / 0.8, 0, 1);
  const reveal = time * time * (3 - 2 * time);
  const cut = 1 - reveal;
  const index = reveal >= 0.5 ? next : first;
  if (active !== index) {
    active = index;
    links.forEach((link, i) => { link.hidden = i !== index; });
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  }
  frames.forEach((frame, i) => {
    const clip = i <= first ? 0 : i === next ? cut * 100 : 100;
    frame.style.setProperty('--frame-clip', clip + '%');
  });

  const progress = moveLens ? position / last : 0;
  const x = 0.74 - 0.29 * progress;
  const y = 0.63 - 0.15 * progress;
  screen.style.setProperty('--lens-x', x * 100 + '%');
  screen.style.setProperty('--lens-y', y * 100 + '%');
  screen.style.setProperty('--lens-angle', 30 + progress * 135 + 'deg');
  screen.style.setProperty('--splice-origin', cut * 100 + '%');
  screen.style.setProperty('--splice-light', String(4 * reveal * cut));

  if (moveLens && lensWidth && lensHeight) optics ??= createOptics(canvas, frames) || false;
  const otherFrame = reveal > 0 ? next : first;
  const drawn = moveLens && optics && optics(first, otherFrame, x, y, lensWidth, lensHeight, cut);
  lens.dataset.optics = drawn ? 'ready' : 'fallback';
}

function update() {
  pending = 0;
  const y = window.scrollY;
  if (motion.matches && y > bottom) return;
  if (choiceAt !== null && Math.abs(y - choiceAt) > 22) choiceAt = null;
  let position = choice;
  if (motion.matches && choiceAt === null) {
    position = reel.querySelector('.reel-link:focus-visible') ? active : clamp((y - top) / travel, 0, 1) * last;
  }
  if (position === lastPosition) return;
  lastPosition = position;
  show(position, motion.matches);
}

function schedule() {
  if (!pending) pending = requestAnimationFrame(update);
}

function measure() {
  const screenTop = screen.getBoundingClientRect().top + window.scrollY;
  top = Math.max(0, screenTop - innerHeight * 0.45);
  bottom = hero.getBoundingClientRect().bottom + window.scrollY;
  travel = clamp(screen.clientHeight * 0.85, 178, 315);
  lensWidth = lens.clientWidth / screen.clientWidth;
  lensHeight = lens.clientHeight / screen.clientHeight;
  const resolution = Math.max(1, Math.round(lens.clientWidth * Math.min(devicePixelRatio, 1.5)));
  if (canvas.width !== resolution) canvas.width = canvas.height = resolution;
  lastPosition = -1;
  schedule();
}

buttons.forEach((button, i) => button.addEventListener('click', () => {
  choice = i;
  choiceAt = window.scrollY;
  lastPosition = i;
  show(i, motion.matches);
}));
for (const frame of frames) frame.addEventListener('load', () => {
  lastPosition = -1;
  schedule();
});
canvas.addEventListener('webglcontextlost', () => { lens.dataset.optics = 'fallback'; });
motion.addEventListener('change', () => {
  choice = active;
  lastPosition = -1;
  schedule();
});
if ('ResizeObserver' in window) new ResizeObserver(measure).observe(hero);
window.addEventListener('resize', measure, { passive: true });
window.addEventListener('scroll', schedule, { passive: true });
reel.addEventListener('focusout', schedule);
controls.hidden = false;
measure();
