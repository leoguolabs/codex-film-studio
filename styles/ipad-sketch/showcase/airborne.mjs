// All positions are on the same 1774 × 887 pencil sheet.
const crown = { x: 1007, y: 477 };
const turn = 2 * Math.PI;
const clamp = (n) => Math.max(0, Math.min(1, n));
const between = (n, a, b) => clamp((n - a) / (b - a));
function ease(t) {
  return t * t * (3 - 2 * t);
}

// Rectangles of untouched paper behind the two actors in the printed opening.
// Each row is jacket x, y, width, height, then x, y on the cutout sheet.
export const cleanPatches = [
  [921, 358, 156, 145, 0, 171],
  [1197, 215, 225, 245, 550, 0],
];

const crack = [
  [-8, -80],
  [-11, -65],
  [-3, -58],
  [-7, -48],
  [3, -39],
  [0, -29],
  [11, -20],
  [8, -13],
  [17, -4],
];
function traceCrack(path) {
  path.moveTo(...crack[0]);
  for (const point of crack.slice(1)) path.lineTo(...point);
}
function shellMask(side) {
  const shape = new Path2D();
  traceCrack(shape);
  shape.lineTo(side * 72, 14);
  shape.lineTo(side * 72, -96);
  shape.closePath();
  return shape;
}

