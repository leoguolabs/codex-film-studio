const desk = document.querySelector(".paper-journey");
const view = desk.querySelector(".desk-window");
const face = desk.querySelector(".sheet-face");
const stock = desk.querySelector(".sheet-stock");
const plane = desk.querySelector(".drawing-plane");
const tool = desk.querySelector(".pen-tool");
const diameter = desk.querySelector("#diameter");
const radius = desk.querySelector("#radius-stroke");
const ends = desk.querySelector(".diameter-ends");
const dot = desk.querySelector(".centre-dot");
const lengthLabel = desk.querySelector(".length");
const halfLabel = desk.querySelector(".half");
const intro = desk.querySelector(".opening-copy");
const header = desk.querySelector(".desk-top");
const invitation = desk.querySelector(".desk-actions");
const shortcut = desk.querySelector(".skip-drawing");
const diameterNote = desk.querySelector(".diameter-note");
const radiusNote = desk.querySelector(".radius-note");
const screening = document.querySelector("#screening");
const rules = [...document.querySelectorAll(".section-line .rule")];
const fold = desk.querySelector(".fold-back");
const ctx = fold.getContext("2d");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const grain = new Image();
grain.src = new URL("grain.png", import.meta.url).href;

const clamp = x => Math.min(1, Math.max(0, x));
const mix = (a, b, t) => a + (b - a) * t;
function ease(a, b, x) {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
function strokeTime(a, b, time) {
  return .32 * clamp((time - a) / (b - a)) + .68 * ease(a, b, time);
}
function show(node, value, interactive = false) {
  node.style.opacity = value.toFixed(3);
  node.style.visibility = value < .005 ? "hidden" : "visible";
  if (interactive) node.inert = value < .02;
}

const lengths = [diameter.getTotalLength(), radius.getTotalLength()];
let width = 0, height = 0, top = 0, travel = 1, pixelRatio = 1;
let pending = 0, automatic = null, lastProgress = -1;
let paperPattern;

// A straight physical crease clips the front. Reflect the lifted half around
// that same crease to obtain the silhouette and show-through ink on its back.
const nx = .842, ny = Math.sqrt(1 - nx * nx);
function cut(rect, limit, positive) {
  const out = [];
  let a = rect.at(-1), ad = a.x * nx + a.y * ny - limit;
  for (const b of rect) {
    const bd = b.x * nx + b.y * ny - limit;
    if ((ad < 0) !== (bd < 0)) {
      const t = ad / (ad - bd);
      out.push({x: mix(a.x, b.x, t), y: mix(a.y, b.y, t)});
    }
    if (positive ? bd >= 0 : bd <= 0) out.push(b);
    a = b;
    ad = bd;
  }
  return out;
}
function turnPage(turn, camera) {
  const turning = turn > .0001 && turn < .9999;
  fold.hidden = !turning;
  face.style.visibility = turn >= .9999 ? "hidden" : "visible";
  if (!turning) {
    face.style.clipPath = "";
    return;
  }
  const rect = [{x:0,y:0}, {x:width,y:0}, {x:width,y:height}, {x:0,y:height}];
  const diagonal = nx * width + ny * height;
  const crease = mix(diagonal, -3, turn);
  const front = cut(rect, crease, false);
  face.style.clipPath = front.length
    ? "polygon(" + front.map(p => p.x.toFixed(2) + "px " + p.y.toFixed(2) + "px").join(",") + ")"
    : "inset(100%)";
  const reflect = p => {
    const d = 2 * (nx * p.x + ny * p.y - crease);
    return {x:p.x - nx * d, y:p.y - ny * d};
  };
  const back = cut(rect, crease, true).map(reflect);
  if (!ctx || back.length < 3) return;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  back.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  const curl = Math.min(width, height) * (.10 + .18 * Math.sin(Math.PI * turn));
  const light = ctx.createLinearGradient(nx * crease, ny * crease, nx * (crease - curl), ny * (crease - curl));
  light.addColorStop(0, "#bbad93");
  light.addColorStop(.055, "#e1d6ba");
  light.addColorStop(.24, "#fbf5e4");
  light.addColorStop(.57, "#f1e8d3");
  light.addColorStop(1, "#e4d8bd");
  ctx.shadowColor = "#36291355";
  ctx.shadowBlur = 18 * pixelRatio;
  ctx.shadowOffsetX = 6 * pixelRatio;
  ctx.shadowOffsetY = 9 * pixelRatio;
  ctx.fillStyle = light;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  if (grain.naturalWidth) {
    paperPattern ??= ctx.createPattern(grain, "repeat");
    ctx.globalAlpha = .44;
    ctx.fillStyle = paperPattern;
    ctx.fillRect(0, 0, width, height);
  }
  const reversePoint = (x, y) => {
    const c = Math.cos(camera.angle), s = Math.sin(camera.angle);
    return reflect({x:camera.x + (x*c-y*s)*camera.scale, y:camera.y + (x*s+y*c)*camera.scale});
  };
  const start = reversePoint(-258, 74), end = reversePoint(258, -74);
  ctx.globalAlpha = .13;
  ctx.lineWidth = 4 * camera.scale;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#33538f";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function draw(t) {
  const turn = ease(.758, .987, t);
  const turned = turn >= .9999;
  // The actual player lies under the turning sheet. Its transform reaches
  // zero at the handoff, so ordinary document scrolling takes over.
  screening.style.setProperty("--under-sheet", t >= .751 && t < 1 ? (-(1-t)*travel).toFixed(2)+"px" : "0px");
  view.toggleAttribute("data-turned", turned);
  view.inert = turned;
  if (turned) {
    fold.hidden = true;
    return;
  }
  const portrait = width <= height;
  const d = strokeTime(0, .425, t);
  const r = strokeTime(.47, .684, t);
  const point = r > 0 ? radius.getPointAtLength(lengths[1] * r)
                      : diameter.getPointAtLength(lengths[0] * d);
  const lift = ease(.70, .79, t);
  const x = point.x + 140 * lift, y = point.y + 116 * lift;
  const follow = ease(.035, .32, t) * (1 - .83 * ease(.65, .80, t));
  const base = Math.min(width * (portrait ? .92 : .51), height * (portrait ? .45 : .74)) / 560;
  const scale = base * (1 + (portrait ? .35 : .54) * follow);
  const angle = mix(-4, 3.5, follow) * Math.PI / 180;
  const px = point.x * Math.cos(angle) - point.y * Math.sin(angle);
  const py = point.x * Math.sin(angle) + point.y * Math.cos(angle);
  let cx = mix(width * (portrait ? .52 : .705), width * (portrait ? .51 : .71) - px * scale * .52, follow);
  if (!portrait) cx = Math.max(cx, .303 * width + 268 * scale);
  const cy = mix(height * (portrait ? .59 : .465), height * (portrait ? .565 : .49) - py * scale * .53, follow);
  plane.style.transform = 'translate3d('+cx.toFixed(2)+'px,'+cy.toFixed(2)+'px,0) rotate('+angle+'rad) scale('+scale.toFixed(6)+') translate(-320px,-320px)';
  stock.style.transform = 'translate3d('+(-11*follow)+'px,'+(13*follow)+'px,0) scale('+(1+.105*follow)+')';
  diameter.style.strokeDashoffset = (1 - d).toFixed(5);
  radius.style.strokeDashoffset = (1 - r).toFixed(5);
  show(ends, ease(.415, .452, t));
  show(dot, ease(.654, .69, t));
  show(lengthLabel, ease(.397, .456, t));
  show(halfLabel, ease(.623, .685, t));
  tool.style.left = (x + 320).toFixed(2) + "px";
  tool.style.top = (y + 320).toFixed(2) + "px";
  tool.style.transform = 'rotate('+(26-15*d+17*r+9*lift)+'deg)';
  tool.style.setProperty("--tool-shadow", (2+8*lift)+'px '+(5+11*lift)+'px '+(3+4*lift)+'px #49352764');
  show(tool, 1 - ease(.74, .81, t), true);
  const opening = 1 - ease(.018, .17, t);
  show(intro, opening);
  intro.style.setProperty("--copy-drift", (-20 * (1-opening)) + "px");
  show(header, 1 - ease(.04, .18, t), true);
  show(invitation, 1 - ease(.018, .145, t), true);
  show(shortcut, 1 - ease(.72, .79, t), true);
  show(diameterNote, ease(.165, .25, t) * (1-ease(.435, .515, t)));
  show(radiusNote, ease(.50, .59, t) * (1-ease(.72, .80, t)));
  turnPage(turn, {x:cx, y:cy, scale, angle});
}

function requestFrame() {
  if (!pending) pending = requestAnimationFrame(frame);
}
function recordLanding() {
  const url = new URL(location.href);
  if (url.hash !== "#screening") {
    url.hash = "screening";
    history.pushState(null, "", url);
  }
  screening.focus({preventScroll:true});
}
function frame(now) {
  pending = 0;
  if (automatic) {
    if (automatic.previous !== null) automatic.elapsed += Math.min(50, now - automatic.previous);
    automatic.previous = now;
    const u = clamp(automatic.elapsed / automatic.duration);
    const p = .32*u + .68*ease(0, 1, u);
    window.scrollTo({top:mix(automatic.from, top + travel, p), behavior:"instant"});
    if (u < 1) requestFrame();
    else { automatic = null; recordLanding(); }
  }
  if (motion.matches) return;
  const progress = clamp((scrollY - top) / travel);
  if (progress !== lastProgress) {
    draw(progress);
    lastProgress = progress;
  }
  for (const rule of rules) {
    const edge = rule.getBoundingClientRect().top;
    const value = ease(.04, .42, 1-edge/height);
    rule.style.setProperty("--rule-ink", (.065 + .935*value).toFixed(3));
  }
}

function measure() {
  cancelAnimationFrame(pending);
  pending = 0;
  document.documentElement.classList.toggle("ink-ready", !motion.matches);
  width = view.clientWidth;
  height = view.clientHeight;
  top = desk.getBoundingClientRect().top + scrollY;
  travel = Math.max(1, desk.offsetHeight - height);
  pixelRatio = Math.min(1.5, devicePixelRatio || 1);
  fold.width = Math.round(width * pixelRatio);
  fold.height = Math.round(height * pixelRatio);
  lastProgress = -1;
  if (motion.matches) {
    automatic = null;
    view.removeAttribute("data-turned");
    view.inert = false;
    for (const node of [plane,view,face,stock,tool,intro,header,invitation,shortcut,diameter,radius,ends,dot,lengthLabel,halfLabel,diameterNote,radiusNote,screening]) {
      node.removeAttribute("style");
      node.inert = false;
    }
    fold.hidden = true;
  } else {
    frame(performance.now());
  }
}
function follow(event) {
  if (event.button !== 0 || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  if (motion.matches || event.currentTarget.hasAttribute("data-skip-drawing")) {
    automatic = null;
    const destination = motion.matches ? top + desk.offsetHeight : top + travel;
    window.scrollTo({top:destination, behavior:"instant"});
    recordLanding();
    requestFrame();
    return;
  }
  const remaining = 1-clamp((scrollY-top)/travel);
  automatic = {from:scrollY, duration: Math.max(1200, 9400*remaining), elapsed:0, previous:null};
  requestFrame();
}
document.querySelectorAll("[data-follow-ink],[data-skip-drawing]").forEach(a => a.addEventListener("click", follow));
function takeOver() { automatic = null; }
for (const input of ["wheel","touchstart","pointerdown"]) addEventListener(input, takeOver, {passive:true});
addEventListener("keydown", e => {
  if (["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," ","Escape","Tab"].includes(e.key)) takeOver();
});
addEventListener("scroll", requestFrame, {passive:true});
addEventListener("resize", measure);
motion.addEventListener("change", measure);
measure();
if (location.hash && performance.getEntriesByType("navigation")[0]?.type === "navigate") {
  const target = document.getElementById(location.hash.slice(1));
  if (target) requestAnimationFrame(() => target.scrollIntoView({behavior:"instant"}));
}