function heat(ctx, t) {
  const strength = Math.sin(Math.PI * between(t, 0.005, 0.46));
  if (strength <= 0.001) return;
  ctx.save();
  ctx.strokeStyle = `rgba(147,75,36,${0.68 * strength})`;
  ctx.lineWidth = 2.3;
  ctx.lineCap = "round";
  for (const [offset, height, sign] of [
    [-57, 40, 1],
    [-78, 29, -1],
    [46, 53, -1],
  ]) {
    const bend = Math.sin(t * 23 + offset) * 8;
    const x = crown.x + offset,
      y = crown.y - 28;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + sign * 14,
      y - height * 0.35,
      x + bend - sign * 12,
      y - height * 0.7,
      x + bend,
      y - height * strength - 12,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function socket(ctx) {
  // The small fibrous seat only becomes visible when the kernel pulls away.
  ctx.save();
  ctx.translate(1010, 456);
  const hollow = new Path2D(
    "M-15 0 Q-13 -7 -6 -7 L-2 -9 Q8 -7 13 -3 L16 2 Q10 8 1 8 Q-9 7 -15 3Z",
  );
  ctx.fillStyle = "#c99551";
  ctx.fill(hollow);
  ctx.clip(hollow);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 10; i++) {
    const x = -13 + i * 3;
    ctx.strokeStyle = i % 2 ? "#e3bf79" : "#a97944";
    ctx.beginPath();
    ctx.moveTo(x, -6 + (i % 3));
    ctx.quadraticCurveTo(x - 3, 0, x + 3, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function flightAt(t) {
  const u = between(t, 0.615, 0.96);
  return {
    x: crown.x - 190 * u,
    y: crown.y - 224 * (2 * u - u * u),
    angle: -0.55 * Math.sin(Math.PI * u) - 0.12 * u,
  };
}
function seedAt(t) {
  const phase = turn * 1.52 * t;
  return {
    x: 1238 + 250 * t + 81 * Math.sin(turn * t) * Math.sin(Math.PI * t),
    y: 420 + 140 * t + 24 * t * t - 12 * Math.sin(phase),
    phase,
    size: 1 - 0.24 * t,
  };
}
function trail(ctx, at, from, until, hue, dash) {
  if (until <= from) return;
  const first = at(from);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  const count = Math.ceil((until - from) * 85);
  for (let i = 1; i <= count; i++) {
    const point = at(from + ((until - from) * i) / count);
    ctx.lineTo(
      point.x + 0.55 * Math.sin(i * 2.4),
      point.y + 0.6 * Math.cos(i * 1.7),
    );
  }
  ctx.strokeStyle = hue;
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Both shell halves keep the color and pencil marks of the original kernel.
// White starch grows behind their common seam before the flake leaves the ear.
function drawCorn(ctx, art, t) {
  heat(ctx, t);
  trail(ctx, flightAt, 0.615, t - 0.025, "rgba(111,77,42,.55)", [3, 9]);
  const pose = flightAt(t);
  const swell = ease(between(t, 0.07, 0.32));
  const opening = ease(between(t, 0.305, 0.55));
  const fold = ease(between(t, 0.445, 0.66));
  const bloom = ease(between(t, 0.31, 0.62));
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.scale(1 + 0.085 * swell, 1 + 0.035 * swell);
  // Keep a starchy interior in the gap even before the first large fold opens.
  if (t > 0.275 && t < 0.51) {
    const bud = ease(between(t, 0.275, 0.41));
    ctx.save();
    ctx.translate(-1, -40);
    ctx.scale(0.09 + 0.91 * bud, 0.3 + 0.7 * bud);
    const inside = new Path2D(
      "M-6 23 C-18 16 -21 2 -15 -12 Q-18 -21 -8 -26 Q1 -32 7 -23 Q21 -22 18 -8 Q25 6 13 16 Q8 24 -6 23Z",
    );
    ctx.fillStyle = "#f5e6c5";
    ctx.fill(inside);
    ctx.clip(inside);
    ctx.drawImage(art.flake, 52, 11, 67, 68, -24, -31, 49, 59);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#957a56";
    ctx.stroke(inside);
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.quadraticCurveTo(-17, 2, -11, -6);
    ctx.strokeStyle = "#cab18b";
    ctx.stroke();
    ctx.restore();
  }
  if (bloom > 0) {
    ctx.save();
    const size = 0.085 + 0.97 * bloom;
    ctx.translate(-3, -43 * (1 - bloom) - 4);
    ctx.scale(size * (1.04 - 0.04 * bloom), size * (0.72 + 0.28 * bloom));
    // The middle lobe emerges first; the two side folds open a beat apart.
    if (bloom < 0.98) {
      const mask = new Path2D();
      for (const [x, y, r, delay] of [
        [-2, -66, 99, 0],
        [-55, -35, 77, 0.12],
        [52, -54, 82, 0.23],
      ]) {
        const reach = 0.1 + 1.12 * between(bloom, delay, 1);
        mask.moveTo(x + r * reach, y);
        mask.ellipse(x, y, r * reach, (r + 13) * reach, 0, 0, turn);
      }
      ctx.clip(mask);
    }
    ctx.drawImage(art.flake, -101, -151);
    ctx.restore();
  }
  if (opening === 0) {
    ctx.drawImage(art.kernel, -40, -85);
  } else if (fold < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - ease(between(t, 0.56, 0.66));
    for (const [i, side] of [-1, 1].entries()) {
      ctx.save();
      ctx.translate(10 + side * 6 * opening, -7 - 2 * fold);
      ctx.rotate(side * 0.96 * opening);
      ctx.scale(1 - 0.75 * fold, 1 - 0.68 * fold);
      ctx.translate(-10, 7);
      ctx.clip(art.halves[i]);
      ctx.drawImage(art.kernel, -40, -85);
      ctx.restore();
    }
    ctx.restore();
  }
  if (t > 0.19 && t < 0.33) {
    ctx.save();
    ctx.globalAlpha = 1 - ease(between(t, 0.295, 0.33));
    ctx.strokeStyle = "rgba(100,54,22,.84)";
    ctx.lineWidth = 1.8 + 1.2 * opening;
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.setLineDash([94]);
    ctx.lineDashOffset = 94 * (1 - between(t, 0.19, 0.275));
    ctx.stroke(art.fissure);
    ctx.restore();
  }
  if (t > 0.43 && t < 0.68) {
    const burst = Math.sin(Math.PI * between(t, 0.43, 0.68));
    ctx.save();
    ctx.globalAlpha = 0.75 * burst;
    ctx.strokeStyle = "#ae6634";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const [x, y, dx, dy] of [
      [-94, -74, -18, -6],
      [-77, -123, -8, -12],
      [72, -99, 14, -10],
      [79, -61, 19, -2],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * burst, y + dy * burst);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// Project the wing around its heavy nut, so it turns edge-on in flight.
function drawMaple(ctx, art, t) {
  trail(ctx, seedAt, 0, t - 0.035, "rgba(157,82,45,.57)", [15, 7, 2, 7]);
  const p = seedAt(t),
    c = Math.cos(p.phase),
    s = Math.sin(p.phase);
  const rest = Math.atan2(-187, 140);
  const x = Math.cos(rest) * c - 0.8 * s;
  const y = -0.42 + (Math.sin(rest) + 0.42) * c - 0.26 * s;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.size, p.size);
  ctx.save();
  ctx.rotate(Math.atan2(y, x));
  ctx.scale(Math.hypot(x, y), 0.53 + 0.47 * c ** 2);
  ctx.rotate(-rest);
  ctx.drawImage(art.wing, -39, -203);
  ctx.restore();
  ctx.rotate(0.2 * s);
  ctx.scale(0.87 + 0.13 * c ** 2, 1);
  ctx.drawImage(art.nut, -39, -203);
  ctx.restore();
}

export function prepareJacket(opening, sheet, surface) {
  const ground = surface(1774, 887);
  const base = ground.getContext("2d");
  base.drawImage(opening, 0, 0);
  for (const [x, y, w, h, sx, sy] of cleanPatches)
    base.drawImage(sheet, sx, sy, w, h, x, y, w, h);
  // The near row lies in front of the actor while it is still attached.
  const foreground = surface(122, 70);
  const lip = foreground.getContext("2d");
  lip.translate(-948, -438);
  lip.clip(
    new Path2D(
      "M948 480 Q955 465 966 466 Q973 459 981 466 Q990 452 1004 457 Q1016 456 1022 469 Q1033 452 1048 461 Q1058 460 1070 472 V508 H948Z",
    ),
  );
  lip.drawImage(ground, 0, 0);
  socket(base);
  function crop(x, y, w, h) {
    const tile = surface(w, h);
    tile.getContext("2d").drawImage(sheet, x, y, w, h, 0, 0, w, h);
    return tile;
  }
  const wing = crop(307, 0, 222, 241),
    nut = crop(307, 0, 222, 241);
  const hub = new Path2D(
    "M14 210 Q12 193 29 184 Q48 173 59 190 Q70 207 54 221 Q36 233 18 218Z",
  );
  for (const [tile, operation] of [
    [wing, "destination-out"],
    [nut, "destination-in"],
  ]) {
    const brush = tile.getContext("2d");
    brush.globalCompositeOperation = operation;
    brush.fill(hub);
  }
  const fissure = new Path2D();
  traceCrack(fissure);
  const art = {
    kernel: crop(0, 0, 83, 89),
    flake: crop(96, 0, 198, 157),
    wing,
    nut,
    fissure,
    halves: [shellMask(-1), shellMask(1)],
  };
  return (ctx, t) => {
    ctx.drawImage(ground, 0, 0);
    drawCorn(ctx, art, t);
    ctx.drawImage(foreground, 948, 438);
    drawMaple(ctx, art, t);
  };
}

// A click plays the drawing in place. The next scroll can take the pencil
// back mid-stroke. A system request for less motion steps through stills.
async function mountCover() {
  const track = document.querySelector(".cover-reel");
  const stage = track.querySelector(".cover");
  const opening = stage.querySelector(".cover-art");
  const sheet = stage.querySelector(".cutout-sheet");
  const button = stage.querySelector(".cover-trigger");
  const canvas = stage.querySelector("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!window.Path2D || !window.ResizeObserver || !ctx) {
    document.documentElement.classList.remove("pencil-flight");
    return;
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const captions = [...stage.querySelectorAll("[data-pop-from]")];
  const stops = [0, 0.18, 0.36, 0.51, 0.78, 1];
  let paint;
  try {
    await Promise.all([opening.decode(), sheet.decode()]);
    canvas.width = opening.naturalWidth;
    canvas.height = opening.naturalHeight;
    paint = prepareJacket(opening, sheet, (w, h) => {
      const tile = document.createElement("canvas");
      tile.width = w;
      tile.height = h;
      return tile;
    });
  } catch {
    document.documentElement.classList.remove("pencil-flight");
    return;
  }
  let start = 0,
    travel = 1,
    lastY = scrollY;
  let position = 0,
    goal = 0,
    frame = 0,
    previous = 0;
  let started = null,
    handoff = false,
    activeCaption = -1;

  function render(t) {
    position = t;
    paint(ctx, t);
    const which = captions.findLastIndex(
      (line) => t >= Number(line.dataset.popFrom),
    );
    if (which !== activeCaption) {
      if (activeCaption >= 0)
        captions[activeCaption].setAttribute("aria-hidden", "true");
      captions[which].setAttribute("aria-hidden", "false");
      activeCaption = which;
    }
  }
  function absolute() {
    return clamp((scrollY - start) / travel);
  }
  function animate(now) {
    frame = 0;
    if (reduced.matches) return;
    if (started !== null) {
      const progress = clamp((now - started) / 4300);
      render(progress);
      if (progress === 1) {
        started = null;
        goal = 1;
        previous = 0;
      } else frame = requestAnimationFrame(animate);
      return;
    }
    const distance = goal - position;
    const dt = previous ? Math.min(now - previous, 48) : 16;
    previous = now;
    if (
      Math.abs(distance) < 0.0006 ||
      scrollY > start + travel + stage.offsetHeight / 2
    ) {
      render(goal);
      previous = 0;
      return;
    }
    const step = Math.min(
      Math.abs(distance) * (1 - Math.exp(-dt / 50)),
      dt / 1450,
    );
    render(position + Math.sign(distance) * step);
    frame = requestAnimationFrame(animate);
  }
  function wake() {
    if (!frame && !reduced.matches && (started !== null || goal !== position))
      frame = requestAnimationFrame(animate);
  }
  function scrolled() {
    const delta = scrollY - lastY;
    lastY = scrollY;
    if (!delta || reduced.matches) return;
    if (started !== null) {
      started = null;
      goal = position;
      previous = 0;
    }
    if (handoff && lastY > start && lastY < start + travel)
      goal = clamp(goal + delta / travel);
    else {
      handoff = false;
      goal = absolute();
    }
    wake();
  }
  function measure() {
    const top = track.getBoundingClientRect().top + scrollY;
    start = Math.max(0, top - document.querySelector(".mast").offsetHeight);
    const distance = track.offsetHeight - stage.offsetHeight;
    travel = distance > 0 ? top + distance - start : stage.offsetHeight * 0.85;
    lastY = scrollY;
    if (!handoff && !reduced.matches) {
      goal = absolute();
      wake();
    }
  }
  function resetPreference() {
    document.documentElement.classList.toggle(
      "pencil-flight",
      !reduced.matches,
    );
    cancelAnimationFrame(frame);
    started = null;
    handoff = false;
    frame = previous = 0;
    canvas.hidden = reduced.matches;
    measure();
    goal = reduced.matches ? 0 : absolute();
    render(goal);
  }
  function play() {
    if (reduced.matches) {
      const next = stops.find((t) => t > position + 0.001) ?? 0;
      canvas.hidden = false;
      render(next);
      return;
    }
    cancelAnimationFrame(frame);
    frame = previous = 0;
    handoff = true;
    lastY = scrollY;
    started = performance.now();
    goal = 0;
    render(0);
    wake();
  }
  resetPreference();
  document.documentElement.classList.add("pencil-ready");
  button.hidden = false;
  button.addEventListener("click", play);
  new ResizeObserver(measure).observe(track);
  reduced.addEventListener("change", resetPreference);
  window.addEventListener("scroll", scrolled, { passive: true });
  window.addEventListener("pageshow", measure);
}

if (typeof document !== "undefined") mountCover();
